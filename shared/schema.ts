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

// ============================================
// ALTERNATIVE ASSET SCHEMAS
// ============================================

// Real Estate Schema
export const realEstateSchema = z.object({
  id: z.string(),
  propertyAddress: z.string(),
  propertyName: z.string().optional(), // e.g., "Beach House", "Primary Residence"
  propertyType: z.enum(["Primary Residence", "Vacation Home", "Rental", "Commercial", "Land", "Other"]),
  estimatedValue: z.number(),
  purchasePrice: z.number(),
  purchaseDate: z.string(),
  mortgageBalance: z.number().optional(),
  monthlyPayment: z.number().optional(),
  interestRate: z.number().optional(),
  lender: z.string().optional(),
  rentalIncome: z.number().optional(), // Monthly rental income
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RealEstate = z.infer<typeof realEstateSchema>;

export const insertRealEstateSchema = realEstateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRealEstate = z.infer<typeof insertRealEstateSchema>;

// Crypto Asset Schema
export const cryptoAssetSchema = z.object({
  id: z.string(),
  symbol: z.string(), // e.g., "BTC", "ETH"
  name: z.string(), // e.g., "Bitcoin", "Ethereum"
  quantity: z.number(),
  costBasis: z.number(),
  currentPrice: z.number(),
  currentValue: z.number(),
  walletAddress: z.string().optional(),
  walletName: z.string().optional(), // e.g., "Ledger", "MetaMask", "Coinbase"
  exchange: z.string().optional(), // e.g., "Coinbase", "Binance", "Kraken"
  isNFT: z.boolean().default(false),
  nftDetails: z.object({
    collection: z.string().optional(),
    tokenId: z.string().optional(),
    imageUrl: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CryptoAsset = z.infer<typeof cryptoAssetSchema>;

export const insertCryptoAssetSchema = cryptoAssetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCryptoAsset = z.infer<typeof insertCryptoAssetSchema>;

// Collectible Schema
export const collectibleSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["Art", "Watches", "Cars", "Wine", "Jewelry", "Coins", "Stamps", "Sports Memorabilia", "Antiques", "Other"]),
  description: z.string().optional(),
  estimatedValue: z.number(),
  purchasePrice: z.number(),
  purchaseDate: z.string(),
  condition: z.enum(["Mint", "Excellent", "Good", "Fair", "Poor"]).optional(),
  appraisalValue: z.number().optional(),
  appraisalDate: z.string().optional(),
  appraiser: z.string().optional(),
  location: z.string().optional(), // e.g., "Safe deposit box", "Home safe"
  insured: z.boolean().default(false),
  insuranceValue: z.number().optional(),
  imageUrl: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Collectible = z.infer<typeof collectibleSchema>;

export const insertCollectibleSchema = collectibleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCollectible = z.infer<typeof insertCollectibleSchema>;

// Alternative Investment Schema (PE, Hedge Funds, VC, Angel)
export const alternativeInvestmentSchema = z.object({
  id: z.string(),
  name: z.string(), // e.g., "Sequoia Capital Fund XV"
  type: z.enum(["Private Equity", "Hedge Fund", "Venture Capital", "Angel Investment", "Real Estate Fund", "Other"]),
  manager: z.string().optional(), // Fund manager or GP name
  committedCapital: z.number(), // Total commitment
  calledCapital: z.number(), // Capital already called
  currentNAV: z.number(), // Current net asset value
  distributions: z.number().default(0), // Total distributions received
  vintage: z.string().optional(), // Year fund started
  investmentDate: z.string(),
  expectedMaturity: z.string().optional(),
  irr: z.number().optional(), // Internal rate of return
  multiple: z.number().optional(), // TVPI (Total Value to Paid-In)
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AlternativeInvestment = z.infer<typeof alternativeInvestmentSchema>;

export const insertAlternativeInvestmentSchema = alternativeInvestmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAlternativeInvestment = z.infer<typeof insertAlternativeInvestmentSchema>;

// Net Worth Summary Schema
export const netWorthSummarySchema = z.object({
  stocksAndETFs: z.number(),
  realEstate: z.number(),
  crypto: z.number(),
  collectibles: z.number(),
  alternativeInvestments: z.number(),
  totalNetWorth: z.number(),
  totalLiabilities: z.number(), // Mortgages, etc.
  netEquity: z.number(),
});

export type NetWorthSummary = z.infer<typeof netWorthSummarySchema>;

// ============================================
// PORTFOLIO RISK METRICS SCHEMAS
// ============================================

// Risk level enum for interpretation
export const riskLevelEnum = z.enum(["Low", "Medium", "High", "Very High"]);
export type RiskLevel = z.infer<typeof riskLevelEnum>;

// Portfolio Risk Metrics Schema
export const portfolioRiskMetricsSchema = z.object({
  // Volatility - annualized standard deviation of returns
  volatility: z.number(), // As percentage (e.g., 15.5 = 15.5%)
  volatilityLevel: riskLevelEnum,
  
  // Beta - sensitivity to market movements
  beta: z.number(), // 1.0 = moves with market, >1 = more volatile, <1 = less volatile
  betaInterpretation: z.string(), // e.g., "Slightly more volatile than market"
  
  // Sharpe Ratio - risk-adjusted return
  sharpeRatio: z.number(), // Higher is better, >1 is good, >2 is very good
  sharpeInterpretation: z.string(),
  
  // Value at Risk (VaR)
  var95: z.number(), // 95% confidence - max daily loss in dollars
  var99: z.number(), // 99% confidence - max daily loss in dollars
  var95Percent: z.number(), // As percentage of portfolio
  var99Percent: z.number(),
  
  // Max Drawdown - largest historical decline
  maxDrawdown: z.number(), // As percentage
  maxDrawdownPeriod: z.string().optional(), // e.g., "Mar 2020 - Apr 2020"
  
  // Benchmark comparison
  spyVolatility: z.number(),
  spyBeta: z.number(),
  spySharpeRatio: z.number(),
  
  // Calculation metadata
  calculationDate: z.string(),
  dataPoints: z.number(), // Number of days used in calculation
  timeframe: z.string(), // e.g., "1Y", "3Y"
});

export type PortfolioRiskMetrics = z.infer<typeof portfolioRiskMetricsSchema>;

// ============================================
// FEE ANALYZER SCHEMAS
// ============================================

// Individual holding fee info
export const holdingFeeSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  holdingValue: z.number(),
  expenseRatio: z.number().nullable(), // As percentage (e.g., 0.03 = 0.03%)
  annualFee: z.number(), // Dollar amount
  isFund: z.boolean(), // true if ETF or mutual fund
  fundType: z.enum(["ETF", "Mutual Fund", "Stock", "Unknown"]).optional(),
  category: z.string().optional(), // e.g., "Large Cap Growth", "S&P 500 Index"
});

export type HoldingFee = z.infer<typeof holdingFeeSchema>;

// Lower cost alternative suggestion
export const feeAlternativeSchema = z.object({
  currentTicker: z.string(),
  currentExpenseRatio: z.number(),
  alternativeTicker: z.string(),
  alternativeName: z.string(),
  alternativeExpenseRatio: z.number(),
  annualSavings: z.number(), // Dollar amount saved per year
  tenYearSavings: z.number(), // Projected savings over 10 years
});

export type FeeAlternative = z.infer<typeof feeAlternativeSchema>;

// Fee projection for future impact
export const feeProjectionSchema = z.object({
  year: z.number(),
  portfolioWithFees: z.number(),
  portfolioWithoutFees: z.number(),
  cumulativeFeesLost: z.number(),
});

export type FeeProjection = z.infer<typeof feeProjectionSchema>;

// Complete fee analysis response
export const feeAnalysisSchema = z.object({
  holdings: z.array(holdingFeeSchema),
  totalPortfolioValue: z.number(),
  totalAnnualFees: z.number(),
  weightedAverageExpenseRatio: z.number(), // Portfolio-weighted average
  
  // Projections
  projections: z.array(feeProjectionSchema),
  tenYearFeeCost: z.number(),
  twentyYearFeeCost: z.number(),
  thirtyYearFeeCost: z.number(),
  
  // Alternatives
  alternatives: z.array(feeAlternativeSchema),
  potentialAnnualSavings: z.number(),
  
  // Summary stats
  highestFeeHolding: z.string().optional(),
  lowestFeeHolding: z.string().optional(),
  fundsCount: z.number(),
  stocksCount: z.number(),
});

export type FeeAnalysis = z.infer<typeof feeAnalysisSchema>;

// ============================================
// MONTE CARLO SIMULATION SCHEMAS
// ============================================

// Monte Carlo simulation input parameters
export const monteCarloInputSchema = z.object({
  currentPortfolioValue: z.number().min(0),
  annualContribution: z.number().min(0),
  targetAmount: z.number().min(0),
  yearsToRetirement: z.number().min(1).max(50),
  expectedReturn: z.number(), // as decimal (0.07 = 7%)
  volatility: z.number().min(0), // standard deviation as decimal
  inflationRate: z.number(), // as decimal (0.03 = 3%)
  withdrawalRate: z.number().min(0), // as decimal (0.04 = 4%)
  numSimulations: z.number().min(100).max(10000).default(1000),
});

export type MonteCarloInput = z.infer<typeof monteCarloInputSchema>;

// Percentile outcomes at final year
export const percentileOutcomesSchema = z.object({
  p10: z.number(),
  p25: z.number(),
  p50: z.number(),
  p75: z.number(),
  p90: z.number(),
});

export type PercentileOutcomes = z.infer<typeof percentileOutcomesSchema>;

// Year-by-year percentile data for fan chart
export const yearlyPercentilesSchema = z.object({
  year: z.number(),
  p10: z.number(),
  p25: z.number(),
  p50: z.number(),
  p75: z.number(),
  p90: z.number(),
});

export type YearlyPercentiles = z.infer<typeof yearlyPercentilesSchema>;

// Monte Carlo simulation results
export const monteCarloResultSchema = z.object({
  // Success metrics
  successRate: z.number(), // 0-100%
  successCount: z.number(),
  failureCount: z.number(),
  
  // Final value percentiles
  percentiles: percentileOutcomesSchema,
  
  // Year-by-year percentiles for fan chart
  yearlyPercentiles: z.array(yearlyPercentilesSchema),
  
  // Statistics
  statistics: z.object({
    mean: z.number(),
    median: z.number(),
    min: z.number(),
    max: z.number(),
    stdDev: z.number(),
  }),
  
  // Input echo for reference
  inputs: monteCarloInputSchema,
  
  // Metadata
  simulationsRun: z.number(),
  calculationTimeMs: z.number(),
});

export type MonteCarloResult = z.infer<typeof monteCarloResultSchema>;

// Planning defaults from current portfolio
export const planningDefaultsSchema = z.object({
  currentPortfolioValue: z.number(),
  estimatedVolatility: z.number().nullable(),
  suggestedTargetAmount: z.number(),
});

export type PlanningDefaults = z.infer<typeof planningDefaultsSchema>;

// ============================================
// TAX PLANNING SCHEMAS
// ============================================

// Holding period enum
export const holdingPeriodEnum = z.enum(["short-term", "long-term"]);
export type HoldingPeriod = z.infer<typeof holdingPeriodEnum>;

// Individual holding tax info
export const taxHoldingSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  quantity: z.number(),
  costBasis: z.number(),
  currentValue: z.number(),
  unrealizedGainLoss: z.number(),
  unrealizedGainLossPercent: z.number(),
  isLoss: z.boolean(),
  potentialTaxSavings: z.number(), // For losses
  estimatedTax: z.number(), // For gains
  holdingPeriod: holdingPeriodEnum,
  purchaseDate: z.string().optional(),
  daysHeld: z.number().optional(),
});

export type TaxHolding = z.infer<typeof taxHoldingSchema>;

// Tax-loss harvesting analysis
export const taxLossHarvestingSchema = z.object({
  holdings: z.array(taxHoldingSchema),
  
  // Losses
  totalUnrealizedLosses: z.number(),
  shortTermLosses: z.number(),
  longTermLosses: z.number(),
  totalPotentialTaxSavings: z.number(),
  
  // Gains
  totalUnrealizedGains: z.number(),
  shortTermGains: z.number(),
  longTermGains: z.number(),
  estimatedTaxLiability: z.number(),
  
  // Net position
  netGainLoss: z.number(),
  
  // Tax rates used
  shortTermRate: z.number(),
  longTermRate: z.number(),
});

export type TaxLossHarvesting = z.infer<typeof taxLossHarvestingSchema>;

// Roth conversion input
export const rothConversionInputSchema = z.object({
  conversionAmount: z.number().min(0),
  currentAge: z.number().min(18).max(100),
  retirementAge: z.number().min(18).max(100),
  currentTaxBracket: z.number().min(0).max(50), // As percentage
  expectedRetirementTaxBracket: z.number().min(0).max(50),
  expectedReturn: z.number(), // As decimal
  traditionalBalance: z.number().optional(),
});

export type RothConversionInput = z.infer<typeof rothConversionInputSchema>;

// Roth conversion result
export const rothConversionResultSchema = z.object({
  conversionAmount: z.number(),
  taxOnConversion: z.number(),
  effectiveTaxRate: z.number(),
  
  // Projections at retirement
  yearsToRetirement: z.number(),
  futureValueIfConverted: z.number(), // Tax-free in Roth
  futureValueIfNotConverted: z.number(), // Pre-tax in Traditional
  taxOnTraditionalWithdrawal: z.number(),
  afterTaxTraditional: z.number(),
  
  // Comparison
  rothAdvantage: z.number(), // Positive = Roth is better
  breakEvenYears: z.number(),
  recommendation: z.string(),
});

export type RothConversionResult = z.infer<typeof rothConversionResultSchema>;

// ============================================
// CASH FLOW FORECASTING SCHEMAS
// ============================================

// Planned expense/milestone
export const plannedExpenseSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  year: z.number(),
  type: z.enum(["expense", "income"]).default("expense"),
});

export type PlannedExpense = z.infer<typeof plannedExpenseSchema>;

// Cash flow input parameters
export const cashFlowInputSchema = z.object({
  currentNetWorth: z.number(),
  monthlyIncome: z.number(),
  monthlyExpenses: z.number(),
  monthlySavings: z.number(),
  expectedReturn: z.number(), // As decimal
  inflationRate: z.number(), // As decimal
  yearsToProject: z.number().min(1).max(50),
  plannedExpenses: z.array(plannedExpenseSchema).optional(),
});

export type CashFlowInput = z.infer<typeof cashFlowInputSchema>;

// Yearly projection data
export const yearlyProjectionSchema = z.object({
  year: z.number(),
  age: z.number().optional(),
  startingNetWorth: z.number(),
  contributions: z.number(),
  investmentGains: z.number(),
  plannedExpenses: z.number(),
  endingNetWorth: z.number(),
  cumulativeContributions: z.number(),
  cumulativeGains: z.number(),
});

export type YearlyProjection = z.infer<typeof yearlyProjectionSchema>;

// Financial milestone
export const financialMilestoneSchema = z.object({
  name: z.string(),
  targetAmount: z.number(),
  estimatedYear: z.number().nullable(),
  estimatedDate: z.string().nullable(),
  yearsAway: z.number().nullable(),
  isAchieved: z.boolean(),
  progressPercent: z.number(),
});

export type FinancialMilestone = z.infer<typeof financialMilestoneSchema>;

// Cash flow projection result
export const cashFlowProjectionSchema = z.object({
  yearlyData: z.array(yearlyProjectionSchema),
  
  // Summary
  finalNetWorth: z.number(),
  totalContributions: z.number(),
  totalInvestmentGains: z.number(),
  totalPlannedExpenses: z.number(),
  
  // Rates
  savingsRate: z.number(), // As percentage
  effectiveGrowthRate: z.number(),
  
  // Milestones
  milestones: z.array(financialMilestoneSchema),
  
  // Key points
  netWorthIn5Years: z.number(),
  netWorthIn10Years: z.number(),
  netWorthIn20Years: z.number(),
});

export type CashFlowProjection = z.infer<typeof cashFlowProjectionSchema>;

// Cash flow defaults
export const cashFlowDefaultsSchema = z.object({
  currentNetWorth: z.number(),
  estimatedMonthlySavings: z.number(),
  suggestedMilestones: z.array(z.object({
    name: z.string(),
    amount: z.number(),
  })),
});

export type CashFlowDefaults = z.infer<typeof cashFlowDefaultsSchema>;

// ============================================
// MULTI-CURRENCY SUPPORT
// ============================================

export const supportedCurrencies = [
  "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "CNY", "INR", "BRL"
] as const;

export type SupportedCurrency = typeof supportedCurrencies[number];

export const exchangeRateSchema = z.object({
  base: z.string(),
  rates: z.record(z.string(), z.number()),
  lastUpdated: z.string(),
});

export type ExchangeRates = z.infer<typeof exchangeRateSchema>;

export const portfolioStrategyEnum = z.enum([
  "Very Conservative",
  "Conservative",
  "Moderate",
  "Aggressive",
  "Very Aggressive",
]);

export const userPreferencesSchema = z.object({
  portfolioStrategy: portfolioStrategyEnum.default("Moderate"),
  currentAge: z.number().int().min(0).max(120).default(30),
  retirementAge: z.number().int().min(40).max(100).default(65),
  displayCurrency: z.string().default("USD"),
  themePreference: z.enum(["system", "light", "dark"]).default("system"),
  emailNotifications: z.boolean().default(true),
  dateFormat: z.string().default("MM/DD/YYYY"),
  numberFormat: z.string().default("en-US"),
  cashFlowChartType: z.enum(["sankey", "horizontalBar", "pie"]).default("pie"),
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

// ============================================
// FINANCIAL CORE (ACCOUNTS, TRANSACTIONS, BILLS)
// ============================================

export const financialInstitutionSchema = z.object({
  id: z.string(),
  name: z.string(),
  logoUrl: z.string().optional(),
  primaryColor: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FinancialInstitution = z.infer<typeof financialInstitutionSchema>;

export const insertFinancialInstitutionSchema = financialInstitutionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFinancialInstitution = z.infer<typeof insertFinancialInstitutionSchema>;

export const accountTypeEnum = z.enum([
  "checking",
  "savings",
  "credit",
  "loan",
  "bnpl",
  "investment",
  "cash",
  "other",
]);

export const syncStatusEnum = z.enum(["mock", "connected", "disconnected", "error"]);

export const financialAccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  institutionId: z.string().optional(),
  name: z.string(),
  type: accountTypeEnum,
  subtype: z.string().optional(),
  mask: z.string().optional(),
  balance: z.number(),
  available: z.number().optional(),
  creditLimit: z.number().optional(),
  interestRate: z.number().optional(),
  currency: z.string().default("USD"),
  isShared: z.boolean().default(false),
  syncStatus: syncStatusEnum.default("mock"),
  lastSyncedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FinancialAccount = z.infer<typeof financialAccountSchema>;

export const insertFinancialAccountSchema = financialAccountSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFinancialAccount = z.infer<typeof insertFinancialAccountSchema>;

export const transactionCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["income", "expense", "transfer"]),
  color: z.string().optional(),
  icon: z.string().optional(),
  isSystem: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TransactionCategory = z.infer<typeof transactionCategorySchema>;

export const insertTransactionCategorySchema = transactionCategorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTransactionCategory = z.infer<typeof insertTransactionCategorySchema>;

export const transactionTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TransactionTag = z.infer<typeof transactionTagSchema>;

export const insertTransactionTagSchema = transactionTagSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTransactionTag = z.infer<typeof insertTransactionTagSchema>;

export const transactionSplitSchema = z.object({
  id: z.string(),
  transactionId: z.string(),
  categoryId: z.string().optional(),
  amount: z.number(),
  notes: z.string().optional(),
});

export type TransactionSplit = z.infer<typeof transactionSplitSchema>;

export const transactionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  date: z.string(),
  name: z.string(),
  merchantName: z.string().optional(),
  amount: z.number(),
  direction: z.enum(["debit", "credit"]),
  categoryId: z.string().optional(),
  appliedRuleId: z.string().optional(), // Track which categorization rule was applied
  tags: z.array(z.string()).default([]),
  isPending: z.boolean().default(false),
  isSplit: z.boolean().default(false),
  splits: z.array(transactionSplitSchema).optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Transaction = z.infer<typeof transactionSchema>;

export const insertTransactionSchema = transactionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export const categoryRuleSchema = z.object({
  id: z.string(),
  pattern: z.string(), // keyword or regex (case-insensitive)
  categoryId: z.string(),
  confidence: z.number().min(0).max(1), // Computed automatically from acceptance rate
  acceptedCount: z.number().default(0), // Number of times this rule's categorization was accepted
  rejectedCount: z.number().default(0), // Number of times this rule's categorization was rejected
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CategoryRule = z.infer<typeof categoryRuleSchema>;

export const insertCategoryRuleSchema = categoryRuleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  confidence: true, // Confidence is computed automatically, not set manually
});

export type InsertCategoryRule = z.infer<typeof insertCategoryRuleSchema>;

export const billFrequencyEnum = z.enum([
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
  "one-time",
]);

export const billStatusEnum = z.enum(["scheduled", "paid", "overdue", "canceled"]);

export const billSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  dueDate: z.string(),
  frequency: billFrequencyEnum,
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  isAutoPay: z.boolean().default(false),
  reminderDaysBefore: z.array(z.number()).default([3, 1]),
  status: billStatusEnum.default("scheduled"),
  lastPaidDate: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Bill = z.infer<typeof billSchema>;

export const insertBillSchema = billSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBill = z.infer<typeof insertBillSchema>;

export const subscriptionCadenceEnum = z.enum([
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
]);

export const subscriptionStatusEnum = z.enum(["active", "paused", "canceled"]);

export const subscriptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  cadence: subscriptionCadenceEnum,
  nextBillingDate: z.string(),
  lastBillingDate: z.string().optional(),
  categoryId: z.string().optional(),
  paymentAccountId: z.string().optional(),
  status: subscriptionStatusEnum.default("active"),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Subscription = z.infer<typeof subscriptionSchema>;

export const insertSubscriptionSchema = subscriptionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

// ============================================
// GOALS & PLANNING (SINKING FUNDS, DEBT, WHAT-IF)
// ============================================

export const sinkingFundSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetAmount: z.number(),
  currentAmount: z.number().default(0),
  monthlyContribution: z.number().default(0),
  dueDate: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(["active", "paused", "completed"]).default("active"),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SinkingFund = z.infer<typeof sinkingFundSchema>;

export const insertSinkingFundSchema = sinkingFundSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSinkingFund = z.infer<typeof insertSinkingFundSchema>;

export const debtItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  balance: z.number(),
  interestRate: z.number(),
  minimumPayment: z.number(),
  dueDate: z.string().optional(),
  accountId: z.string().optional(),
});

export type DebtItem = z.infer<typeof debtItemSchema>;

export const debtPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  method: z.enum(["snowball", "avalanche"]),
  extraPayment: z.number().default(0),
  debts: z.array(debtItemSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DebtPlan = z.infer<typeof debtPlanSchema>;

export const insertDebtPlanSchema = debtPlanSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDebtPlan = z.infer<typeof insertDebtPlanSchema>;

export const cashFlowScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["income", "expense", "debt"]),
  amount: z.number(),
  startDate: z.string(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CashFlowScenario = z.infer<typeof cashFlowScenarioSchema>;

export const insertCashFlowScenarioSchema = cashFlowScenarioSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCashFlowScenario = z.infer<typeof insertCashFlowScenarioSchema>;

// ============================================
// INSIGHTS & ANOMALIES
// ============================================

export const anomalySchema = z.object({
  id: z.string(),
  type: z.enum(["spike", "recurring_increase", "duplicate", "new_merchant"]),
  transactionId: z.string(),
  description: z.string(),
  severity: z.enum(["low", "medium", "high"]).default("low"),
  createdAt: z.string(),
});

export type Anomaly = z.infer<typeof anomalySchema>;

// ============================================
// SECURITY SETTINGS (UI-ONLY)
// ============================================

export const securitySettingsSchema = z.object({
  mfaEnabled: z.boolean().default(false),
  biometricEnabled: z.boolean().default(false),
  encryptionEnabled: z.boolean().default(true),
  lastUpdated: z.string().optional(),
});

export type SecuritySettings = z.infer<typeof securitySettingsSchema>;

// ============================================
// NESTED ENTITIES (LLCs, Trusts)
// ============================================

export const entityTypeEnum = z.enum([
  "LLC", "Trust", "Corporation", "Partnership", "Sole Proprietorship", "Other"
]);

export type EntityType = z.infer<typeof entityTypeEnum>;

export const legalEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: entityTypeEnum,
  ein: z.string().optional(), // Tax ID
  stateOfFormation: z.string().optional(),
  dateFormed: z.string().optional(),
  description: z.string().optional(),
  ownershipPercentage: z.number().min(0).max(100).default(100), // User's ownership %
  totalValue: z.number().default(0), // Calculated from assets
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type LegalEntity = z.infer<typeof legalEntitySchema>;

export const insertLegalEntitySchema = legalEntitySchema.omit({ 
  id: true, 
  totalValue: true,
  createdAt: true, 
  updatedAt: true 
});

export type InsertLegalEntity = z.infer<typeof insertLegalEntitySchema>;

// ============================================
// ESTATE & BENEFICIARY VAULT
// ============================================

export const relationshipEnum = z.enum([
  "Spouse", "Child", "Parent", "Sibling", "Grandchild", 
  "Friend", "Charity", "Trust", "Other"
]);

export type Relationship = z.infer<typeof relationshipEnum>;

export const beneficiarySchema = z.object({
  id: z.string(),
  name: z.string(),
  relationship: relationshipEnum,
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  allocationPercentage: z.number().min(0).max(100),
  isPrimary: z.boolean().default(false),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Beneficiary = z.infer<typeof beneficiarySchema>;

export const insertBeneficiarySchema = beneficiarySchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type InsertBeneficiary = z.infer<typeof insertBeneficiarySchema>;

export const documentTypeEnum = z.enum([
  "Will", "Trust", "Power of Attorney", "Healthcare Directive",
  "Insurance Policy", "Account Credentials", "Property Deed",
  "Tax Return", "Other"
]);

export type DocumentType = z.infer<typeof documentTypeEnum>;

export const vaultDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: documentTypeEnum,
  description: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  encryptedContent: z.string().optional(), // For text-based secrets
  lastReviewed: z.string().optional(),
  expirationDate: z.string().optional(),
  linkedBeneficiaries: z.array(z.string()).optional(), // Beneficiary IDs
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type VaultDocument = z.infer<typeof vaultDocumentSchema>;

export const insertVaultDocumentSchema = vaultDocumentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVaultDocument = z.infer<typeof insertVaultDocumentSchema>;

export const estateSettingsSchema = z.object({
  inactivityPeriodDays: z.number().min(30).max(365).default(90),
  lastActivity: z.string(),
  emergencyContacts: z.array(z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
  })),
  notificationMessage: z.string().optional(),
  isEnabled: z.boolean().default(false),
});

export type EstateSettings = z.infer<typeof estateSettingsSchema>;

// ============================================
// MULTIPLAYER / FAMILY MODE
// ============================================

export const householdRoleEnum = z.enum(["owner", "editor", "viewer"]);
export type HouseholdRole = z.infer<typeof householdRoleEnum>;

export const householdSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdBy: z.string(), // User ID
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Household = z.infer<typeof householdSchema>;

export const householdMemberSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  userId: z.string(),
  role: householdRoleEnum,
  email: z.string().email(),
  displayName: z.string(),
  joinedAt: z.string(),
  invitedBy: z.string().optional(),
  status: z.enum(["pending", "active", "inactive"]),
});

export type HouseholdMember = z.infer<typeof householdMemberSchema>;

export const householdInviteSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  email: z.string().email(),
  role: householdRoleEnum,
  invitedBy: z.string(),
  expiresAt: z.string(),
  status: z.enum(["pending", "accepted", "declined", "expired"]),
  createdAt: z.string(),
});

