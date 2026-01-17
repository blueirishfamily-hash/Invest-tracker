import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Portfolio Holdings Schema
export const holdingsSchema = z.object({
  id: z.string(),
  ticker: z.string(),
  name: z.string(),
  quantity: z.number(),
  costBasis: z.number(),
  currentPrice: z.number(),
  currentValue: z.number(),
  growthRate30d: z.number(),
  sector: z.string(),
  industry: z.string(),
  account: z.string().optional(),
  currency: z.string().optional(),
  market: z.string().optional(),
  region: z.string().optional(),
  assetType: z.string().optional(),
});

export type Holding = z.infer<typeof holdingsSchema>;

export const insertHoldingSchema = holdingsSchema.omit({ id: true });
export type InsertHolding = z.infer<typeof insertHoldingSchema>;

// Portfolio Metrics Schema
export const portfolioMetricsSchema = z.object({
  totalValue: z.number(),
  totalCostBasis: z.number(),
  totalReturn: z.number(),
  totalReturnPercent: z.number(),
  timeWeightedReturn: z.number(),
});

export type PortfolioMetrics = z.infer<typeof portfolioMetricsSchema>;

// Benchmark Data Schema
export const benchmarkDataSchema = z.object({
  portfolioGrowth: z.number(),
  spyGrowth: z.number(),
  spyCurrentPrice: z.number(),
});

export type BenchmarkData = z.infer<typeof benchmarkDataSchema>;

// Benchmark Chart Data Schema
export const benchmarkChartDataSchema = z.object({
  portfolio: z.array(z.object({
    date: z.string(),
    value: z.number(),
  })),
  spy: z.array(z.object({
    date: z.string(),
    value: z.number(),
  })),
});

export type BenchmarkChartData = z.infer<typeof benchmarkChartDataSchema>;

// Industry Analysis Schema
export const industryAnalysisSchema = z.object({
  industry: z.string(),
  totalValue: z.number(),
  holdingsCount: z.number(),
  percentage: z.number(),
  averageGrowth: z.number(),
});

export type IndustryAnalysis = z.infer<typeof industryAnalysisSchema>;

// Breakdown Item Schema (for items within a breakdown category)
export const breakdownItemSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  value: z.number(),
  percentage: z.number(), // Percentage within category, not portfolio
  growth: z.number(),
});

export type BreakdownItem = z.infer<typeof breakdownItemSchema>;

// Sector Company Schema (for backward compatibility)
export const sectorCompanySchema = breakdownItemSchema;
export type SectorCompany = BreakdownItem;

// Generic Breakdown Analysis Schema (reusable for all breakdown types)
export const breakdownAnalysisSchema = z.object({
  category: z.string(), // e.g., "Technology", "Fidelity 401k", "USD", "NYSE", "Equity"
  totalValue: z.number(),
  holdingsCount: z.number(),
  percentage: z.number(), // Percentage of portfolio
  averageGrowth: z.number(),
  items: z.array(breakdownItemSchema), // Companies/holdings within this category
});

export type BreakdownAnalysis = z.infer<typeof breakdownAnalysisSchema>;

// Sector Analysis Schema (for backward compatibility)
export const sectorAnalysisSchema = z.object({
  sector: z.string(),
  totalValue: z.number(),
  holdingsCount: z.number(),
  percentage: z.number(), // Percentage of portfolio
  averageGrowth: z.number(),
  companies: z.array(sectorCompanySchema),
});

export type SectorAnalysis = z.infer<typeof sectorAnalysisSchema>;

// Fear & Greed Index Schema
export const fearGreedIndexSchema = z.object({
  score: z.number().min(0).max(100),
  rating: z.enum(["Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed"]),
  timestamp: z.string(),
  previousClose: z.number().optional(),
  previousWeek: z.number().optional(),
  previousMonth: z.number().optional(),
});

export type FearGreedIndex = z.infer<typeof fearGreedIndexSchema>;

// Bubble Warning Schema
export const bubbleWarningSchema = z.object({
  industry: z.string(),
  concentration: z.number(),
  growthRate: z.number(),
  spyGrowthRate: z.number(),
  isOverheating: z.boolean(),
});

export type BubbleWarning = z.infer<typeof bubbleWarningSchema>;

// News Article Schema
export const newsArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  source: z.string(),
  publishedAt: z.string(),
  description: z.string(),
  imageUrl: z.string().optional(),
  sentiment: z.enum(["positive", "negative", "neutral"]),
  relevanceSummary: z.string(),
  relatedTicker: z.string().optional(),
  relatedSector: z.string().optional(),
  relatedIndustry: z.string().optional(),
});

export type NewsArticle = z.infer<typeof newsArticleSchema>;

