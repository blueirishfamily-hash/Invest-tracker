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

// Industry Analysis Schema
export const industryAnalysisSchema = z.object({
  industry: z.string(),
  totalValue: z.number(),
  holdingsCount: z.number(),
  percentage: z.number(),
  averageGrowth: z.number(),
});

export type IndustryAnalysis = z.infer<typeof industryAnalysisSchema>;

// Bubble Warning Schema
export const bubbleWarningSchema = z.object({
  industry: z.string(),
  concentration: z.number(),
  growthRate: z.number(),
  spyGrowthRate: z.number(),
  isOverheating: z.boolean(),
});

export type BubbleWarning = z.infer<typeof bubbleWarningSchema>;

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
  },
];
