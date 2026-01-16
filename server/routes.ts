import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertHoldingSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { parseCSV } from "./csv-parser";
import { fetchCurrentQuote, fetchHistoricalData, searchStocks } from "./market-data";
import { estimateUpcomingDividends, getCompanyName } from "./dividend-data";
import { fetchFinancialData } from "./financial-data";
import {
  createLinkToken,
  exchangePublicToken,
  getAccounts,
  getHoldings as getPlaidHoldings,
  getItem,
  getInstitution,
} from "./plaid";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Configure multer for file uploads (memory storage)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (_req, file, cb) => {
      // Accept CSV files
      if (file.mimetype === "text/csv" || file.mimetype === "application/vnd.ms-excel" || file.originalname.toLowerCase().endsWith(".csv")) {
        cb(null, true);
      } else {
        cb(new Error("Only CSV files are allowed"));
      }
    },
  });

  const fetchWithTimeout = async (url: string, timeoutMs = 5000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const extractDomainFromName = (name: string) => {
    const cleanName = name
      .replace(/Inc\.?|Corp\.?|Corporation|Company|Co\.?|Ltd\.?|Limited/gi, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "");
    return `${cleanName}.com`;
  };

  const getLogoUrls = (ticker: string, name?: string) => {
    const domainMap: Record<string, string> = {
      AAPL: "apple.com",
      MSFT: "microsoft.com",
      GOOGL: "google.com",
      GOOG: "google.com",
      AMZN: "amazon.com",
      TSLA: "tesla.com",
      META: "meta.com",
      NVDA: "nvidia.com",
      JPM: "jpmorgan.com",
      JNJ: "jnj.com",
      V: "visa.com",
      MA: "mastercard.com",
      DIS: "disney.com",
      NFLX: "netflix.com",
    };

    const domain = domainMap[ticker] || (name ? extractDomainFromName(name) : null);

    return [
      domain ? `https://logo.clearbit.com/${domain}` : null,
      `https://assets.alphaquery.com/stock/${ticker}/logo`,
      `https://financialmodelingprep.com/image-stock/${ticker}.png`,
    ].filter(Boolean) as string[];
  };

  app.get("/api/logo", async (req, res) => {
    const tickerParam = req.query.ticker;
    const nameParam = req.query.name;

    if (!tickerParam || typeof tickerParam !== "string") {
      return res.status(400).json({ error: "ticker query param is required" });
    }

    const ticker = tickerParam.toUpperCase();
    const name = typeof nameParam === "string" ? nameParam : undefined;
    const urls = getLogoUrls(ticker, name);

    for (const url of urls) {
      try {
        const response = await fetchWithTimeout(url, 5000);
        if (!response.ok) {
          continue;
        }

        const contentType = response.headers.get("content-type") || "image/png";
        const buffer = Buffer.from(await response.arrayBuffer());

        res.set({
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
        });
        return res.status(200).send(buffer);
      } catch {
        continue;
      }
    }

    return res.status(404).json({ error: "Logo not found" });
  });
  
  app.get("/api/holdings", async (_req, res) => {
    try {
      const holdings = await storage.getHoldings();
      res.json(holdings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch holdings" });
    }
  });

  app.get("/api/holdings/:id", async (req, res) => {
    try {
      const holding = await storage.getHolding(req.params.id);
      if (!holding) {
        return res.status(404).json({ error: "Holding not found" });
      }
      res.json(holding);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch holding" });
    }
  });

  app.post("/api/holdings", async (req, res) => {
    try {
      const validatedData = insertHoldingSchema.parse(req.body);
      const holding = await storage.createHolding(validatedData);
      res.status(201).json(holding);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create holding" });
    }
  });

  app.patch("/api/holdings/:id", async (req, res) => {
    try {
      const partialSchema = insertHoldingSchema.partial();
      const validatedData = partialSchema.parse(req.body);
      const holding = await storage.updateHolding(req.params.id, validatedData);
      if (!holding) {
        return res.status(404).json({ error: "Holding not found" });
      }
      res.json(holding);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update holding" });
    }
  });

  app.delete("/api/holdings/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteHolding(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Holding not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete holding" });
    }
  });

  // CSV Upload endpoint
  app.post("/api/holdings/upload-csv", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Convert buffer to string
      const csvContent = req.file.buffer.toString("utf-8");
      
      // Parse CSV
      const parseResult = parseCSV(csvContent);

      if (parseResult.errors.length > 0 && parseResult.holdings.length === 0) {
        return res.status(400).json({ 
          error: "Failed to parse CSV", 
          errors: parseResult.errors 
        });
      }

      if (parseResult.holdings.length === 0) {
        return res.status(400).json({ error: "No valid holdings found in CSV" });
      }

      // Get existing holdings to check for duplicates
      const existingHoldings = await storage.getHoldings();
      const tickerMap = new Map<string, typeof existingHoldings[0]>();
      existingHoldings.forEach((h) => {
        // Check by ticker (normalize to uppercase)
        const ticker = h.ticker.toUpperCase();
        if (!tickerMap.has(ticker)) {
          tickerMap.set(ticker, h);
        }
      });

      const results = {
        created: 0,
        updated: 0,
        errors: [] as Array<{ ticker: string; message: string }>,
      };

      // Process each holding from CSV
      for (const csvHolding of parseResult.holdings) {
        try {
          const ticker = csvHolding.ticker.toUpperCase();
          const existing = tickerMap.get(ticker);

          // Fetch market data for missing fields
          let companyName = csvHolding.name || "Unknown";
          let sector = csvHolding.sector || "Unknown";
          let industry = csvHolding.industry || "Unknown";
          let currentPrice = 0;
          let growthRate30d = 0;

          try {
            const quote = await fetchCurrentQuote(ticker);
            if (quote) {
              currentPrice = quote.price;
              if (!companyName || companyName === "Unknown") {
                companyName = quote.name;
              }
            }
          } catch (marketError) {
            console.warn(`Could not fetch market data for ${ticker}:`, marketError);
          }

          // If we still don't have sector/industry, try to get from market data
          // (We'll use "Unknown" for now as market-data.ts doesn't expose sector/industry)
          // In production, you might want to add a function to fetch sector/industry

          if (currentPrice === 0) {
            // Fallback: use cost basis as current price if no market data
            currentPrice = csvHolding.costBasis;
          }

          const currentValue = csvHolding.quantity * currentPrice;
          
          // Calculate growth rate (simplified - use cost basis vs current price)
          if (csvHolding.costBasis > 0) {
            growthRate30d = ((currentPrice - csvHolding.costBasis) / csvHolding.costBasis) * 100;
          }

          if (existing) {
            // Merge holdings: combine quantities and average cost basis
            const combinedQuantity = existing.quantity + csvHolding.quantity;
            const totalCost = existing.quantity * existing.costBasis + csvHolding.quantity * csvHolding.costBasis;
            const averageCostBasis = combinedQuantity > 0 ? totalCost / combinedQuantity : 0;
            const newCurrentValue = combinedQuantity * currentPrice;

            const updatedHolding: typeof insertHoldingSchema._type = {
              ticker: existing.ticker, // Keep original ticker format
              name: existing.name, // Keep original name
              quantity: combinedQuantity,
              costBasis: averageCostBasis,
              currentPrice: currentPrice,
              currentValue: newCurrentValue,
              growthRate30d: growthRate30d,
              sector: existing.sector !== "Unknown" ? existing.sector : sector,
              industry: existing.industry !== "Unknown" ? existing.industry : industry,
            };

            const validatedHolding = insertHoldingSchema.parse(updatedHolding);
            await storage.updateHolding(existing.id, validatedHolding);
            results.updated++;
          } else {
            // Create new holding
            const newHolding: typeof insertHoldingSchema._type = {
              ticker: ticker,
              name: companyName,
              quantity: csvHolding.quantity,
              costBasis: csvHolding.costBasis,
              currentPrice: currentPrice,
              currentValue: currentValue,
              growthRate30d: growthRate30d,
              sector: sector,
              industry: industry,
            };

            const validatedHolding = insertHoldingSchema.parse(newHolding);
            await storage.createHolding(validatedHolding);
            results.created++;
          }
        } catch (holdingError: any) {
          results.errors.push({
            ticker: csvHolding.ticker,
            message: holdingError.message || "Failed to process holding",
          });
        }
      }

      // Include parse errors if any
      if (parseResult.errors.length > 0) {
        parseResult.errors.forEach((err) => {
          results.errors.push({
            ticker: "N/A",
            message: err.message,
          });
        });
      }

      res.json({
        success: true,
        summary: {
          created: results.created,
          updated: results.updated,
          totalProcessed: results.created + results.updated,
          errors: results.errors.length,
        },
        errors: results.errors.length > 0 ? results.errors : undefined,
      });
    } catch (error: any) {
      console.error("Error uploading CSV:", error);
      res.status(500).json({ 
        error: error.message || "Failed to process CSV file" 
      });
    }
  });

  // Holdings performance endpoint
  app.get("/api/holdings/performance", async (req, res) => {
    try {
      const timeframe = (req.query.timeframe as string) || "1M";
      
      // Get all holdings
      const holdings = await storage.getHoldings();

      if (holdings.length === 0) {
        return res.json([]);
      }

      interface HoldingPerformance {
        ticker: string;
        name: string;
        quantity: number;
        startPrice: number;
        currentPrice: number;
        currentValue: number;
        percentChange: number;
        valueChange: number;
      }

      const performanceData: HoldingPerformance[] = [];

      // Calculate timeframe start date
      const now = new Date();
      let startDate: Date;
      switch (timeframe) {
        case "1D":
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 1);
          break;
        case "5D":
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 5);
          break;
        case "1M":
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case "3M":
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case "6M":
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case "YTD":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case "1Y":
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        case "5Y":
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 5);
          break;
        case "MAX":
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 5);
          break;
        default:
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 1);
      }

      const period1 = Math.floor(startDate.getTime() / 1000);
      const period2 = Math.floor(now.getTime() / 1000);

      // Process each holding
      for (const holding of holdings) {
        try {
          const currentPrice = holding.currentPrice;
          const currentValue = holding.currentValue;
          let startPrice = currentPrice; // Fallback to current price

          // Fetch historical data to get start price
          try {
            const historicalData = await fetchHistoricalData(holding.ticker, timeframe);

            if (historicalData && historicalData.length > 0) {
              // Get the first (oldest) price point as start price
              // Historical data from fetchHistoricalData is already sorted by date
              const firstDataPoint = historicalData[0];
              // Note: fetchHistoricalData returns indexed prices (starting at 0), so we need to calculate actual price
              // For simplicity, use cost basis or current price as fallback
              // In a real scenario, you'd want to store the actual first price before indexing
              startPrice = holding.costBasis || currentPrice;
            } else {
              // If no historical data, fall back to cost basis
              startPrice = holding.costBasis || currentPrice;
            }
          } catch (historicalError) {
            console.warn(`Could not fetch historical data for ${holding.ticker}:`, historicalError);
            // Fall back to cost basis or current price
            startPrice = holding.costBasis || currentPrice;
          }

          // Calculate changes
          const percentChange = startPrice > 0 
            ? ((currentPrice - startPrice) / startPrice) * 100 
            : 0;
          const valueChange = (currentPrice - startPrice) * holding.quantity;

          performanceData.push({
            ticker: holding.ticker,
            name: holding.name,
            quantity: holding.quantity,
            startPrice,
            currentPrice,
            currentValue,
            percentChange,
            valueChange,
          });
        } catch (holdingError: any) {
          console.warn(`Error processing performance for ${holding.ticker}:`, holdingError.message);
          // Skip this holding and continue
        }
      }

      res.json(performanceData);
    } catch (error: any) {
      console.error("Error fetching holdings performance:", error);
      res.status(500).json({ 
        error: error.message || "Failed to fetch holdings performance" 
      });
    }
  });

  // Dividend schedule endpoint
  app.get("/api/dividends/schedule", async (_req, res) => {
    try {
      const currentYear = new Date().getFullYear();
      const now = new Date();
      const endOfYear = new Date(currentYear, 11, 31); // December 31

      // Get all holdings
      const holdings = await storage.getHoldings();

      if (holdings.length === 0) {
        return res.json({
          schedule: [],
          totalEstimated: 0,
          year: currentYear,
        });
      }

      const allSchedules: typeof import("./dividend-data").DividendSchedule[] = [];

      // Process each holding to get dividend schedule
      for (const holding of holdings) {
        try {
          // Get company name if not already set
          let companyName = holding.name;
          if (!companyName || companyName === "Unknown") {
            companyName = await getCompanyName(holding.ticker);
          }

          // Estimate upcoming dividends for this holding
          const schedules = await estimateUpcomingDividends(
            holding.ticker,
            holding.quantity,
            holding.currentPrice,
            currentYear
          );

          // Update company names in schedules
          schedules.forEach((schedule) => {
            schedule.name = companyName;
          });

          allSchedules.push(...schedules);
        } catch (error: any) {
          console.warn(`Error processing dividends for ${holding.ticker}:`, error.message);
          // Continue with other holdings even if one fails
        }
      }

      // Sort by payment date
      allSchedules.sort((a, b) => {
        return new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime();
      });

      // Calculate total estimated dividends for the year
      const totalEstimated = allSchedules.reduce((sum, schedule) => {
        return sum + schedule.totalAmount;
      }, 0);

      res.json({
        schedule: allSchedules,
        totalEstimated,
        year: currentYear,
      });
    } catch (error: any) {
      console.error("Error fetching dividend schedule:", error);
      res.status(500).json({ 
        error: error.message || "Failed to fetch dividend schedule" 
      });
    }
  });

  app.get("/api/portfolio/metrics", async (_req, res) => {
    try {
      const metrics = await storage.getPortfolioMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio metrics" });
    }
  });

  app.get("/api/benchmark", async (req, res) => {
    try {
      const timeframe = (req.query.timeframe as string) || "1M";
      const benchmark = await storage.getBenchmarkData(timeframe);
      res.json(benchmark);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch benchmark data" });
    }
  });

  app.get("/api/benchmark/chart", async (req, res) => {
    try {
      const timeframe = (req.query.timeframe as string) || "1M";
      const chartData = await storage.getBenchmarkChartData(timeframe);
      res.json(chartData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch benchmark chart data" });
    }
  });

  app.get("/api/industry-analysis", async (_req, res) => {
    try {
      const analysis = await storage.getIndustryAnalysis();
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch industry analysis" });
    }
  });

  app.get("/api/sector-analysis", async (_req, res) => {
    try {
      const analysis = await storage.getSectorAnalysis();
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sector analysis" });
    }
  });

  app.get("/api/fear-greed", async (_req, res) => {
    try {
      const { getFearGreedIndex } = await import("./fear-greed");
      const data = await getFearGreedIndex();
      if (!data) {
        return res.status(503).json({ error: "Fear & Greed Index data not available" });
      }
      res.json(data);
    } catch (error) {
      console.error("Error fetching Fear & Greed Index:", error);
      res.status(500).json({ error: "Failed to fetch Fear & Greed Index" });
    }
  });

  app.get("/api/vix", async (req, res) => {
    try {
      const timeframe = (req.query.timeframe as string) || "1Y";
      const vixData = await storage.getVIXData(timeframe);
      if (!vixData) {
        return res.status(503).json({ error: "VIX data not available" });
      }
      res.json(vixData);
    } catch (error) {
      console.error("Error fetching VIX data:", error);
      res.status(500).json({ error: "Failed to fetch VIX data" });
    }
  });

  app.get("/api/bubble-watch", async (_req, res) => {
    try {
      const warnings = await storage.getBubbleWarnings();
      res.json(warnings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bubble watch data" });
    }
  });

  app.get("/api/news", async (req, res) => {
    try {
      const articles = await storage.getNewsArticles();
      res.json(articles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news articles" });
    }
  });

  app.get("/api/research/stock", async (req, res) => {
    try {
      const query = req.query.query as string;
      const timeframe = (req.query.timeframe as string) || "1M";

      if (!query) {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      const stockData = await storage.getStockData(query, timeframe);
      if (!stockData) {
        return res.status(404).json({ error: "Stock not found" });
      }

      res.json(stockData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stock data" });
    }
  });

  app.get("/api/research/indices", async (req, res) => {
    try {
      const timeframe = (req.query.timeframe as string) || "1M";
      const indicesParam = req.query.indices as string;

      if (!indicesParam) {
        return res.json([]);
      }

      const indices = indicesParam.split(",").filter(Boolean);
      const indexData = await storage.getIndexData(indices, timeframe);
      res.json(indexData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch index data" });
    }
  });

  app.get("/api/research/search", async (req, res) => {
    try {
      const query = req.query.query as string;

      if (!query || query.trim().length === 0) {
        return res.json([]);
      }

      const results = await searchStocks(query.trim());
      res.json(results);
    } catch (error) {
      console.error("Error searching stocks:", error);
      res.status(500).json({ error: "Failed to search stocks" });
    }
  });

  app.get("/api/research/financials", async (req, res) => {
    try {
      const symbol = req.query.symbol as string;

      if (!symbol) {
        return res.status(400).json({ error: "Symbol parameter is required" });
      }

      const financialData = await fetchFinancialData(symbol.toUpperCase());

      if (!financialData) {
        return res.status(404).json({ error: "Financial data not found for symbol" });
      }

      res.json(financialData);
    } catch (error: any) {
      console.error("Error fetching financial data:", error);
      res.status(500).json({ error: error.message || "Failed to fetch financial data" });
    }
  });

  // Plaid API endpoints
  // For now, we'll use a default userId since we don't have auth yet
  // In production, this would come from the session
  const getCurrentUserId = () => "default-user-id";

  app.post("/api/plaid/link-token", async (req, res) => {
    try {
      const userId = getCurrentUserId();
      const linkToken = await createLinkToken(userId);

      if (!linkToken) {
        return res.status(503).json({ 
          error: "Plaid is not configured. Please add PLAID_CLIENT_ID and PLAID_SECRET to your environment variables." 
        });
      }

      res.json({ linkToken });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create link token" });
    }
  });

  app.post("/api/plaid/exchange-token", async (req, res) => {
    try {
      const { publicToken } = req.body;

      if (!publicToken || typeof publicToken !== "string") {
        return res.status(400).json({ error: "publicToken is required" });
      }

      const { accessToken, itemId } = await exchangePublicToken(publicToken);
      const item = await getItem(accessToken);
      
      // Get institution info
      let institutionName = "Unknown Institution";
      try {
        const institution = await getInstitution(item.institutionId);
        institutionName = institution.name;
      } catch (error) {
        console.error("Failed to fetch institution:", error);
      }

      // Get accounts
      const accounts = await getAccounts(accessToken);
      const userId = getCurrentUserId();

      // Store each account
      const createdAccounts = [];
      for (const account of accounts) {
        const plaidAccount = await storage.createPlaidAccount({
          userId,
          accessToken, // In production, encrypt this
          itemId,
          institutionId: item.institutionId,
          institutionName,
          accountId: account.accountId,
          accountName: account.name,
          accountType: account.type,
          accountSubtype: account.subtype,
          lastSyncedAt: new Date().toISOString(),
        });
        createdAccounts.push(plaidAccount);
      }

      res.json({ accounts: createdAccounts });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to exchange token" });
    }
  });

  app.get("/api/plaid/accounts", async (req, res) => {
    try {
      const userId = getCurrentUserId();
      const accounts = await storage.getPlaidAccounts(userId);
      res.json(accounts);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch accounts" });
    }
  });

  app.post("/api/plaid/sync/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const account = await storage.getPlaidAccount(accountId);

      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      // Fetch holdings from Plaid
      const plaidHoldings = await getPlaidHoldings(account.accessToken);

      // Map Plaid holdings to our Holding schema
      const holdings: Array<{
        id: string;
        ticker: string;
        name: string;
        quantity: number;
        costBasis: number;
        currentPrice: number;
        currentValue: number;
        growthRate30d: number;
        sector: string;
        industry: string;
      }> = [];

      for (const plaidHolding of plaidHoldings) {
        if (plaidHolding.accountId !== account.accountId) continue;

        const ticker = plaidHolding.ticker || "UNKNOWN";
        const holdingId = `${account.id}-${plaidHolding.securityId}`;

        // Check if holding already exists
        const existingHolding = Array.from(storage["holdings"].values()).find(
          (h) => h.id === holdingId
        );

        // For now, we'll need to fetch current price and calculate growth
        // This should ideally use our market data utility
        const currentPrice = plaidHolding.price;
        const currentValue = plaidHolding.value;
        const quantity = plaidHolding.quantity;
        const costBasis = plaidHolding.costBasis || currentValue * 0.9; // Fallback

        // Calculate growth (simplified - ideally use historical data)
        const growthRate30d = costBasis > 0 
          ? ((currentValue - costBasis) / costBasis) * 100 
          : 0;

        const holding = {
          id: holdingId,
          ticker,
          name: plaidHolding.name,
          quantity,
          costBasis,
          currentPrice,
          currentValue,
          growthRate30d,
          sector: plaidHolding.sector || "Unknown",
          industry: plaidHolding.industry || "Unknown",
        };

        if (existingHolding) {
          await storage.updateHolding(holdingId, holding);
        } else {
          await storage.createHolding(holding);
        }

        holdings.push(holding);
      }

      // Update account last synced time
      await storage.updatePlaidAccount(accountId, {
        lastSyncedAt: new Date().toISOString(),
      });

      res.json({ holdings, synced: holdings.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to sync account" });
    }
  });

  app.post("/api/plaid/sync-all", async (req, res) => {
    try {
      const userId = getCurrentUserId();
      const accounts = await storage.getPlaidAccounts(userId);
      const results = [];

      for (const account of accounts) {
        try {
          const plaidHoldings = await getPlaidHoldings(account.accessToken);
          const holdings = [];

          for (const plaidHolding of plaidHoldings) {
            if (plaidHolding.accountId !== account.accountId) continue;

            const ticker = plaidHolding.ticker || "UNKNOWN";
            const holdingId = `${account.id}-${plaidHolding.securityId}`;

            const currentPrice = plaidHolding.price;
            const currentValue = plaidHolding.value;
            const quantity = plaidHolding.quantity;
            const costBasis = plaidHolding.costBasis || currentValue * 0.9;
            const growthRate30d = costBasis > 0 
              ? ((currentValue - costBasis) / costBasis) * 100 
              : 0;

            const holding = {
              id: holdingId,
              ticker,
              name: plaidHolding.name,
              quantity,
              costBasis,
              currentPrice,
              currentValue,
              growthRate30d,
              sector: plaidHolding.sector || "Unknown",
              industry: plaidHolding.industry || "Unknown",
            };

            const existingHolding = Array.from(storage["holdings"].values()).find(
              (h) => h.id === holdingId
            );

            if (existingHolding) {
              await storage.updateHolding(holdingId, holding);
            } else {
              await storage.createHolding(holding);
            }

            holdings.push(holding);
          }

          await storage.updatePlaidAccount(account.id, {
            lastSyncedAt: new Date().toISOString(),
          });

          results.push({ accountId: account.id, holdings: holdings.length, success: true });
        } catch (error: any) {
          results.push({ 
            accountId: account.id, 
            error: error.message || "Failed to sync", 
            success: false 
          });
        }
      }

      res.json({ results });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to sync accounts" });
    }
  });

  app.delete("/api/plaid/accounts/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const deleted = await storage.deletePlaidAccount(accountId);

      if (!deleted) {
        return res.status(404).json({ error: "Account not found" });
      }

      // Also delete holdings associated with this account
      const allHoldings = await storage.getHoldings();
      for (const holding of allHoldings) {
        if (holding.id.startsWith(`${accountId}-`)) {
          await storage.deleteHolding(holding.id);
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete account" });
    }
  });

  return httpServer;
}