export type HouseholdInvite = z.infer<typeof householdInviteSchema>;

export const activityLogSchema = z.object({
  id: z.string(),
  householdId: z.string().optional(),
  userId: z.string(),
  userName: z.string(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().optional(),
  details: z.string().optional(),
  timestamp: z.string(),
});

export type ActivityLog = z.infer<typeof activityLogSchema>;

// ============================================
// AI FINANCIAL ASSISTANT
// ============================================

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatConversationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().optional(),
  messages: z.array(chatMessageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ChatConversation = z.infer<typeof chatConversationSchema>;

export const aiQuerySchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
  includePortfolioContext: z.boolean().default(true),
});

export type AIQuery = z.infer<typeof aiQuerySchema>;

export const aiResponseSchema = z.object({
  response: z.string(),
  conversationId: z.string(),
  suggestedActions: z.array(z.object({
    label: z.string(),
    action: z.string(),
    params: z.record(z.string(), z.any()).optional(),
  })).optional(),
});

export type AIResponse = z.infer<typeof aiResponseSchema>;

// Demo data for alternative assets
export const demoRealEstate: RealEstate[] = [
  {
    id: "re-1",
    propertyAddress: "123 Main Street, San Francisco, CA 94102",
    propertyName: "Primary Residence",
    propertyType: "Primary Residence",
    estimatedValue: 1250000,
    purchasePrice: 950000,
    purchaseDate: "2019-06-15",
    mortgageBalance: 680000,
    monthlyPayment: 4200,
    interestRate: 3.25,
    lender: "Wells Fargo",
    notes: "3BR/2BA Victorian home",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const demoCryptoAssets: CryptoAsset[] = [
  {
    id: "crypto-1",
    symbol: "BTC",
    name: "Bitcoin",
    quantity: 0.5,
    costBasis: 15000,
    currentPrice: 42000,
    currentValue: 21000,
    walletName: "Ledger Nano X",
    exchange: "Coinbase",
    isNFT: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "crypto-2",
    symbol: "ETH",
    name: "Ethereum",
    quantity: 5,
    costBasis: 8000,
    currentPrice: 2200,
    currentValue: 11000,
    walletName: "MetaMask",
    exchange: "Kraken",
    isNFT: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const demoCollectibles: Collectible[] = [
  {
    id: "coll-1",
    name: "Rolex Submariner Date",
    category: "Watches",
    description: "Ref. 126610LN, purchased new",
    estimatedValue: 15000,
    purchasePrice: 9500,
    purchaseDate: "2021-03-20",
    condition: "Excellent",
    insured: true,
    insuranceValue: 15000,
    location: "Home safe",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const demoAlternativeInvestments: AlternativeInvestment[] = [
  {
    id: "alt-1",
    name: "Tech Growth Fund III",
    type: "Venture Capital",
    manager: "Horizon Ventures",
    committedCapital: 100000,
    calledCapital: 75000,
    currentNAV: 92000,
    distributions: 0,
    vintage: "2022",
    investmentDate: "2022-01-15",
    expectedMaturity: "2032-01-15",
    irr: 12.5,
    multiple: 1.23,
    notes: "Early-stage tech focus",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

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

export const demoFinancialInstitutions: FinancialInstitution[] = [
  {
    id: "inst-1",
    name: "Chase",
    logoUrl: undefined,
    primaryColor: "#1E3A8A",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "inst-2",
    name: "Capital One",
    logoUrl: undefined,
    primaryColor: "#B91C1C",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "inst-3",
    name: "Affirm",
    logoUrl: undefined,
    primaryColor: "#16A34A",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const demoFinancialAccounts: FinancialAccount[] = [
  {
    id: "acct-1",
    userId: "user-1",
    institutionId: "inst-1",
    name: "Chase Checking",
    type: "checking",
    subtype: "Everyday Checking",
    mask: "1234",
    balance: 4250.75,
    available: 4200.75,
    creditLimit: undefined,
    interestRate: undefined,
    currency: "USD",
    isShared: true,
    syncStatus: "mock",
    lastSyncedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "acct-2",
    userId: "user-1",
    institutionId: "inst-2",
    name: "Capital One Savor",
    type: "credit",
    subtype: "Rewards",
    mask: "5678",
    balance: -890.12,
    available: undefined,
    creditLimit: 5000,
    interestRate: 19.99,
    currency: "USD",
    isShared: false,
    syncStatus: "mock",
    lastSyncedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "acct-3",
    userId: "user-1",
    institutionId: "inst-3",
    name: "Affirm Purchase Plan",
    type: "bnpl",
    subtype: "Installment",
    mask: "9012",
    balance: -320.00,
    available: undefined,
    creditLimit: undefined,
    interestRate: 9.99,
    currency: "USD",
    isShared: false,
    syncStatus: "mock",
    lastSyncedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const demoTransactionCategories: TransactionCategory[] = [
  {
    id: "cat-1",
    name: "Groceries",
    type: "expense",
    color: "#22C55E",
    icon: "shopping-cart",
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cat-2",
    name: "Dining Out",
    type: "expense",
    color: "#F97316",
    icon: "utensils",
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cat-3",
    name: "Rent",
    type: "expense",
    color: "#3B82F6",
    icon: "home",
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cat-4",
    name: "Salary",
    type: "income",
    color: "#16A34A",
    icon: "briefcase",
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cat-5",
    name: "Utilities",
    type: "expense",
    color: "#0EA5E9",
    icon: "plug",
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const demoTransactionTags: TransactionTag[] = [
  {
    id: "tag-1",
    name: "Business",
    color: "#6366F1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tag-2",
    name: "Family",
    color: "#EC4899",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const demoCategoryRules: CategoryRule[] = [
  {
    id: "rule-1",
    pattern: "joe's grill|joes grill|grill",
    categoryId: "cat-2",
    confidence: 0.82,
    acceptedCount: 9,
    rejectedCount: 2,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rule-2",
    pattern: "target",
    categoryId: "cat-1",
    confidence: 0.65,
    acceptedCount: 13,
    rejectedCount: 7,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const demoTransactions: Transaction[] = [
  {
    id: "txn-1",
    accountId: "acct-1",
    date: new Date().toISOString(),
    name: "Target #1187",
    merchantName: "Target",
    amount: -60,
    direction: "debit",
    categoryId: "cat-1",
    tags: ["tag-2"],
    isPending: false,
    isSplit: true,
    splits: [
      { id: "split-1", transactionId: "txn-1", categoryId: "cat-1", amount: -40, notes: "Groceries" },
      { id: "split-2", transactionId: "txn-1", categoryId: "cat-5", amount: -20, notes: "Household" },
    ],
    notes: "Weekly run",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "txn-2",
    accountId: "acct-1",
    date: new Date().toISOString(),
    name: "Joe's Grill",
    merchantName: "Joe's Grill",
    amount: -42.5,
    direction: "debit",
    categoryId: "cat-2",
    tags: [],
    isPending: false,
    isSplit: false,
    splits: undefined,
    notes: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "txn-3",
    accountId: "acct-1",
    date: new Date().toISOString(),
    name: "Acme Corp Payroll",
    merchantName: "Acme Corp",
    amount: 4200,
    direction: "credit",
    categoryId: "cat-4",
    tags: ["tag-1"],
    isPending: false,
    isSplit: false,
    splits: undefined,
    notes: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const demoBills: Bill[] = [
  {
    id: "bill-1",
    name: "Rent",
    amount: 2200,
    dueDate: new Date().toISOString().slice(0, 10),
    frequency: "monthly",
    categoryId: "cat-3",
    accountId: "acct-1",
    isAutoPay: true,
    reminderDaysBefore: [7, 3, 1],
    status: "scheduled",
    lastPaidDate: undefined,
    notes: "Due on the 1st",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "bill-2",
    name: "Electric",
    amount: 140,
    dueDate: new Date().toISOString().slice(0, 10),
    frequency: "monthly",
    categoryId: "cat-5",
    accountId: "acct-1",
    isAutoPay: false,
    reminderDaysBefore: [3, 1],
    status: "scheduled",
    lastPaidDate: undefined,
    notes: "Average estimate",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const demoSubscriptions: Subscription[] = [
  {
    id: "sub-1",
    name: "Netflix",
    amount: 15.99,
    cadence: "monthly",
    nextBillingDate: new Date().toISOString().slice(0, 10),
    lastBillingDate: undefined,
    categoryId: "cat-2",
    paymentAccountId: "acct-2",
    status: "active",
    notes: "Shared plan",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "sub-2",
    name: "Spotify",
    amount: 9.99,
    cadence: "monthly",
    nextBillingDate: new Date().toISOString().slice(0, 10),
    lastBillingDate: undefined,
    categoryId: "cat-2",
    paymentAccountId: "acct-2",
    status: "active",
    notes: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const demoSinkingFunds: SinkingFund[] = [
  {
    id: "fund-1",
    name: "Emergency Fund",
    targetAmount: 10000,
    currentAmount: 4200,
    monthlyContribution: 300,
    dueDate: undefined,
    categoryId: undefined,
    status: "active",
    notes: "3 months of expenses",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fund-2",
    name: "Vacation",
    targetAmount: 3500,
    currentAmount: 900,
    monthlyContribution: 200,
    dueDate: undefined,
    categoryId: undefined,
    status: "active",
    notes: "Italy 2026",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const demoDebtPlans: DebtPlan[] = [
  {
    id: "debt-1",
    name: "Debt Freedom Plan",
    method: "snowball",
    extraPayment: 150,
    debts: [
      {
        id: "debt-item-1",
        name: "Student Loan",
        balance: 18000,
        interestRate: 4.5,
        minimumPayment: 220,
        dueDate: undefined,
        accountId: undefined,
      },
      {
        id: "debt-item-2",
        name: "Credit Card",
        balance: 3200,
        interestRate: 18.9,
        minimumPayment: 95,
        dueDate: undefined,
        accountId: "acct-2",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const demoCashFlowScenarios: CashFlowScenario[] = [
  {
    id: "scenario-1",
    name: "New Car Loan",
    type: "debt",
    amount: 500,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: undefined,
    notes: "Estimate only",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
