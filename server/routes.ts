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
import { calculatePortfolioRiskMetrics } from "./risk-calculations";
import { analyzePortfolioFees } from "./fee-analyzer";
import { runMonteCarloSimulation } from "./monte-carlo";
import { analyzeTaxLossHarvesting, calculateRothConversion } from "./tax-planning";
import { projectCashFlow, getCashFlowDefaults } from "./cash-flow";
import { getExchangeRates, convertCurrency, currencyDetails } from "./currency";
import * as entities from "./entities";
import * as estate from "./estate";
import * as household from "./household";
import { processQuery, getConversation, getUserConversations, deleteConversation } from "./ai-assistant";
import { 
  monteCarloInputSchema, 
  rothConversionInputSchema, 
  cashFlowInputSchema,
  insertLegalEntitySchema,
  insertBeneficiarySchema,
  insertVaultDocumentSchema,
  aiQuerySchema,
} from "@shared/schema";

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

  app.get("/api/analysis/:type", async (req, res) => {
    try {
      const type = req.params.type as "sector" | "account" | "currency" | "region" | "assetType";
      
      if (!["sector", "account", "currency", "region", "assetType"].includes(type)) {
        return res.status(400).json({ error: "Invalid breakdown type. Must be one of: sector, account, currency, region, assetType" });
      }

      const analysis = await storage.getBreakdownAnalysis(type);
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching breakdown analysis:", error);
      res.status(500).json({ error: "Failed to fetch breakdown analysis" });
    }
  });

  app.get("/api/analysis/category-performance", async (req, res) => {
    try {
      const type = req.query.type as "sector" | "account" | "currency" | "region" | "assetType";
      const categoriesParam = req.query.categories as string;
      const timeframe = (req.query.timeframe as string) || "1M";
      const returnType = (req.query.returnType as "TWR" | "MWR") || "TWR";
      
      if (!type || !categoriesParam) {
        return res.status(400).json({ error: "type and categories parameters are required" });
      }

      if (!["sector", "account", "currency", "region", "assetType"].includes(type)) {
        return res.status(400).json({ error: "Invalid breakdown type. Must be one of: sector, account, currency, region, assetType" });
      }

      const categories = Array.isArray(categoriesParam) 
        ? categoriesParam 
        : categoriesParam.split(",").map(c => c.trim());

      const performance = await storage.getCategoryPerformance(type, categories, timeframe, returnType);
      res.json(performance);
    } catch (error) {
      console.error("Error fetching category performance:", error);
      res.status(500).json({ error: "Failed to fetch category performance" });
    }
  });

  app.get("/api/analysis/historical-distribution", async (req, res) => {
    try {
      const type = req.query.type as "sector" | "account" | "currency" | "region" | "assetType";
      const timeframe = (req.query.timeframe as string) || "1M";
      
      if (!type) {
        return res.status(400).json({ error: "type parameter is required" });
      }

      if (!["sector", "account", "currency", "region", "assetType"].includes(type)) {
        return res.status(400).json({ error: "Invalid breakdown type. Must be one of: sector, account, currency, region, assetType" });
      }

      const distribution = await storage.getHistoricalDistribution(type, timeframe);
      res.json(distribution);
    } catch (error) {
      console.error("Error fetching category performance:", error);
      res.status(500).json({ error: "Failed to fetch category performance" });
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
        account?: string;
        currency?: string;
        market?: string;
        assetType?: string;
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
          account: account.accountName || account.institutionName || "Unknown",
          currency: "USD", // Default to USD, can be enhanced based on account
          market: undefined, // Can be derived from ticker if needed
          assetType: "Equity", // Default to Equity, can be enhanced based on security type
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
              account: account.accountName || account.institutionName || "Unknown",
              currency: "USD", // Default to USD, can be enhanced based on account
              market: undefined, // Can be derived from ticker if needed
              assetType: "Equity", // Default to Equity, can be enhanced based on security type
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

  // ============================================
  // REAL ESTATE ENDPOINTS
  // ============================================

  app.get("/api/real-estate", async (_req, res) => {
    try {
      const properties = await storage.getRealEstateProperties();
      res.json(properties);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch real estate properties" });
    }
  });

  app.get("/api/real-estate/:id", async (req, res) => {
    try {
      const property = await storage.getRealEstateProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch property" });
    }
  });

  app.post("/api/real-estate", async (req, res) => {
    try {
      const property = await storage.createRealEstateProperty(req.body);
      res.status(201).json(property);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create property" });
    }
  });

  app.patch("/api/real-estate/:id", async (req, res) => {
    try {
      const property = await storage.updateRealEstateProperty(req.params.id, req.body);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update property" });
    }
  });

  app.delete("/api/real-estate/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteRealEstateProperty(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete property" });
    }
  });

  // ============================================
  // CRYPTO ASSET ENDPOINTS
  // ============================================

  app.get("/api/crypto", async (_req, res) => {
    try {
      const { updateCryptoAssetPrices } = await import("./coingecko");
      let assets = await storage.getCryptoAssets();
      
      // Update prices from CoinGecko
      assets = await updateCryptoAssetPrices(assets);
      
      // Update stored values with new prices
      for (const asset of assets) {
        await storage.updateCryptoAsset(asset.id, {
          currentPrice: asset.currentPrice,
          currentValue: asset.currentValue,
        });
      }
      
      res.json(assets);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch crypto assets" });
    }
  });

  app.get("/api/crypto/:id", async (req, res) => {
    try {
      const asset = await storage.getCryptoAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ error: "Crypto asset not found" });
      }
      res.json(asset);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch crypto asset" });
    }
  });

  app.post("/api/crypto", async (req, res) => {
    try {
      const { getPriceBySymbol } = await import("./coingecko");
      
      // Try to fetch current price from CoinGecko
      const priceData = await getPriceBySymbol(req.body.symbol);
      let assetData = { ...req.body };
      
      if (priceData) {
        assetData.currentPrice = priceData.price;
        assetData.currentValue = req.body.quantity * priceData.price;
      }
      
      const asset = await storage.createCryptoAsset(assetData);
      res.status(201).json(asset);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create crypto asset" });
    }
  });

  app.patch("/api/crypto/:id", async (req, res) => {
    try {
      const asset = await storage.updateCryptoAsset(req.params.id, req.body);
      if (!asset) {
        return res.status(404).json({ error: "Crypto asset not found" });
      }
      res.json(asset);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update crypto asset" });
    }
  });

  app.delete("/api/crypto/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCryptoAsset(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Crypto asset not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete crypto asset" });
    }
  });

  // Crypto search endpoint
  app.get("/api/crypto/search", async (req, res) => {
    try {
      const query = req.query.query as string;
      if (!query || query.length < 2) {
        return res.json([]);
      }
      
      const { searchCoins } = await import("./coingecko");
      const results = await searchCoins(query);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to search cryptocurrencies" });
    }
  });

  // Crypto market data endpoint
  app.get("/api/crypto/market", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const { getMarketData } = await import("./coingecko");
      const data = await getMarketData(limit);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch crypto market data" });
    }
  });

  // ============================================
  // COLLECTIBLE ENDPOINTS
  // ============================================

  app.get("/api/collectibles", async (_req, res) => {
    try {
      const collectibles = await storage.getCollectibles();
      res.json(collectibles);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch collectibles" });
    }
  });

  app.get("/api/collectibles/:id", async (req, res) => {
    try {
      const collectible = await storage.getCollectible(req.params.id);
      if (!collectible) {
        return res.status(404).json({ error: "Collectible not found" });
      }
      res.json(collectible);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch collectible" });
    }
  });

  app.post("/api/collectibles", async (req, res) => {
    try {
      const collectible = await storage.createCollectible(req.body);
      res.status(201).json(collectible);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create collectible" });
    }
  });

  app.patch("/api/collectibles/:id", async (req, res) => {
    try {
      const collectible = await storage.updateCollectible(req.params.id, req.body);
      if (!collectible) {
        return res.status(404).json({ error: "Collectible not found" });
      }
      res.json(collectible);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update collectible" });
    }
  });

  app.delete("/api/collectibles/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCollectible(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Collectible not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete collectible" });
    }
  });

  // ============================================
  // ALTERNATIVE INVESTMENT ENDPOINTS
  // ============================================

  app.get("/api/alternative-investments", async (_req, res) => {
    try {
      const investments = await storage.getAlternativeInvestments();
      res.json(investments);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch alternative investments" });
    }
  });

  app.get("/api/alternative-investments/:id", async (req, res) => {
    try {
      const investment = await storage.getAlternativeInvestment(req.params.id);
      if (!investment) {
        return res.status(404).json({ error: "Investment not found" });
      }
      res.json(investment);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch investment" });
    }
  });

  app.post("/api/alternative-investments", async (req, res) => {
    try {
      const investment = await storage.createAlternativeInvestment(req.body);
      res.status(201).json(investment);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create investment" });
    }
  });

  app.patch("/api/alternative-investments/:id", async (req, res) => {
    try {
      const investment = await storage.updateAlternativeInvestment(req.params.id, req.body);
      if (!investment) {
        return res.status(404).json({ error: "Investment not found" });
      }
      res.json(investment);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update investment" });
    }
  });

  app.delete("/api/alternative-investments/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAlternativeInvestment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Investment not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete investment" });
    }
  });

  // ============================================
  // NET WORTH SUMMARY ENDPOINT
  // ============================================

  app.get("/api/net-worth", async (_req, res) => {
    try {
      const summary = await storage.getNetWorthSummary();
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch net worth summary" });
    }
  });

  // ============================================
  // PORTFOLIO RISK METRICS ENDPOINTS
  // ============================================

  app.get("/api/portfolio/risk-metrics", async (req, res) => {
    try {
      const timeframe = (req.query.timeframe as "1Y" | "3Y" | "5Y") || "1Y";
      
      // Validate timeframe
      if (!["1Y", "3Y", "5Y"].includes(timeframe)) {
        return res.status(400).json({ error: "Invalid timeframe. Must be 1Y, 3Y, or 5Y" });
      }
      
      // Get holdings
      const holdings = await storage.getHoldings();
      
      if (holdings.length === 0) {
        return res.status(404).json({ error: "No holdings found to analyze" });
      }
      
      // Calculate risk metrics
      const metrics = await calculatePortfolioRiskMetrics(holdings, timeframe);
      res.json(metrics);
    } catch (error: any) {
      console.error("Error calculating risk metrics:", error);
      res.status(500).json({ error: error.message || "Failed to calculate risk metrics" });
    }
  });

  // ============================================
  // FEE ANALYZER ENDPOINTS
  // ============================================

  app.get("/api/portfolio/fee-analysis", async (_req, res) => {
    try {
      // Get holdings
      const holdings = await storage.getHoldings();
      
      if (holdings.length === 0) {
        return res.status(404).json({ error: "No holdings found to analyze" });
      }
      
      // Analyze fees
      const analysis = await analyzePortfolioFees(holdings);
      res.json(analysis);
    } catch (error: any) {
      console.error("Error analyzing portfolio fees:", error);
      res.status(500).json({ error: error.message || "Failed to analyze portfolio fees" });
    }
  });

  // ============================================
  // PLANNING / MONTE CARLO ENDPOINTS
  // ============================================

  // Get default planning values from current portfolio
  app.get("/api/planning/defaults", async (_req, res) => {
    try {
      // Get net worth summary
      const netWorth = await storage.getNetWorthSummary();
      
      // Try to get volatility from risk metrics if available
      let estimatedVolatility: number | null = null;
      try {
        const holdings = await storage.getHoldings();
        if (holdings.length > 0) {
          const riskMetrics = await calculatePortfolioRiskMetrics(holdings, "1Y");
          estimatedVolatility = riskMetrics.volatility / 100; // Convert from % to decimal
        }
      } catch (error) {
        console.log("Could not calculate volatility, using default");
      }
      
      // Suggest target based on 25x rule (assuming 4% withdrawal rate)
      // Use 4% of current value as estimated annual expenses
      const estimatedAnnualExpenses = netWorth.totalNetWorth * 0.04;
      const suggestedTargetAmount = estimatedAnnualExpenses * 25;
      
      res.json({
        currentPortfolioValue: netWorth.totalNetWorth,
        estimatedVolatility,
        suggestedTargetAmount: Math.round(suggestedTargetAmount),
      });
    } catch (error: any) {
      console.error("Error getting planning defaults:", error);
      res.status(500).json({ error: error.message || "Failed to get planning defaults" });
    }
  });

  // Run Monte Carlo simulation
  app.post("/api/planning/monte-carlo", async (req, res) => {
    try {
      // Validate input
      const parseResult = monteCarloInputSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid simulation parameters",
          details: parseResult.error.errors
        });
      }
      
      const input = parseResult.data;
      
      // Run simulation
      const result = runMonteCarloSimulation(input);
      
      res.json(result);
    } catch (error: any) {
      console.error("Error running Monte Carlo simulation:", error);
      res.status(500).json({ error: error.message || "Failed to run simulation" });
    }
  });

  // ============================================
  // TAX PLANNING ENDPOINTS
  // ============================================

  // Get tax-loss harvesting opportunities
  app.get("/api/tax/loss-harvesting", async (req, res) => {
    try {
      const holdings = await storage.getHoldings();
      
      if (holdings.length === 0) {
        return res.status(404).json({ error: "No holdings found to analyze" });
      }
      
      // Optional tax rate parameters
      const shortTermRate = req.query.shortTermRate 
        ? parseFloat(req.query.shortTermRate as string) / 100 
        : undefined;
      const longTermRate = req.query.longTermRate 
        ? parseFloat(req.query.longTermRate as string) / 100 
        : undefined;
      
      const analysis = analyzeTaxLossHarvesting(holdings, shortTermRate, longTermRate);
      res.json(analysis);
    } catch (error: any) {
      console.error("Error analyzing tax-loss harvesting:", error);
      res.status(500).json({ error: error.message || "Failed to analyze tax opportunities" });
    }
  });

  // Calculate Roth conversion analysis
  app.post("/api/tax/roth-conversion", async (req, res) => {
    try {
      const parseResult = rothConversionInputSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid Roth conversion parameters",
          details: parseResult.error.errors,
        });
      }
      
      const result = calculateRothConversion(parseResult.data);
      res.json(result);
    } catch (error: any) {
      console.error("Error calculating Roth conversion:", error);
      res.status(500).json({ error: error.message || "Failed to calculate Roth conversion" });
    }
  });

  // ============================================
  // CASH FLOW FORECASTING ENDPOINTS
  // ============================================

  // Get cash flow defaults
  app.get("/api/cashflow/defaults", async (_req, res) => {
    try {
      const netWorth = await storage.getNetWorthSummary();
      const defaults = getCashFlowDefaults(netWorth.totalNetWorth);
      res.json(defaults);
    } catch (error: any) {
      console.error("Error getting cash flow defaults:", error);
      res.status(500).json({ error: error.message || "Failed to get defaults" });
    }
  });

  // Project cash flow
  app.post("/api/cashflow/project", async (req, res) => {
    try {
      const parseResult = cashFlowInputSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid cash flow parameters",
          details: parseResult.error.errors,
        });
      }
      
      const projection = projectCashFlow(parseResult.data);
      res.json(projection);
    } catch (error: any) {
      console.error("Error projecting cash flow:", error);
      res.status(500).json({ error: error.message || "Failed to project cash flow" });
    }
  });

  // ============================================
  // MULTI-CURRENCY ENDPOINTS
  // ============================================

  // Get exchange rates
  app.get("/api/currency/rates", async (_req, res) => {
    try {
      const rates = await getExchangeRates();
      res.json(rates);
    } catch (error: any) {
      console.error("Error fetching exchange rates:", error);
      res.status(500).json({ error: error.message || "Failed to fetch exchange rates" });
    }
  });

  // Get supported currencies
  app.get("/api/currency/supported", (_req, res) => {
    res.json(currencyDetails);
  });

  // Convert currency
  app.get("/api/currency/convert", async (req, res) => {
    try {
      const { amount, from, to } = req.query;
      
      if (!amount || !from || !to) {
        return res.status(400).json({ error: "Missing required parameters: amount, from, to" });
      }
      
      const converted = await convertCurrency(
        parseFloat(amount as string),
        from as string,
        to as string
      );
      
      res.json({
        original: parseFloat(amount as string),
        from,
        to,
        converted,
      });
    } catch (error: any) {
      console.error("Error converting currency:", error);
      res.status(500).json({ error: error.message || "Failed to convert currency" });
    }
  });

  // ============================================
  // LEGAL ENTITIES ENDPOINTS
  // ============================================

  // Get all entities
  app.get("/api/entities", (_req, res) => {
    try {
      const allEntities = entities.getEntities();
      res.json(allEntities);
    } catch (error: any) {
      console.error("Error fetching entities:", error);
      res.status(500).json({ error: error.message || "Failed to fetch entities" });
    }
  });

  // Create entity
  app.post("/api/entities", (req, res) => {
    try {
      const parseResult = insertLegalEntitySchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid entity data",
          details: parseResult.error.errors,
        });
      }
      
      const entity = entities.createEntity(parseResult.data);
      res.status(201).json(entity);
    } catch (error: any) {
      console.error("Error creating entity:", error);
      res.status(500).json({ error: error.message || "Failed to create entity" });
    }
  });

  // Update entity
  app.put("/api/entities/:id", (req, res) => {
    try {
      const updated = entities.updateEntity(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Entity not found" });
      }
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating entity:", error);
      res.status(500).json({ error: error.message || "Failed to update entity" });
    }
  });

  // Delete entity
  app.delete("/api/entities/:id", (req, res) => {
    try {
      const deleted = entities.deleteEntity(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Entity not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting entity:", error);
      res.status(500).json({ error: error.message || "Failed to delete entity" });
    }
  });

  // Assign holding to entity
  app.post("/api/entities/:id/holdings/:holdingId", (req, res) => {
    try {
      const success = entities.assignHoldingToEntity(req.params.id, req.params.holdingId);
      if (!success) {
        return res.status(404).json({ error: "Entity not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error assigning holding:", error);
      res.status(500).json({ error: error.message || "Failed to assign holding" });
    }
  });

  // Remove holding from entity
  app.delete("/api/entities/:id/holdings/:holdingId", (req, res) => {
    try {
      const success = entities.removeHoldingFromEntity(req.params.id, req.params.holdingId);
      res.json({ success });
    } catch (error: any) {
      console.error("Error removing holding:", error);
      res.status(500).json({ error: error.message || "Failed to remove holding" });
    }
  });

  // Get entity holdings
  app.get("/api/entities/:id/holdings", (req, res) => {
    try {
      const holdingIds = entities.getEntityHoldingIds(req.params.id);
      res.json(holdingIds);
    } catch (error: any) {
      console.error("Error fetching entity holdings:", error);
      res.status(500).json({ error: error.message || "Failed to fetch entity holdings" });
    }
  });

  // ============================================
  // ESTATE & BENEFICIARY VAULT ENDPOINTS
  // ============================================

  // Get estate summary
  app.get("/api/estate/summary", (_req, res) => {
    try {
      const summary = estate.getEstateSummary();
      res.json(summary);
    } catch (error: any) {
      console.error("Error fetching estate summary:", error);
      res.status(500).json({ error: error.message || "Failed to fetch estate summary" });
    }
  });

  // Beneficiaries
  app.get("/api/estate/beneficiaries", (_req, res) => {
    try {
      const beneficiaries = estate.getBeneficiaries();
      res.json(beneficiaries);
    } catch (error: any) {
      console.error("Error fetching beneficiaries:", error);
      res.status(500).json({ error: error.message || "Failed to fetch beneficiaries" });
    }
  });

  app.post("/api/estate/beneficiaries", (req, res) => {
    try {
      const parseResult = insertBeneficiarySchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid beneficiary data",
          details: parseResult.error.errors,
        });
      }
      
      const beneficiary = estate.createBeneficiary(parseResult.data);
      res.status(201).json(beneficiary);
    } catch (error: any) {
      console.error("Error creating beneficiary:", error);
      res.status(500).json({ error: error.message || "Failed to create beneficiary" });
    }
  });

  app.put("/api/estate/beneficiaries/:id", (req, res) => {
    try {
      const updated = estate.updateBeneficiary(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Beneficiary not found" });
      }
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating beneficiary:", error);
      res.status(500).json({ error: error.message || "Failed to update beneficiary" });
    }
  });

  app.delete("/api/estate/beneficiaries/:id", (req, res) => {
    try {
      const deleted = estate.deleteBeneficiary(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Beneficiary not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting beneficiary:", error);
      res.status(500).json({ error: error.message || "Failed to delete beneficiary" });
    }
  });

  // Documents
  app.get("/api/estate/documents", (_req, res) => {
    try {
      const documents = estate.getDocuments();
      res.json(documents);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: error.message || "Failed to fetch documents" });
    }
  });

  app.post("/api/estate/documents", (req, res) => {
    try {
      const parseResult = insertVaultDocumentSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid document data",
          details: parseResult.error.errors,
        });
      }
      
      const doc = estate.createDocument(parseResult.data);
      res.status(201).json(doc);
    } catch (error: any) {
      console.error("Error creating document:", error);
      res.status(500).json({ error: error.message || "Failed to create document" });
    }
  });

  app.put("/api/estate/documents/:id", (req, res) => {
    try {
      const updated = estate.updateDocument(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating document:", error);
      res.status(500).json({ error: error.message || "Failed to update document" });
    }
  });

  app.delete("/api/estate/documents/:id", (req, res) => {
    try {
      const deleted = estate.deleteDocument(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: error.message || "Failed to delete document" });
    }
  });

  // Estate settings
  app.get("/api/estate/settings", (_req, res) => {
    try {
      const settings = estate.getEstateSettings();
      res.json(settings);
    } catch (error: any) {
      console.error("Error fetching estate settings:", error);
      res.status(500).json({ error: error.message || "Failed to fetch estate settings" });
    }
  });

  app.put("/api/estate/settings", (req, res) => {
    try {
      const settings = estate.updateEstateSettings(req.body);
      res.json(settings);
    } catch (error: any) {
      console.error("Error updating estate settings:", error);
      res.status(500).json({ error: error.message || "Failed to update estate settings" });
    }
  });

  // ============================================
  // HOUSEHOLD / FAMILY MODE ENDPOINTS
  // ============================================

  // Get user's households
  app.get("/api/households", (req, res) => {
    try {
      const userId = (req.query.userId as string) || "user-1"; // Default for demo
      const households = household.getUserHouseholds(userId);
      res.json(households);
    } catch (error: any) {
      console.error("Error fetching households:", error);
      res.status(500).json({ error: error.message || "Failed to fetch households" });
    }
  });

  // Create household
  app.post("/api/households", (req, res) => {
    try {
      const { name, userId = "user-1", email = "user@example.com", displayName = "User" } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }
      
      const result = household.createHousehold(name, userId, email, displayName);
      res.status(201).json(result);
    } catch (error: any) {
      console.error("Error creating household:", error);
      res.status(500).json({ error: error.message || "Failed to create household" });
    }
  });

  // Get household members
  app.get("/api/households/:id/members", (req, res) => {
    try {
      const members = household.getHouseholdMembers(req.params.id);
      res.json(members);
    } catch (error: any) {
      console.error("Error fetching household members:", error);
      res.status(500).json({ error: error.message || "Failed to fetch household members" });
    }
  });

  // Invite to household
  app.post("/api/households/:id/invites", (req, res) => {
    try {
      const { email, role, invitedBy = "user-1", inviterName = "User" } = req.body;
      
      if (!email || !role) {
        return res.status(400).json({ error: "Email and role are required" });
      }
      
      const invite = household.createInvite(req.params.id, email, role, invitedBy, inviterName);
      if (!invite) {
        return res.status(400).json({ error: "Cannot create invite" });
      }
      res.status(201).json(invite);
    } catch (error: any) {
      console.error("Error creating invite:", error);
      res.status(500).json({ error: error.message || "Failed to create invite" });
    }
  });

  // Get household invites
  app.get("/api/households/:id/invites", (req, res) => {
    try {
      const invites = household.getHouseholdInvites(req.params.id);
      res.json(invites);
    } catch (error: any) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ error: error.message || "Failed to fetch invites" });
    }
  });

  // Accept invite
  app.post("/api/invites/:id/accept", (req, res) => {
    try {
      const { userId = "user-2", displayName = "New Member" } = req.body;
      const member = household.acceptInvite(req.params.id, userId, displayName);
      if (!member) {
        return res.status(400).json({ error: "Cannot accept invite" });
      }
      res.json(member);
    } catch (error: any) {
      console.error("Error accepting invite:", error);
      res.status(500).json({ error: error.message || "Failed to accept invite" });
    }
  });

  // Get household activity
  app.get("/api/households/:id/activity", (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const activity = household.getHouseholdActivity(req.params.id, limit);
      res.json(activity);
    } catch (error: any) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ error: error.message || "Failed to fetch activity" });
    }
  });

  // ============================================
  // AI ASSISTANT ENDPOINTS
  // ============================================

  // Send message to AI assistant
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const parseResult = aiQuerySchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid query",
          details: parseResult.error.errors,
        });
      }
      
      const userId = (req.body.userId as string) || "user-1";
      const holdings = await storage.getHoldings();
      const metrics = await storage.getPortfolioMetrics();
      
      const response = await processQuery(parseResult.data, userId, holdings, metrics);
      res.json(response);
    } catch (error: any) {
      console.error("Error processing AI query:", error);
      res.status(500).json({ error: error.message || "Failed to process query" });
    }
  });

  // Get user conversations
  app.get("/api/ai/conversations", (req, res) => {
    try {
      const userId = (req.query.userId as string) || "user-1";
      const conversations = getUserConversations(userId);
      res.json(conversations);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: error.message || "Failed to fetch conversations" });
    }
  });

  // Get single conversation
  app.get("/api/ai/conversations/:id", (req, res) => {
    try {
      const userId = (req.query.userId as string) || "user-1";
      const conversation = getConversation(req.params.id, userId);
      res.json(conversation);
    } catch (error: any) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: error.message || "Failed to fetch conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/ai/conversations/:id", (req, res) => {
    try {
      const userId = (req.query.userId as string) || "user-1";
      const deleted = deleteConversation(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: error.message || "Failed to delete conversation" });
    }
  });

  return httpServer;
}