// Stock Data Schema
export const stockDataSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  currentPrice: z.number(),
  sector: z.string().optional(),
  industry: z.string().optional(),
  historicalData: z.array(z.object({
    date: z.string(),
    price: z.number(),
  })),
});

export type StockData = z.infer<typeof stockDataSchema>;

// Index Data Schema
export const indexDataSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  historicalData: z.array(z.object({
    date: z.string(),
    price: z.number(),
  })),
});

export type IndexData = z.infer<typeof indexDataSchema>;

// Plaid Account Schema
export const plaidAccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  accessToken: z.string(), // Encrypted in storage
  itemId: z.string(),
  institutionId: z.string(),
  institutionName: z.string(),
  accountId: z.string(),
  accountName: z.string(),
  accountType: z.string().optional(),
  accountSubtype: z.string().optional(),
  lastSyncedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PlaidAccount = z.infer<typeof plaidAccountSchema>;

export const insertPlaidAccountSchema = plaidAccountSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertPlaidAccount = z.infer<typeof insertPlaidAccountSchema>;

// Demo Holdings Data
export const demoHoldings: Holding[] = [
  {
    id: "1",
    ticker: "AAPL",
    name: "Apple Inc.",
    quantity: 10,
    costBasis: 1520,
    currentPrice: 178.50,
    currentValue: 1785,
    growthRate30d: 4.2,
    sector: "Technology",
    industry: "Consumer Electronics",
    account: "Fidelity 401k",
    currency: "USD",
    market: "NASDAQ",
    region: "US",
    assetType: "Equity",
  },
  {
    id: "2",
    ticker: "MSFT",
    name: "Microsoft Corporation",
    quantity: 5,
    costBasis: 1650,
    currentPrice: 378.25,
    currentValue: 1891.25,
    growthRate30d: 6.8,
    sector: "Technology",
    industry: "Software—Infrastructure",
    account: "Fidelity 401k",
    currency: "USD",
    market: "NASDAQ",
    region: "US",
    assetType: "Equity",
  },
  {
    id: "3",
    ticker: "GOOGL",
    name: "Alphabet Inc.",
    quantity: 8,
    costBasis: 960,
    currentPrice: 141.80,
    currentValue: 1134.40,
    growthRate30d: 3.5,
    sector: "Communication Services",
    industry: "Internet Content & Information",
    account: "Robinhood",
    currency: "USD",
    market: "NASDAQ",
    region: "US",
    assetType: "Equity",
  },
  {
    id: "4",
    ticker: "AMZN",
    name: "Amazon.com Inc.",
    quantity: 12,
    costBasis: 1800,
    currentPrice: 178.35,
    currentValue: 2140.20,
    growthRate30d: 5.2,
    sector: "Consumer Cyclical",
    industry: "Internet Retail",
    account: "Robinhood",
    currency: "USD",
    market: "NASDAQ",
    region: "US",
    assetType: "Equity",
  },
  {
    id: "5",
    ticker: "TSLA",
    name: "Tesla Inc.",
    quantity: 15,
    costBasis: 3000,
    currentPrice: 248.50,
    currentValue: 3727.50,
    growthRate30d: 12.4,
    sector: "Consumer Cyclical",
    industry: "Auto Manufacturers",
    account: "TD Ameritrade",
    currency: "USD",
    market: "NASDAQ",
    region: "US",
    assetType: "Equity",
  },
  {
    id: "6",
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    quantity: 20,
    costBasis: 4800,
    currentPrice: 495.20,
    currentValue: 9904,
    growthRate30d: 18.6,
    sector: "Technology",
    industry: "Semiconductors",
    account: "TD Ameritrade",
    currency: "USD",
    market: "NASDAQ",
    region: "US",
    assetType: "Equity",
  },
  {
    id: "7",
    ticker: "JPM",
    name: "JPMorgan Chase & Co.",
    quantity: 25,
    costBasis: 4200,
    currentPrice: 195.40,
    currentValue: 4885,
    growthRate30d: 2.1,
    sector: "Financial Services",
    industry: "Banks—Diversified",
    account: "Manual",
    currency: "USD",
    market: "NYSE",
    region: "US",
    assetType: "Equity",
  },
  {
    id: "8",
    ticker: "JNJ",
    name: "Johnson & Johnson",
    quantity: 18,
    costBasis: 2520,
    currentPrice: 158.75,
    currentValue: 2857.50,
    growthRate30d: 1.4,
    sector: "Healthcare",
    industry: "Drug Manufacturers",
    account: "Manual",
    currency: "USD",
    market: "NYSE",
    region: "US",
    assetType: "Equity",
  },
];
