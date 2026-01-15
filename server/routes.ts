import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertHoldingSchema } from "@shared/schema";
import { z } from "zod";
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
