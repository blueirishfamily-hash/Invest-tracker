import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertHoldingSchema } from "@shared/schema";
import { z } from "zod";

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

  return httpServer;
}
