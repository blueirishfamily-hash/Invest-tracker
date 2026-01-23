import {
  type User,
  type InsertUser,
  type Holding,
  type InsertHolding,
  type PortfolioMetrics,
  type BenchmarkData,
  type BenchmarkChartData,
  type IndustryAnalysis,
  type SectorAnalysis,
  type BreakdownAnalysis,
  type BubbleWarning,
  type NewsArticle,
  type StockData,
  type IndexData,
  type PlaidAccount,
  type InsertPlaidAccount,
  type RealEstate,
  type InsertRealEstate,
  type CryptoAsset,
  type InsertCryptoAsset,
  type Collectible,
  type InsertCollectible,
  type AlternativeInvestment,
  type InsertAlternativeInvestment,
  type NetWorthSummary,
  type FinancialInstitution,
  type InsertFinancialInstitution,
  type FinancialAccount,
  type InsertFinancialAccount,
  type TransactionCategory,
  type InsertTransactionCategory,
  type TransactionTag,
  type InsertTransactionTag,
  type Transaction,
  type InsertTransaction,
  type Bill,
  type InsertBill,
  type Subscription,
  type InsertSubscription,
  type SinkingFund,
  type InsertSinkingFund,
  type DebtPlan,
  type InsertDebtPlan,
  type CashFlowScenario,
  type InsertCashFlowScenario,
  type CategoryRule,
  type InsertCategoryRule,
  type Anomaly,
  type SecuritySettings,
  type UserPreferences,
  userPreferencesSchema,
  demoHoldings,
  demoRealEstate,
  demoCryptoAssets,
  demoCollectibles,
  demoAlternativeInvestments,
  demoFinancialInstitutions,
  demoFinancialAccounts,
  demoTransactionCategories,
  demoTransactionTags,
  demoCategoryRules,
  demoTransactions,
  demoBills,
  demoSubscriptions,
  demoSinkingFunds,
  demoDebtPlans,
  demoCashFlowScenarios,
} from "@shared/schema";
import { randomUUID } from "crypto";
import {
  fetchHistoricalData,
  fetchCurrentQuote,
  searchStock,
} from "./market-data";
import { updateCryptoAssetPrices } from "./coingecko";
import { db } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import {
  users,
  holdings,
  financialInstitutions,
  financialAccounts,
  transactionCategories,
  transactionTags,
  transactions,
  bills,
  subscriptions,
  sinkingFunds,
  debtPlans,
  cashFlowScenarios,
  categoryRules,
  realEstate,
  cryptoAssets,
  collectibles,
  alternativeInvestments,
  plaidAccounts,
  userPreferences,
  securitySettings,
  anomalies,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getHoldings(): Promise<Holding[]>;
  getHolding(id: string): Promise<Holding | undefined>;
  createHolding(holding: InsertHolding): Promise<Holding>;
  updateHolding(id: string, holding: Partial<InsertHolding>): Promise<Holding | undefined>;
  deleteHolding(id: string): Promise<boolean>;
  
  getPortfolioMetrics(): Promise<PortfolioMetrics>;
  getBenchmarkData(timeframe?: string): Promise<BenchmarkData>;
  getBenchmarkChartData(timeframe: string): Promise<BenchmarkChartData>;
  getIndustryAnalysis(): Promise<IndustryAnalysis[]>;
  getBubbleWarnings(): Promise<BubbleWarning[]>;
  getNewsArticles(): Promise<NewsArticle[]>;
  getStockData(query: string, timeframe: string): Promise<StockData | null>;
  getIndexData(indices: string[], timeframe: string): Promise<IndexData[]>;
  
  // Plaid Account methods
  createPlaidAccount(account: InsertPlaidAccount): Promise<PlaidAccount>;
  getPlaidAccounts(userId: string): Promise<PlaidAccount[]>;
  getPlaidAccount(id: string): Promise<PlaidAccount | undefined>;
  updatePlaidAccount(id: string, updates: Partial<InsertPlaidAccount>): Promise<PlaidAccount | undefined>;
  deletePlaidAccount(id: string): Promise<boolean>;

  // Real Estate methods
  getRealEstateProperties(): Promise<RealEstate[]>;
  getRealEstateProperty(id: string): Promise<RealEstate | undefined>;
  createRealEstateProperty(property: InsertRealEstate): Promise<RealEstate>;
  updateRealEstateProperty(id: string, updates: Partial<InsertRealEstate>): Promise<RealEstate | undefined>;
  deleteRealEstateProperty(id: string): Promise<boolean>;

  // Crypto Asset methods
  getCryptoAssets(): Promise<CryptoAsset[]>;
  getCryptoAsset(id: string): Promise<CryptoAsset | undefined>;
  createCryptoAsset(asset: InsertCryptoAsset): Promise<CryptoAsset>;
  updateCryptoAsset(id: string, updates: Partial<InsertCryptoAsset>): Promise<CryptoAsset | undefined>;
  deleteCryptoAsset(id: string): Promise<boolean>;

  // Collectible methods
  getCollectibles(): Promise<Collectible[]>;
  getCollectible(id: string): Promise<Collectible | undefined>;
  createCollectible(collectible: InsertCollectible): Promise<Collectible>;
  updateCollectible(id: string, updates: Partial<InsertCollectible>): Promise<Collectible | undefined>;
  deleteCollectible(id: string): Promise<boolean>;

  // Alternative Investment methods
  getAlternativeInvestments(): Promise<AlternativeInvestment[]>;
  getAlternativeInvestment(id: string): Promise<AlternativeInvestment | undefined>;
  createAlternativeInvestment(investment: InsertAlternativeInvestment): Promise<AlternativeInvestment>;
  updateAlternativeInvestment(id: string, updates: Partial<InsertAlternativeInvestment>): Promise<AlternativeInvestment | undefined>;
  deleteAlternativeInvestment(id: string): Promise<boolean>;

  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreferences>;
  updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences>;

  // Net Worth
  getNetWorthSummary(): Promise<NetWorthSummary>;

  // Financial Core
  getFinancialInstitutions(): Promise<FinancialInstitution[]>;
  createFinancialInstitution(institution: InsertFinancialInstitution): Promise<FinancialInstitution>;
  updateFinancialInstitution(id: string, updates: Partial<InsertFinancialInstitution>): Promise<FinancialInstitution | undefined>;
  deleteFinancialInstitution(id: string): Promise<boolean>;

  getFinancialAccounts(userId?: string): Promise<FinancialAccount[]>;
  createFinancialAccount(account: InsertFinancialAccount): Promise<FinancialAccount>;
  updateFinancialAccount(id: string, updates: Partial<InsertFinancialAccount>): Promise<FinancialAccount | undefined>;
  deleteFinancialAccount(id: string): Promise<boolean>;

  getTransactionCategories(): Promise<TransactionCategory[]>;
  createTransactionCategory(category: InsertTransactionCategory): Promise<TransactionCategory>;
  updateTransactionCategory(id: string, updates: Partial<InsertTransactionCategory>): Promise<TransactionCategory | undefined>;
  deleteTransactionCategory(id: string): Promise<boolean>;

  getTransactionTags(): Promise<TransactionTag[]>;
  createTransactionTag(tag: InsertTransactionTag): Promise<TransactionTag>;
  updateTransactionTag(id: string, updates: Partial<InsertTransactionTag>): Promise<TransactionTag | undefined>;
  deleteTransactionTag(id: string): Promise<boolean>;

  getTransactions(filters?: { accountId?: string; startDate?: string; endDate?: string }): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: string): Promise<boolean>;

  getBills(): Promise<Bill[]>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: string, updates: Partial<InsertBill>): Promise<Bill | undefined>;
  deleteBill(id: string): Promise<boolean>;

  getSubscriptions(): Promise<Subscription[]>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  deleteSubscription(id: string): Promise<boolean>;

  getSinkingFunds(): Promise<SinkingFund[]>;
  createSinkingFund(fund: InsertSinkingFund): Promise<SinkingFund>;
  updateSinkingFund(id: string, updates: Partial<InsertSinkingFund>): Promise<SinkingFund | undefined>;
  deleteSinkingFund(id: string): Promise<boolean>;

  getDebtPlans(): Promise<DebtPlan[]>;
  createDebtPlan(plan: InsertDebtPlan): Promise<DebtPlan>;
  updateDebtPlan(id: string, updates: Partial<InsertDebtPlan>): Promise<DebtPlan | undefined>;
  deleteDebtPlan(id: string): Promise<boolean>;

  getCashFlowScenarios(): Promise<CashFlowScenario[]>;
  createCashFlowScenario(scenario: InsertCashFlowScenario): Promise<CashFlowScenario>;
  updateCashFlowScenario(id: string, updates: Partial<InsertCashFlowScenario>): Promise<CashFlowScenario | undefined>;
  deleteCashFlowScenario(id: string): Promise<boolean>;

  getCategoryRules(): Promise<CategoryRule[]>;
  createCategoryRule(rule: InsertCategoryRule): Promise<CategoryRule>;
  updateCategoryRule(id: string, updates: Partial<InsertCategoryRule>): Promise<CategoryRule | undefined>;
  deleteCategoryRule(id: string): Promise<boolean>;

  getAnomalies(): Promise<Anomaly[]>;
  setAnomalies(anomalies: Anomaly[]): Promise<void>;

  getSecuritySettings(userId: string): Promise<SecuritySettings>;
  updateSecuritySettings(userId: string, updates: Partial<SecuritySettings>): Promise<SecuritySettings>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private holdings: Map<string, Holding>;
  private plaidAccounts: Map<string, PlaidAccount>;
  private realEstateProperties: Map<string, RealEstate>;
  private cryptoAssets: Map<string, CryptoAsset>;
  private collectibles: Map<string, Collectible>;
  private alternativeInvestments: Map<string, AlternativeInvestment>;
  private userPreferences: Map<string, UserPreferences>;
  private financialInstitutions: Map<string, FinancialInstitution>;
  private financialAccounts: Map<string, FinancialAccount>;
  private transactionCategories: Map<string, TransactionCategory>;
  private transactionTags: Map<string, TransactionTag>;
  private transactions: Map<string, Transaction>;
  private bills: Map<string, Bill>;
  private subscriptions: Map<string, Subscription>;
  private sinkingFunds: Map<string, SinkingFund>;
  private debtPlans: Map<string, DebtPlan>;
  private cashFlowScenarios: Map<string, CashFlowScenario>;
  private categoryRules: Map<string, CategoryRule>;
  private anomalies: Anomaly[];
  private securitySettings: Map<string, SecuritySettings>;

  constructor() {
    this.users = new Map();
    this.holdings = new Map();
    this.plaidAccounts = new Map();
    this.realEstateProperties = new Map();
    this.cryptoAssets = new Map();
    this.collectibles = new Map();
    this.alternativeInvestments = new Map();
    this.userPreferences = new Map();
    this.financialInstitutions = new Map();
    this.financialAccounts = new Map();
    this.transactionCategories = new Map();
    this.transactionTags = new Map();
    this.transactions = new Map();
    this.bills = new Map();
    this.subscriptions = new Map();
    this.sinkingFunds = new Map();
    this.debtPlans = new Map();
    this.cashFlowScenarios = new Map();
    this.categoryRules = new Map();
    this.anomalies = [];
    this.securitySettings = new Map();
    
    // Initialize with demo data
    for (const holding of demoHoldings) {
      this.holdings.set(holding.id, holding);
    }
    for (const property of demoRealEstate) {
      this.realEstateProperties.set(property.id, property);
    }
    for (const crypto of demoCryptoAssets) {
      this.cryptoAssets.set(crypto.id, crypto);
    }
    for (const collectible of demoCollectibles) {
      this.collectibles.set(collectible.id, collectible);
    }
    for (const investment of demoAlternativeInvestments) {
      this.alternativeInvestments.set(investment.id, investment);
    }
    for (const institution of demoFinancialInstitutions) {
      this.financialInstitutions.set(institution.id, institution);
    }
    for (const account of demoFinancialAccounts) {
      this.financialAccounts.set(account.id, account);
    }
    for (const category of demoTransactionCategories) {
      this.transactionCategories.set(category.id, category);
    }
    for (const tag of demoTransactionTags) {
      this.transactionTags.set(tag.id, tag);
    }
    for (const rule of demoCategoryRules) {
      this.categoryRules.set(rule.id, rule);
    }
    for (const transaction of demoTransactions) {
      this.transactions.set(transaction.id, transaction);
    }
    for (const bill of demoBills) {
      this.bills.set(bill.id, bill);
    }
    for (const subscription of demoSubscriptions) {
      this.subscriptions.set(subscription.id, subscription);
    }
    for (const fund of demoSinkingFunds) {
      this.sinkingFunds.set(fund.id, fund);
    }
    for (const plan of demoDebtPlans) {
      this.debtPlans.set(plan.id, plan);
    }
    for (const scenario of demoCashFlowScenarios) {
      this.cashFlowScenarios.set(scenario.id, scenario);
    }
  }

  private getDefaultPreferences(): UserPreferences {
    return userPreferencesSchema.parse({});
  }

  private getDefaultSecuritySettings(): SecuritySettings {
    return {
      mfaEnabled: false,
      biometricEnabled: false,
      encryptionEnabled: true,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const existing = this.userPreferences.get(userId);
    if (existing) return existing;
    const defaults = this.getDefaultPreferences();
    this.userPreferences.set(userId, defaults);
    return defaults;
  }

  async updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getUserPreferences(userId);
    const merged = userPreferencesSchema.parse({ ...current, ...updates });
    this.userPreferences.set(userId, merged);
    return merged;
  }

  async getHoldings(): Promise<Holding[]> {
    // First, get holdings from Plaid accounts if any exist
    const userId = "default-user-id"; // In production, get from session
    const plaidAccounts = await this.getPlaidAccounts(userId);
    
    // If there are Plaid accounts, prioritize their holdings
    // For now, merge both sources (Plaid holdings override demo holdings)
    const holdingsMap = new Map<string, Holding>();
    
    // Add demo holdings first (as fallback)
    const demoHoldingsList = Array.from(this.holdings.values());
    for (const holding of demoHoldingsList) {
      holdingsMap.set(holding.id, holding);
    }
    
    // Add/override with Plaid holdings (those that start with accountId-)
    const plaidHoldings = Array.from(this.holdings.values()).filter(
      (h) => h.id.includes("-") && plaidAccounts.some((account) => h.id.startsWith(`${account.id}-`))
    );
    for (const holding of plaidHoldings) {
      holdingsMap.set(holding.id, holding);
    }
    
    const holdings = Array.from(holdingsMap.values());
    
    // Update holdings with real current prices (async, non-blocking)
    this.updateHoldingsPrices(holdings).catch((error) => {
      console.error("Error updating holdings prices:", error);
    });

    return holdings;
  }

  /**
   * Updates holdings with real current prices from market data
   * This runs in the background and updates prices asynchronously
   */
  private async updateHoldingsPrices(holdings: Holding[]): Promise<void> {
    for (const holding of holdings) {
      try {
        const quote = await fetchCurrentQuote(holding.ticker);
        if (quote && quote.price !== holding.currentPrice) {
          // Calculate growth rate based on price change
          const priceChange = ((quote.price - holding.currentPrice) / holding.currentPrice) * 100;
          
          // Update holding price and growth rate
          const updated: Holding = {
            ...holding,
            currentPrice: quote.price,
            currentValue: holding.quantity * quote.price,
            growthRate30d: priceChange, // Simplified - in production would calculate actual 30d growth
          };
          
          this.holdings.set(holding.id, updated);
        }
      } catch (error) {
        // Silently fail for individual holdings
        console.error(`Error updating price for ${holding.ticker}:`, error);
      }
    }
  }

  async getHolding(id: string): Promise<Holding | undefined> {
    return this.holdings.get(id);
  }

  async createHolding(insertHolding: InsertHolding): Promise<Holding> {
    const id = randomUUID();
    const holding: Holding = { ...insertHolding, id };
    this.holdings.set(id, holding);
    return holding;
  }

  async updateHolding(
    id: string,
    updates: Partial<InsertHolding>
  ): Promise<Holding | undefined> {
    const existing = this.holdings.get(id);
    if (!existing) return undefined;

    const updated: Holding = { ...existing, ...updates };
    this.holdings.set(id, updated);
    return updated;
  }

  async deleteHolding(id: string): Promise<boolean> {
    return this.holdings.delete(id);
  }

  async getPortfolioMetrics(): Promise<PortfolioMetrics> {
    const holdings = await this.getHoldings();
    const cryptoAssets = await this.getCryptoAssets();

    // Calculate from holdings
    const holdingsValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const holdingsCostBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);
    
    // Calculate from crypto
    const cryptoValue = cryptoAssets.reduce((sum, c) => sum + c.currentValue, 0);
    const cryptoCostBasis = cryptoAssets.reduce((sum, c) => sum + c.costBasis, 0);
    
    // Combined totals
    const totalValue = holdingsValue + cryptoValue;
    const totalCostBasis = holdingsCostBasis + cryptoCostBasis;
    const totalReturn = totalValue - totalCostBasis;
    const totalReturnPercent =
      totalCostBasis > 0 ? (totalReturn / totalCostBasis) * 100 : 0;
    const timeWeightedReturn =
      totalCostBasis > 0 ? ((totalValue / totalCostBasis) - 1) * 100 : 0;

    return {
      totalValue,
      totalCostBasis,
      totalReturn,
      totalReturnPercent,
      timeWeightedReturn,
    };
  }

  async getBenchmarkData(timeframe: string = "1M"): Promise<BenchmarkData> {
    const holdings = await this.getHoldings();
    const cryptoAssets = await this.getCryptoAssets();

    // Calculate weighted average growth from holdings and crypto
    const holdingsTotal = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const cryptoTotal = cryptoAssets.reduce((sum, c) => sum + c.currentValue, 0);
    const totalPortfolioValue = holdingsTotal + cryptoTotal;

    let portfolioGrowth = 0;
    if (totalPortfolioValue > 0) {
      // Weight holdings growth by their value
      const holdingsWeightedGrowth = holdings.reduce((sum, h) => {
        const weight = h.currentValue / totalPortfolioValue;
        return sum + (h.growthRate30d * weight);
      }, 0);
      
      // For crypto, approximate growth from current vs cost basis (30-day approximation)
      const cryptoWeightedGrowth = cryptoAssets.reduce((sum, c) => {
        const weight = c.currentValue / totalPortfolioValue;
        const cryptoGrowth = c.costBasis > 0 ? ((c.currentValue - c.costBasis) / c.costBasis) * 100 : 0;
        // Approximate 30-day growth (this is a simplification)
        const crypto30dGrowth = cryptoGrowth / 12; // Rough monthly approximation
        return sum + (crypto30dGrowth * weight);
      }, 0);
      
      portfolioGrowth = holdingsWeightedGrowth + cryptoWeightedGrowth;
    }

    // Fetch real S&P 500 data
    let spyGrowth = 3.8;
    let spyCurrentPrice = 512.45;

    try {
      const spyQuote = await fetchCurrentQuote("SPY");
      if (spyQuote) {
        spyCurrentPrice = spyQuote.price;
      }

      // Fetch historical data to calculate growth for the timeframe
      const spyHistorical = await fetchHistoricalData("SPY", timeframe);
      if (spyHistorical && spyHistorical.length >= 2) {
        const startPrice = spyHistorical[0].price;
        const endPrice = spyHistorical[spyHistorical.length - 1].price;
        spyGrowth = ((endPrice - startPrice) / startPrice) * 100;
      }
    } catch (error) {
      console.error("Error fetching S&P 500 data, using fallback:", error);
      // Use fallback values if API fails
    }

    return {
      portfolioGrowth,
      spyGrowth,
      spyCurrentPrice,
    };
  }

  async getBenchmarkChartData(timeframe: string): Promise<BenchmarkChartData> {
    try {
      // Fetch real SPY historical data
      const spyHistorical = await fetchHistoricalData("SPY", timeframe);
      
      // For portfolio, we need to calculate weighted average of holdings
      // For now, use simulated data with real growth rate
      const holdings = await this.getHoldings();
      const portfolioGrowth =
        holdings.length > 0
          ? holdings.reduce((sum, h) => sum + h.growthRate30d, 0) / holdings.length
          : 0;

      // Generate portfolio data (we can enhance this later to fetch real data for each holding)
      const portfolioData = this.generateHistoricalDataForBenchmark(
        portfolioGrowth,
        timeframe,
        spyHistorical?.length || 30
      );

      // Use real SPY data or fallback
      const spyData = spyHistorical || this.generateHistoricalDataForBenchmark(
        3.8,
        timeframe,
        30
      );

      return {
        portfolio: portfolioData.map((point) => ({
          date: point.date,
          value: point.price,
        })),
        spy: spyData.map((point) => ({
          date: point.date,
          value: point.price,
        })),
      };
    } catch (error) {
      console.error("Error fetching benchmark chart data:", error);
      // Fallback to simulated data
      const holdings = await this.getHoldings();
      const portfolioGrowth =
        holdings.length > 0
          ? holdings.reduce((sum, h) => sum + h.growthRate30d, 0) / holdings.length
          : 0;

      const portfolioData = this.generateHistoricalDataForBenchmark(portfolioGrowth, timeframe, 30);
      const spyData = this.generateHistoricalDataForBenchmark(3.8, timeframe, 30);

      return {
        portfolio: portfolioData.map((point) => ({
          date: point.date,
          value: point.price,
        })),
        spy: spyData.map((point) => ({
          date: point.date,
          value: point.price,
        })),
      };
    }
  }

  private generateHistoricalDataForBenchmark(
    growthRate: number,
    timeframe: string,
    numPoints: number
  ): Array<{ date: string; price: number }> {
    const now = new Date();
    let daysBack = 30;

    switch (timeframe) {
      case "1D":
        daysBack = 1;
        break;
      case "5D":
        daysBack = 5;
        break;
      case "1M":
        daysBack = 30;
        break;
      case "3M":
        daysBack = 90;
        break;
      case "6M":
        daysBack = 180;
        break;
      case "YTD":
        const yearStart = new Date(now.getFullYear(), 0, 1);
        daysBack = Math.ceil((now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
        break;
      case "1Y":
        daysBack = 365;
        break;
      case "5Y":
        daysBack = 365 * 5;
        break;
      case "MAX":
        daysBack = 365 * 5;
        break;
    }

    const targetEnd = 100 * (1 + growthRate / 100);
    const historicalData: Array<{ date: string; price: number }> = [];
    
    // Generate data points with realistic variations
    for (let i = 0; i < numPoints; i++) {
      const daysAgo = daysBack - (daysBack / numPoints) * i;
      const date = new Date(now);
      date.setDate(date.getDate() - Math.round(daysAgo));

      const progress = i / (numPoints - 1);
      const basePrice = 100 + (targetEnd - 100) * progress;
      
      // Add realistic volatility
      const volatility = 0.01;
      const randomFactor = 1 + (Math.random() - 0.5) * volatility * 2;
      const price = basePrice * randomFactor;

      historicalData.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        price: Math.round(price * 100) / 100,
      });
    }

    // Index to start at 0 (calculate percentage change from first price)
    const firstPrice = historicalData[0]?.price || 100;
    return historicalData.map((point) => ({
      ...point,
      price: ((point.price - firstPrice) / firstPrice) * 100,
    }));
  }

  async getIndustryAnalysis(): Promise<IndustryAnalysis[]> {
    const holdings = await this.getHoldings();

    const industryMap = new Map<
      string,
      { totalValue: number; holdingsCount: number; growthSum: number }
    >();

    for (const holding of holdings) {
      const existing = industryMap.get(holding.industry) || {
        totalValue: 0,
        holdingsCount: 0,
        growthSum: 0,
      };

      industryMap.set(holding.industry, {
        totalValue: existing.totalValue + holding.currentValue,
        holdingsCount: existing.holdingsCount + 1,
        growthSum: existing.growthSum + holding.growthRate30d,
      });
    }

    const totalPortfolioValue = holdings.reduce(
      (sum, h) => sum + h.currentValue,
      0
    );

    const analysis: IndustryAnalysis[] = [];

    // Convert Map to Array to avoid iteration issues
    const industryArray: Array<[string, { totalValue: number; holdingsCount: number; growthSum: number }]> = [];
    industryMap.forEach((value, key) => {
      industryArray.push([key, value]);
    });

    for (const [industry, data] of industryArray) {
      analysis.push({
        industry,
        totalValue: data.totalValue,
        holdingsCount: data.holdingsCount,
        percentage:
          totalPortfolioValue > 0
            ? (data.totalValue / totalPortfolioValue) * 100
            : 0,
        averageGrowth: data.holdingsCount > 0 ? data.growthSum / data.holdingsCount : 0,
      });
    }

    return analysis.sort((a, b) => b.totalValue - a.totalValue);
  }

  async getSectorAnalysis(): Promise<SectorAnalysis[]> {
    const holdings = await this.getHoldings();

    const sectorMap = new Map<
      string,
      {
        totalValue: number;
        holdingsCount: number;
        growthSum: number;
        companies: Array<{ ticker: string; name: string; value: number; growth: number }>;
      }
    >();

    for (const holding of holdings) {
      const existing = sectorMap.get(holding.sector) || {
        totalValue: 0,
        holdingsCount: 0,
        growthSum: 0,
        companies: [],
      };

      existing.companies.push({
        ticker: holding.ticker,
        name: holding.name,
        value: holding.currentValue,
        growth: holding.growthRate30d,
      });

      sectorMap.set(holding.sector, {
        totalValue: existing.totalValue + holding.currentValue,
        holdingsCount: existing.holdingsCount + 1,
        growthSum: existing.growthSum + holding.growthRate30d,
        companies: existing.companies,
      });
    }

    const totalPortfolioValue = holdings.reduce(
      (sum, h) => sum + h.currentValue,
      0
    );

    const analysis: SectorAnalysis[] = [];

    // Convert Map to Array to avoid iteration issues
    const sectorArray: Array<[
      string,
      {
        totalValue: number;
        holdingsCount: number;
        growthSum: number;
        companies: Array<{ ticker: string; name: string; value: number; growth: number }>;
      }
    ]> = [];
    sectorMap.forEach((value, key) => {
      sectorArray.push([key, value]);
    });

    for (const [sector, data] of sectorArray) {
      // Calculate company percentages within sector (not portfolio)
      const sectorTotal = data.totalValue;
      const companies = data.companies.map((company) => ({
        ...company,
        percentage:
          sectorTotal > 0 ? (company.value / sectorTotal) * 100 : 0,
      }));

      analysis.push({
        sector,
        totalValue: data.totalValue,
        holdingsCount: data.holdingsCount,
        percentage:
          totalPortfolioValue > 0
            ? (data.totalValue / totalPortfolioValue) * 100
            : 0,
        averageGrowth: data.holdingsCount > 0 ? data.growthSum / data.holdingsCount : 0,
        companies,
      });
    }

    return analysis.sort((a, b) => b.totalValue - a.totalValue);
  }

  /**
   * Derives region from market/exchange name
   */
  private getRegionFromMarket(market: string | undefined): string {
    if (!market) return "Unknown";
    
    const marketUpper = market.toUpperCase();
    
    // US markets
    if (marketUpper.includes("NYSE") || marketUpper.includes("NASDAQ") || marketUpper.includes("AMEX") || 
        marketUpper.includes("OTC") || marketUpper.includes("US")) {
      return "US";
    }
    
    // European markets
    if (marketUpper.includes("LSE") || marketUpper.includes("XETR") || marketUpper.includes("EPA") || 
        marketUpper.includes("FWB") || marketUpper.includes("LON") || marketUpper.includes("EUR") ||
        marketUpper.includes("XPAR") || marketUpper.includes("MIL") || marketUpper.includes("AMS")) {
      return "Europe";
    }
    
    // Asian markets
    if (marketUpper.includes("TSE") || marketUpper.includes("HKG") || marketUpper.includes("SSE") ||
        marketUpper.includes("SZSE") || marketUpper.includes("NSE") || marketUpper.includes("BSE") ||
        marketUpper.includes("ASX") || marketUpper.includes("KRX") || marketUpper.includes("TWSE")) {
      return "Asia";
    }
    
    return "Unknown";
  }

  async getBreakdownAnalysis(
    field: "sector" | "account" | "currency" | "region" | "assetType"
  ): Promise<BreakdownAnalysis[]> {
    const holdings = await this.getHoldings();

    const categoryMap = new Map<
      string,
      {
        totalValue: number;
        holdingsCount: number;
        growthSum: number;
        items: Array<{ ticker: string; name: string; value: number; growth: number }>;
      }
    >();

    for (const holding of holdings) {
      // Get category value based on field
      let category: string;
      switch (field) {
        case "sector":
          category = holding.sector || "Unknown";
          break;
        case "account":
          category = holding.account || "Unknown";
          break;
        case "currency":
          category = holding.currency || "USD";
          break;
        case "region":
          // Use region field if available, otherwise derive from market
          category = holding.region || this.getRegionFromMarket(holding.market);
          break;
        case "assetType":
          category = holding.assetType || "Equity";
          break;
        default:
          category = "Unknown";
      }

      const existing = categoryMap.get(category) || {
        totalValue: 0,
        holdingsCount: 0,
        growthSum: 0,
        items: [],
      };

      existing.items.push({
        ticker: holding.ticker,
        name: holding.name,
        value: holding.currentValue,
        growth: holding.growthRate30d,
      });

      categoryMap.set(category, {
        totalValue: existing.totalValue + holding.currentValue,
        holdingsCount: existing.holdingsCount + 1,
        growthSum: existing.growthSum + holding.growthRate30d,
        items: existing.items,
      });
    }

    const totalPortfolioValue = holdings.reduce(
      (sum, h) => sum + h.currentValue,
      0
    );

    const analysis: BreakdownAnalysis[] = [];

    // Convert Map to Array
    const categoryArray: Array<[
      string,
      {
        totalValue: number;
        holdingsCount: number;
        growthSum: number;
        items: Array<{ ticker: string; name: string; value: number; growth: number }>;
      }
    ]> = [];
    categoryMap.forEach((value, key) => {
      categoryArray.push([key, value]);
    });

    for (const [category, data] of categoryArray) {
      // Calculate item percentages within category
      const categoryTotal = data.totalValue;
      const items = data.items.map((item) => ({
        ...item,
        percentage: categoryTotal > 0 ? (item.value / categoryTotal) * 100 : 0,
      }));

      analysis.push({
        category,
        totalValue: data.totalValue,
        holdingsCount: data.holdingsCount,
        percentage:
          totalPortfolioValue > 0
            ? (data.totalValue / totalPortfolioValue) * 100
            : 0,
        averageGrowth: data.holdingsCount > 0 ? data.growthSum / data.holdingsCount : 0,
        items,
      });
    }

    return analysis.sort((a, b) => b.totalValue - a.totalValue);
  }

  /**
   * Get historical performance data for selected categories
   */
  async getCategoryPerformance(
    type: "sector" | "account" | "currency" | "region" | "assetType",
    categories: string[],
    timeframe: string,
    returnType: "TWR" | "MWR" = "TWR"
  ): Promise<Array<{
    category: string;
    data: Array<{ date: string; value: number }>;
  }>> {
    const holdings = await this.getHoldings();
    
    // Calculate date range based on timeframe
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    
    // Check if timeframe is a calendar year (e.g., "2023")
    const yearMatch = timeframe.match(/^\d{4}$/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0], 10);
      startDate = new Date(year, 0, 1); // Jan 1
      endDate = new Date(year, 11, 31, 23, 59, 59); // Dec 31
    } else {
      // Relative timeframes
      switch (timeframe) {
        case "1D":
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 1);
          break;
        case "1W":
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
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
        case "1Y":
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        case "3Y":
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 3);
          break;
        case "5Y":
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 5);
          break;
        case "MAX":
          startDate = new Date(0);
          break;
        default:
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 1);
      }
    }

    // Group holdings by category
    const categoryHoldingsMap = new Map<string, Holding[]>();
    
    for (const holding of holdings) {
      let categoryValue: string;
      switch (type) {
        case "sector":
          categoryValue = holding.sector || "Unknown";
          break;
        case "account":
          categoryValue = holding.account || "Unknown";
          break;
        case "currency":
          categoryValue = holding.currency || "USD";
          break;
        case "region":
          categoryValue = holding.region || this.getRegionFromMarket(holding.market);
          break;
        case "assetType":
          categoryValue = holding.assetType || "Equity";
          break;
        default:
          categoryValue = "Unknown";
      }
      
      if (categories.includes(categoryValue)) {
        const existing = categoryHoldingsMap.get(categoryValue) || [];
        existing.push(holding);
        categoryHoldingsMap.set(categoryValue, existing);
      }
    }

    // Fetch historical data for each category
    const results: Array<{
      category: string;
      data: Array<{ date: string; value: number }>;
    }> = [];

    for (const category of categories) {
      const categoryHoldings = categoryHoldingsMap.get(category) || [];
      
      if (categoryHoldings.length === 0) {
        results.push({ category, data: [] });
        continue;
      }

      // Fetch historical data for all holdings in this category
      const historicalDataMap = new Map<string, number>(); // date -> total value
      
      // Get unique dates from all holdings
      const allDates = new Set<string>();
      
      for (const holding of categoryHoldings) {
        try {
          // Fetch raw historical data directly from Alpha Vantage to get ISO dates
          const { timeSeriesDailyAdjusted } = await import("./alpha-vantage");
          const fetchTimeframe = /^\d{4}$/.test(timeframe) ? "full" : (timeframe === "MAX" || timeframe === "5Y" || timeframe === "3Y" || timeframe === "1Y" ? "full" : "compact");
          
          const rawData = await timeSeriesDailyAdjusted(holding.ticker, fetchTimeframe);
          if (rawData && rawData.length > 0) {
            for (const point of rawData) {
              // Date is in YYYY-MM-DD format from Alpha Vantage
              const dateStr = point.date;
              const pointDate = new Date(dateStr + "T00:00:00"); // Set to midnight for consistent comparison
              const normalizedStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
              const normalizedEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
              
              if (pointDate >= normalizedStartDate && pointDate <= normalizedEndDate) {
                allDates.add(dateStr);
                
                const currentValue = historicalDataMap.get(dateStr) || 0;
                const holdingValue = (point.adjustedClose || point.close || 0) * holding.quantity;
                historicalDataMap.set(dateStr, currentValue + holdingValue);
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching historical data for ${holding.ticker}:`, error);
        }
      }

      // Convert to array and sort by date
      const data = Array.from(allDates)
        .sort()
        .map(date => ({
          date,
          value: historicalDataMap.get(date) || 0,
        }));

      if (data.length > 0) {
        let indexedData: Array<{ date: string; value: number }>;
        
        if (returnType === "TWR") {
          // TWR: Index to starting value (100) - time-weighted return
          const startValue = data[0].value;
          indexedData = data.map(point => ({
            date: point.date,
            value: startValue > 0 ? (point.value / startValue) * 100 : 100,
          }));
        } else {
          // MWR: Money-weighted return using cost basis
          // Calculate total cost basis for this category
          const totalCostBasis = categoryHoldings.reduce((sum, holding) => sum + holding.costBasis, 0);
          
          if (totalCostBasis > 0) {
            // MWR: Index based on cost basis (initial investment)
            // Value at any point = (currentValue / costBasis) * 100
            indexedData = data.map(point => ({
              date: point.date,
              value: (point.value / totalCostBasis) * 100,
            }));
          } else {
            // Fallback to TWR if no cost basis
            const startValue = data[0].value;
            indexedData = data.map(point => ({
              date: point.date,
              value: startValue > 0 ? (point.value / startValue) * 100 : 100,
            }));
          }
        }
        
        results.push({ category, data: indexedData });
      } else {
        results.push({ category, data: [] });
      }
    }

    return results;
  }

  async getHistoricalDistribution(
    type: "sector" | "account" | "currency" | "region" | "assetType",
    timeframe: string
  ): Promise<Array<{
    date: string;
    categories: Record<string, number>;
  }>> {
    const holdings = await this.getHoldings();
    
    // Calculate date range based on timeframe
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    
    // Check if timeframe is a calendar year (e.g., "2023")
    const yearMatch = timeframe.match(/^\d{4}$/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0], 10);
      startDate = new Date(year, 0, 1); // Jan 1
      endDate = new Date(year, 11, 31, 23, 59, 59); // Dec 31
    } else {
      // Relative timeframes
      switch (timeframe) {
        case "1D":
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 1);
          break;
        case "1W":
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
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
        case "1Y":
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        case "3Y":
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 3);
          break;
        case "5Y":
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 5);
          break;
        case "MAX":
          startDate = new Date(0);
          break;
        default:
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 1);
      }
    }

    // Calculate interval duration to show 4-5 bars
    const durationMs = endDate.getTime() - startDate.getTime();
    let intervalMs: number;
    let numBars: number;

    if (timeframe === "1D") {
      // Single bar for 1D
      numBars = 1;
      intervalMs = 0; // Use endDate only
    } else {
      // Target 4-5 bars, prefer 4
      numBars = 4;
      intervalMs = durationMs / (numBars - 1);
      
      // Round to sensible intervals
      const daysPerInterval = intervalMs / (1000 * 60 * 60 * 24);
      if (daysPerInterval < 2) {
        // Less than 2 days per interval - use days
        intervalMs = 1 * 24 * 60 * 60 * 1000; // 1 day
      } else if (daysPerInterval < 8) {
        // 2-7 days - use days (round to nearest day)
        intervalMs = Math.round(daysPerInterval) * 24 * 60 * 60 * 1000;
      } else if (daysPerInterval < 35) {
        // 1-5 weeks - use weeks (round to nearest week)
        intervalMs = Math.round(daysPerInterval / 7) * 7 * 24 * 60 * 60 * 1000;
      } else if (daysPerInterval < 100) {
        // 1-3 months - use months (round to nearest month, ~30 days)
        intervalMs = Math.round(daysPerInterval / 30) * 30 * 24 * 60 * 60 * 1000;
      } else if (daysPerInterval < 400) {
        // 3-13 months - use quarters (round to nearest quarter, ~90 days)
        intervalMs = Math.round(daysPerInterval / 90) * 90 * 24 * 60 * 60 * 1000;
      } else {
        // More than a year - use years (round to nearest year, ~365 days)
        intervalMs = Math.round(daysPerInterval / 365) * 365 * 24 * 60 * 60 * 1000;
      }
    }

    // Generate interval dates
    const intervalDates: Date[] = [];
    if (timeframe === "1D") {
      // Single point at end
      intervalDates.push(endDate);
    } else {
      // Start from startDate and add intervals
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        intervalDates.push(new Date(currentDate));
        if (intervalMs === 0) break;
        currentDate = new Date(currentDate.getTime() + intervalMs);
      }
      // Ensure we have endDate as the last point
      if (intervalDates.length === 0 || intervalDates[intervalDates.length - 1].getTime() < endDate.getTime() - (24 * 60 * 60 * 1000)) {
        intervalDates.push(endDate);
      }
    }

    // Group holdings by category
    const categoryMap = new Map<string, Holding[]>();
    
    for (const holding of holdings) {
      let categoryValue: string;
      switch (type) {
        case "sector":
          categoryValue = holding.sector || "Unknown";
          break;
        case "account":
          categoryValue = holding.account || "Unknown";
          break;
        case "currency":
          categoryValue = holding.currency || "USD";
          break;
        case "region":
          categoryValue = holding.region || this.getRegionFromMarket(holding.market);
          break;
        case "assetType":
          categoryValue = holding.assetType || "Equity";
          break;
        default:
          categoryValue = "Unknown";
      }
      
      const existing = categoryMap.get(categoryValue) || [];
      existing.push(holding);
      categoryMap.set(categoryValue, existing);
    }

    // Fetch historical data once per holding (more efficient)
    const holdingHistoricalData = new Map<string, Array<{
      date: string;
      price: number;
    }>>();

    for (const holding of holdings) {
      try {
        const { timeSeriesDailyAdjusted } = await import("./alpha-vantage");
        const fetchTimeframe = /^\d{4}$/.test(timeframe) || timeframe === "MAX" || timeframe === "5Y" || timeframe === "3Y" || timeframe === "1Y" ? "full" : "compact";
        
        const rawData = await timeSeriesDailyAdjusted(holding.ticker, fetchTimeframe);
        if (rawData && rawData.length > 0) {
          // Store price data indexed by date
          const priceMap = rawData.map(point => ({
            date: point.date,
            price: point.adjustedClose || point.close || 0,
          }));
          holdingHistoricalData.set(holding.ticker, priceMap);
        }
      } catch (error) {
        console.error(`Error fetching historical data for ${holding.ticker}:`, error);
      }
    }

    // Calculate distribution for each interval date
    const results: Array<{ date: string; categories: Record<string, number> }> = [];
    
    for (const intervalDate of intervalDates) {
      const categoryValues: Record<string, number> = {}; // category -> total value
      let totalPortfolioValue = 0;

      // For each category, calculate total value at this date
      for (const [category, categoryHoldings] of categoryMap.entries()) {
        let categoryValue = 0;

        for (const holding of categoryHoldings) {
          const historicalData = holdingHistoricalData.get(holding.ticker);
          if (historicalData && historicalData.length > 0) {
            // Find the closest date to intervalDate (before or equal to it)
            const intervalDateStr = intervalDate.toISOString().split('T')[0];
            let closestPrice = 0;
            let closestDateStr: string | null = null;
            
            for (const point of historicalData) {
              if (point.price > 0 && point.date <= intervalDateStr) {
                if (!closestDateStr || point.date > closestDateStr) {
                  closestDateStr = point.date;
                  closestPrice = point.price;
                }
              }
            }
            
            if (closestPrice > 0) {
              const holdingValue = closestPrice * holding.quantity;
              categoryValue += holdingValue;
            }
          }
        }

        if (categoryValue > 0) {
          categoryValues[category] = categoryValue;
          totalPortfolioValue += categoryValue;
        }
      }

      // Convert values to percentages
      const categories: Record<string, number> = {};
      for (const [category, value] of Object.entries(categoryValues)) {
        categories[category] = totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0;
      }

      results.push({
        date: intervalDate.toISOString().split('T')[0], // YYYY-MM-DD format
        categories,
      });
    }

    return results;
  }

  async getVIXData(timeframe: string): Promise<{
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    timestamp: string;
    historical: Array<{ date: string; value: number }>;
  } | null> {
    try {
      const { globalQuote, timeSeriesDailyAdjusted } = await import("./alpha-vantage");
      
      // Fetch current VIX quote
      const quote = await globalQuote("VIX");
      if (!quote || !quote.price) {
        return null;
      }

      // Fetch historical data
      const outputsize = timeframe === "5Y" || timeframe === "MAX" ? "full" : "compact";
      const historical = await timeSeriesDailyAdjusted("VIX", outputsize);

      if (!historical || historical.length === 0) {
        return null;
      }

      // Calculate start date based on timeframe
      const now = new Date();
      let startDate: Date;
      
      switch (timeframe) {
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
          startDate.setFullYear(startDate.getFullYear() - 1);
      }

      // Filter historical data to timeframe
      const filteredHistorical = historical
        .filter((item) => {
          const itemDate = new Date(item.date);
          return itemDate >= startDate && itemDate <= now;
        })
        .map((item) => ({
          date: item.date,
          value: item.adjustedClose || item.close,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Get previous close (second to last or last if only one point)
      const previousValue = filteredHistorical.length > 1
        ? filteredHistorical[filteredHistorical.length - 2].value
        : filteredHistorical[0]?.value || quote.price;

      const current = quote.price;
      const previous = previousValue;
      const change = current - previous;
      const changePercent = previous > 0 ? (change / previous) * 100 : 0;

      return {
        current,
        previous,
        change,
        changePercent,
        timestamp: new Date().toISOString(),
        historical: filteredHistorical,
      };
    } catch (error) {
      console.error("Error fetching VIX data:", error);
      return null;
    }
  }

  async getBubbleWarnings(): Promise<BubbleWarning[]> {
    const industries = await this.getIndustryAnalysis();
    const benchmark = await this.getBenchmarkData();

    const warnings: BubbleWarning[] = [];

    for (const industry of industries) {
      const concentrationThreshold = 30;
      const velocityThreshold = benchmark.spyGrowth * 1.5;

      const isConcentrated = industry.percentage > concentrationThreshold;
      const isHighVelocity = industry.averageGrowth > velocityThreshold;
      const isOverheating = isConcentrated && isHighVelocity;

      warnings.push({
        industry: industry.industry,
        concentration: industry.percentage,
        growthRate: industry.averageGrowth,
        spyGrowthRate: benchmark.spyGrowth,
        isOverheating,
      });
    }

    return warnings;
  }

  async getNewsArticles(): Promise<NewsArticle[]> {
    const holdings = await this.getHoldings();
    const articles: NewsArticle[] = [];

    // Generate mock news articles based on holdings
    const newsTemplates: Array<{
      ticker: string;
      name: string;
      sector: string;
      industry: string;
      positiveNews: Array<{ title: string; description: string; summary: string }>;
      negativeNews: Array<{ title: string; description: string; summary: string }>;
      neutralNews: Array<{ title: string; description: string; summary: string }>;
    }> = [
      {
        ticker: "AAPL",
        name: "Apple Inc.",
        sector: "Technology",
        industry: "Consumer Electronics",
        positiveNews: [
          {
            title: "Apple Reports Record iPhone Sales Amid Strong Demand",
            description: "Apple Inc. announced record-breaking iPhone sales in the latest quarter, driven by strong consumer demand for the latest models and expansion into emerging markets.",
            summary: "This news is relevant to Apple (AAPL) as it highlights strong product performance and revenue growth potential, which could positively impact stock valuation."
          },
          {
            title: "Apple Expands Services Business with New Subscriptions",
            description: "Apple's services division continues to grow with new subscription offerings, contributing significantly to recurring revenue streams.",
            summary: "Relevant to Apple's Technology sector positioning, showing diversification and sustainable revenue growth beyond hardware sales."
          }
        ],
        negativeNews: [
          {
            title: "Supply Chain Concerns Impact Apple Production Timelines",
            description: "Manufacturing delays due to supply chain disruptions may affect Apple's ability to meet high demand for its products in the coming quarters.",
            summary: "This impacts Apple (AAPL) directly as production delays could affect revenue targets and investor confidence in near-term performance."
          }
        ],
        neutralNews: [
          {
            title: "Apple Announces New R&D Investments in AI Technology",
            description: "The company plans significant investments in artificial intelligence research and development to enhance future product offerings.",
            summary: "Relevant to Apple's long-term strategy in the Technology sector, indicating forward-looking investments that may shape future competitiveness."
          }
        ]
      },
      {
        ticker: "MSFT",
        name: "Microsoft Corporation",
        sector: "Technology",
        industry: "Software—Infrastructure",
        positiveNews: [
          {
            title: "Microsoft Azure Cloud Services See Accelerated Growth",
            description: "Microsoft's cloud computing division reports accelerated adoption rates as enterprises migrate to cloud infrastructure solutions.",
            summary: "Directly relevant to Microsoft (MSFT) as Azure is a key growth driver in the Software—Infrastructure industry, impacting revenue and market position."
          }
        ],
        negativeNews: [
          {
            title: "Increased Competition in Cloud Market Puts Pressure on Margins",
            description: "Intensifying competition from other cloud providers may impact Microsoft's cloud service pricing and profit margins.",
            summary: "Affects Microsoft's competitive position in the Technology sector, potentially impacting market share and profitability in cloud services."
          }
        ],
        neutralNews: [
          {
            title: "Microsoft Partners with Major Enterprise Clients for Digital Transformation",
            description: "New strategic partnerships aim to help large enterprises modernize their IT infrastructure and processes.",
            summary: "Relevant to Microsoft's Software—Infrastructure business model, showing continued enterprise engagement and potential for future growth."
          }
        ]
      },
      {
        ticker: "GOOGL",
        name: "Alphabet Inc.",
        sector: "Communication Services",
        industry: "Internet Content & Information",
        positiveNews: [
          {
            title: "Google Search Revenue Grows Despite Market Challenges",
            description: "Alphabet's core search advertising business demonstrates resilience with steady revenue growth in the latest reporting period.",
            summary: "Relevant to Alphabet (GOOGL) as search advertising remains the primary revenue source, directly impacting the company's financial performance."
          }
        ],
        negativeNews: [
          {
            title: "Regulatory Scrutiny Intensifies for Tech Giants",
            description: "Increased regulatory oversight and potential antitrust actions could impact Alphabet's business operations and market dominance.",
            summary: "This affects Alphabet's position in the Communication Services sector, as regulatory changes may limit growth opportunities and require strategic adjustments."
          }
        ],
        neutralNews: [
          {
            title: "Alphabet Invests Heavily in AI Research and Development",
            description: "Significant investments in artificial intelligence capabilities aim to enhance search quality and develop new product offerings.",
            summary: "Relevant to Alphabet's long-term strategy in Internet Content & Information, indicating commitment to maintaining technological leadership."
          }
        ]
      },
      {
        ticker: "NVDA",
        name: "NVIDIA Corporation",
        sector: "Technology",
        industry: "Semiconductors",
        positiveNews: [
          {
            title: "NVIDIA AI Chips See Unprecedented Demand from Tech Companies",
            description: "Record demand for NVIDIA's AI and data center chips from major technology companies drives exceptional revenue growth.",
            summary: "Highly relevant to NVIDIA (NVDA) in the Semiconductors industry, as AI chip demand is a primary growth driver affecting stock performance."
          },
          {
            title: "NVIDIA Expands Manufacturing Capacity to Meet Growing Demand",
            description: "The company announces plans to significantly expand production capacity for its high-demand GPU and AI accelerator products.",
            summary: "This news directly impacts NVIDIA's ability to capitalize on the strong demand in the Technology sector's semiconductor segment."
          }
        ],
        negativeNews: [
          {
            title: "Semiconductor Supply Constraints May Affect NVIDIA Shipments",
            description: "Ongoing supply chain challenges in the semiconductor industry could impact NVIDIA's ability to fulfill orders in the short term.",
            summary: "Affects NVIDIA (NVDA) operations in the Semiconductors industry, potentially limiting revenue growth despite strong demand."
          }
        ],
        neutralNews: [
          {
            title: "NVIDIA Announces New Partnerships in Autonomous Vehicle Technology",
            description: "Strategic partnerships with automotive manufacturers aim to expand NVIDIA's presence in the autonomous driving market.",
            summary: "Relevant to NVIDIA's diversification strategy in the Technology sector, showing expansion beyond core GPU business into new markets."
          }
        ]
      },
      {
        ticker: "TSLA",
        name: "Tesla Inc.",
        sector: "Consumer Cyclical",
        industry: "Auto Manufacturers",
        positiveNews: [
          {
            title: "Tesla Reports Strong Delivery Numbers, Exceeds Expectations",
            description: "Tesla announces record vehicle deliveries for the quarter, surpassing analyst expectations and demonstrating strong execution.",
            summary: "Directly relevant to Tesla (TSLA) in the Auto Manufacturers industry, as delivery numbers are a key performance metric affecting investor sentiment."
          }
        ],
        negativeNews: [
          {
            title: "Increased Competition in EV Market Challenges Tesla's Dominance",
            description: "Growing competition from traditional automakers entering the electric vehicle space may impact Tesla's market share.",
            summary: "This affects Tesla's competitive position in the Consumer Cyclical sector, as increased competition could pressure pricing and market share."
          }
        ],
        neutralNews: [
          {
            title: "Tesla Expands Supercharger Network Globally",
            description: "Continued expansion of charging infrastructure aims to support growing EV adoption and improve customer experience.",
            summary: "Relevant to Tesla's strategy in the Auto Manufacturers industry, as charging infrastructure is critical for long-term EV adoption and customer retention."
          }
        ]
      }
    ];

    // Generate articles for each holding
    for (const holding of holdings) {
      const template = newsTemplates.find(t => t.ticker === holding.ticker);
      if (!template) continue;

      // Add positive news
      for (const news of template.positiveNews) {
        articles.push({
          id: randomUUID(),
          title: news.title,
          url: `https://example.com/news/${holding.ticker.toLowerCase()}-${Date.now()}`,
          source: "Financial News Network",
          publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          description: news.description,
          sentiment: "positive",
          relevanceSummary: news.summary,
          relatedTicker: holding.ticker,
          relatedSector: holding.sector,
          relatedIndustry: holding.industry,
        });
      }

      // Add negative news
      for (const news of template.negativeNews) {
        articles.push({
          id: randomUUID(),
          title: news.title,
          url: `https://example.com/news/${holding.ticker.toLowerCase()}-${Date.now()}`,
          source: "Market Watch Daily",
          publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          description: news.description,
          sentiment: "negative",
          relevanceSummary: news.summary,
          relatedTicker: holding.ticker,
          relatedSector: holding.sector,
          relatedIndustry: holding.industry,
        });
      }

      // Add neutral news
      for (const news of template.neutralNews) {
        articles.push({
          id: randomUUID(),
          title: news.title,
          url: `https://example.com/news/${holding.ticker.toLowerCase()}-${Date.now()}`,
          source: "Business Insights",
          publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          description: news.description,
          sentiment: "neutral",
          relevanceSummary: news.summary,
          relatedTicker: holding.ticker,
          relatedSector: holding.sector,
          relatedIndustry: holding.industry,
        });
      }
    }

    // Sort by published date (newest first)
    return articles.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  async getStockData(query: string, timeframe: string): Promise<StockData | null> {
    try {
      // First try to search for the stock using Yahoo Finance
      const searchResult = await searchStock(query);
      
      if (!searchResult) {
        // Fallback to holdings if search fails
        const holdings = await this.getHoldings();
        const holding = holdings.find(
          (h) =>
            h.ticker.toUpperCase() === query.toUpperCase() ||
            h.name.toUpperCase().includes(query.toUpperCase())
        );

        if (!holding) {
          return null;
        }

        // Use simulated data as fallback
        const historicalData = this.generateHistoricalData(
          holding.currentPrice,
          holding.growthRate30d,
          timeframe
        );

        return {
          ticker: holding.ticker,
          name: holding.name,
          currentPrice: holding.currentPrice,
          sector: holding.sector,
          industry: holding.industry,
          historicalData,
        };
      }

      // Fetch real current quote and historical data
      const quote = await fetchCurrentQuote(searchResult.symbol);
      const historicalData = await fetchHistoricalData(searchResult.symbol, timeframe);

      if (!quote || !historicalData || historicalData.length === 0) {
        // Fallback to holdings if API fails
        const holdings = await this.getHoldings();
        const holding = holdings.find(
          (h) => h.ticker.toUpperCase() === searchResult.symbol.toUpperCase()
        );

        if (holding) {
          const fallbackData = this.generateHistoricalData(
            holding.currentPrice,
            holding.growthRate30d,
            timeframe
          );

          return {
            ticker: holding.ticker,
            name: holding.name,
            currentPrice: holding.currentPrice,
            sector: holding.sector,
            industry: holding.industry,
            historicalData: fallbackData,
          };
        }

        return null;
      }

      // Find sector/industry from holdings if available
      const holdings = await this.getHoldings();
      const holding = holdings.find(
        (h) => h.ticker.toUpperCase() === searchResult.symbol.toUpperCase()
      );

      return {
        ticker: searchResult.symbol,
        name: searchResult.name,
        currentPrice: quote.price,
        sector: holding?.sector,
        industry: holding?.industry,
        historicalData,
      };
    } catch (error) {
      console.error("Error fetching stock data:", error);
      // Fallback to holdings
      const holdings = await this.getHoldings();
      const holding = holdings.find(
        (h) =>
          h.ticker.toUpperCase() === query.toUpperCase() ||
          h.name.toUpperCase().includes(query.toUpperCase())
      );

      if (!holding) {
        return null;
      }

      const historicalData = this.generateHistoricalData(
        holding.currentPrice,
        holding.growthRate30d,
        timeframe
      );

      return {
        ticker: holding.ticker,
        name: holding.name,
        currentPrice: holding.currentPrice,
        sector: holding.sector,
        industry: holding.industry,
        historicalData,
      };
    }
  }

  async getIndexData(indices: string[], timeframe: string): Promise<IndexData[]> {
    const indexMap: Record<string, { name: string; basePrice: number; growth: number }> = {
      SPY: { name: "S&P 500", basePrice: 512.45, growth: 3.8 },
      DJI: { name: "DOW Jones", basePrice: 38500.0, growth: 3.5 },
      IXIC: { name: "Nasdaq Composite", basePrice: 16200.0, growth: 4.2 },
    };

    const results = await Promise.all(
      indices
        .filter((symbol) => indexMap[symbol])
        .map(async (symbol) => {
          try {
            // Fetch real historical data
            const historicalData = await fetchHistoricalData(symbol, timeframe);
            const quote = await fetchCurrentQuote(symbol);

            if (historicalData && historicalData.length > 0) {
              return {
                symbol,
                name: quote?.name || indexMap[symbol].name,
                historicalData,
              };
            }

            // Fallback to simulated data if API fails
            const index = indexMap[symbol];
            const fallbackData = this.generateHistoricalData(
              index.basePrice,
              index.growth,
              timeframe
            );

            return {
              symbol,
              name: index.name,
              historicalData: fallbackData,
            };
          } catch (error) {
            console.error(`Error fetching index data for ${symbol}:`, error);
            // Fallback to simulated data
            const index = indexMap[symbol];
            const fallbackData = this.generateHistoricalData(
              index.basePrice,
              index.growth,
              timeframe
            );

            return {
              symbol,
              name: index.name,
              historicalData: fallbackData,
            };
          }
        })
    );

    return results.filter(Boolean);
  }

  private generateHistoricalData(
    currentPrice: number,
    growthRate: number,
    timeframe: string
  ): Array<{ date: string; price: number }> {
    const now = new Date();
    let daysBack = 30;

    switch (timeframe) {
      case "1D":
        daysBack = 1;
        break;
      case "5D":
        daysBack = 5;
        break;
      case "1M":
        daysBack = 30;
        break;
      case "3M":
        daysBack = 90;
        break;
      case "6M":
        daysBack = 180;
        break;
      case "YTD":
        const yearStart = new Date(now.getFullYear(), 0, 1);
        daysBack = Math.ceil((now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
        break;
      case "1Y":
        daysBack = 365;
        break;
      case "5Y":
        daysBack = 365 * 5;
        break;
      case "MAX":
        daysBack = 365 * 5;
        break;
    }

    const historicalData: Array<{ date: string; price: number }> = [];
    const endPrice = currentPrice;
    const startPrice = endPrice / (1 + growthRate / 100);

    // Generate daily price points
    const numPoints = Math.min(daysBack, 365);
    for (let i = 0; i < numPoints; i++) {
      const daysAgo = daysBack - (daysBack / numPoints) * i;
      const date = new Date(now);
      date.setDate(date.getDate() - Math.round(daysAgo));

      // Linear interpolation with some randomness
      const progress = i / (numPoints - 1);
      const basePrice = startPrice + (endPrice - startPrice) * progress;
      
      // Add realistic volatility
      const volatility = 0.01; // 1% volatility
      const randomFactor = 1 + (Math.random() - 0.5) * volatility * 2;
      const price = basePrice * randomFactor;

      // Calculate percentage change from start price (indexed to 0)
      const percentChange = ((price - startPrice) / startPrice) * 100;

      historicalData.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        price: Math.round(percentChange * 100) / 100,
      });
    }

    return historicalData;
  }

  // Plaid Account methods
  async createPlaidAccount(account: InsertPlaidAccount): Promise<PlaidAccount> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const plaidAccount: PlaidAccount = {
      ...account,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.plaidAccounts.set(id, plaidAccount);
    return plaidAccount;
  }

  async getPlaidAccounts(userId: string): Promise<PlaidAccount[]> {
    return Array.from(this.plaidAccounts.values()).filter(
      (account) => account.userId === userId
    );
  }

  async getPlaidAccount(id: string): Promise<PlaidAccount | undefined> {
    return this.plaidAccounts.get(id);
  }

  async updatePlaidAccount(
    id: string,
    updates: Partial<InsertPlaidAccount>
  ): Promise<PlaidAccount | undefined> {
    const existing = this.plaidAccounts.get(id);
    if (!existing) return undefined;

    const updated: PlaidAccount = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.plaidAccounts.set(id, updated);
    return updated;
  }

  async deletePlaidAccount(id: string): Promise<boolean> {
    return this.plaidAccounts.delete(id);
  }

  // ============================================
  // REAL ESTATE METHODS
  // ============================================

  async getRealEstateProperties(): Promise<RealEstate[]> {
    return Array.from(this.realEstateProperties.values());
  }

  async getRealEstateProperty(id: string): Promise<RealEstate | undefined> {
    return this.realEstateProperties.get(id);
  }

  async createRealEstateProperty(property: InsertRealEstate): Promise<RealEstate> {
    const id = `re-${randomUUID()}`;
    const now = new Date().toISOString();
    const newProperty: RealEstate = {
      ...property,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.realEstateProperties.set(id, newProperty);
    return newProperty;
  }

  async updateRealEstateProperty(
    id: string,
    updates: Partial<InsertRealEstate>
  ): Promise<RealEstate | undefined> {
    const existing = this.realEstateProperties.get(id);
    if (!existing) return undefined;

    const updated: RealEstate = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.realEstateProperties.set(id, updated);
    return updated;
  }

  async deleteRealEstateProperty(id: string): Promise<boolean> {
    return this.realEstateProperties.delete(id);
  }

  // ============================================
  // CRYPTO ASSET METHODS
  // ============================================

  async getCryptoAssets(): Promise<CryptoAsset[]> {
    return Array.from(this.cryptoAssets.values());
  }

  async getCryptoAsset(id: string): Promise<CryptoAsset | undefined> {
    return this.cryptoAssets.get(id);
  }

  async createCryptoAsset(asset: InsertCryptoAsset): Promise<CryptoAsset> {
    const id = `crypto-${randomUUID()}`;
    const now = new Date().toISOString();
    
    // Ensure currentValue is calculated from quantity * currentPrice
    const calculatedValue = asset.quantity * asset.currentPrice;
    
    const newAsset: CryptoAsset = {
      ...asset,
      currentValue: calculatedValue,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.cryptoAssets.set(id, newAsset);
    return newAsset;
  }

  async updateCryptoAsset(
    id: string,
    updates: Partial<InsertCryptoAsset>
  ): Promise<CryptoAsset | undefined> {
    const existing = this.cryptoAssets.get(id);
    if (!existing) return undefined;

    const quantity = updates.quantity ?? existing.quantity;
    const currentPrice = updates.currentPrice ?? existing.currentPrice;
    
    // Recalculate currentValue if quantity or price changed
    const calculatedValue = quantity * currentPrice;

    const updated: CryptoAsset = {
      ...existing,
      ...updates,
      currentValue: calculatedValue,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.cryptoAssets.set(id, updated);
    return updated;
  }

  async deleteCryptoAsset(id: string): Promise<boolean> {
    return this.cryptoAssets.delete(id);
  }

  // ============================================
  // COLLECTIBLE METHODS
  // ============================================

  async getCollectibles(): Promise<Collectible[]> {
    return Array.from(this.collectibles.values());
  }

  async getCollectible(id: string): Promise<Collectible | undefined> {
    return this.collectibles.get(id);
  }

  async createCollectible(collectible: InsertCollectible): Promise<Collectible> {
    const id = `coll-${randomUUID()}`;
    const now = new Date().toISOString();
    const newCollectible: Collectible = {
      ...collectible,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.collectibles.set(id, newCollectible);
    return newCollectible;
  }

  async updateCollectible(
    id: string,
    updates: Partial<InsertCollectible>
  ): Promise<Collectible | undefined> {
    const existing = this.collectibles.get(id);
    if (!existing) return undefined;

    const updated: Collectible = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.collectibles.set(id, updated);
    return updated;
  }

  async deleteCollectible(id: string): Promise<boolean> {
    return this.collectibles.delete(id);
  }

  // ============================================
  // ALTERNATIVE INVESTMENT METHODS
  // ============================================

  async getAlternativeInvestments(): Promise<AlternativeInvestment[]> {
    return Array.from(this.alternativeInvestments.values());
  }

  async getAlternativeInvestment(id: string): Promise<AlternativeInvestment | undefined> {
    return this.alternativeInvestments.get(id);
  }

  async createAlternativeInvestment(
    investment: InsertAlternativeInvestment
  ): Promise<AlternativeInvestment> {
    const id = `alt-${randomUUID()}`;
    const now = new Date().toISOString();
    const newInvestment: AlternativeInvestment = {
      ...investment,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.alternativeInvestments.set(id, newInvestment);
    return newInvestment;
  }

  async updateAlternativeInvestment(
    id: string,
    updates: Partial<InsertAlternativeInvestment>
  ): Promise<AlternativeInvestment | undefined> {
    const existing = this.alternativeInvestments.get(id);
    if (!existing) return undefined;

    const updated: AlternativeInvestment = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.alternativeInvestments.set(id, updated);
    return updated;
  }

  async deleteAlternativeInvestment(id: string): Promise<boolean> {
    return this.alternativeInvestments.delete(id);
  }

  // ============================================
  // FINANCIAL CORE METHODS
  // ============================================

  async getFinancialInstitutions(): Promise<FinancialInstitution[]> {
    return Array.from(this.financialInstitutions.values());
  }

  async createFinancialInstitution(
    institution: InsertFinancialInstitution
  ): Promise<FinancialInstitution> {
    const id = `inst-${randomUUID()}`;
    const now = new Date().toISOString();
    const newInstitution: FinancialInstitution = {
      ...institution,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.financialInstitutions.set(id, newInstitution);
    return newInstitution;
  }

  async updateFinancialInstitution(
    id: string,
    updates: Partial<InsertFinancialInstitution>
  ): Promise<FinancialInstitution | undefined> {
    const existing = this.financialInstitutions.get(id);
    if (!existing) return undefined;
    const updated: FinancialInstitution = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.financialInstitutions.set(id, updated);
    return updated;
  }

  async deleteFinancialInstitution(id: string): Promise<boolean> {
    return this.financialInstitutions.delete(id);
  }

  async getFinancialAccounts(userId?: string): Promise<FinancialAccount[]> {
    const accounts = Array.from(this.financialAccounts.values());
    if (!userId) return accounts;
    return accounts.filter((account) => account.userId === userId);
  }

  async createFinancialAccount(
    account: InsertFinancialAccount
  ): Promise<FinancialAccount> {
    const id = `acct-${randomUUID()}`;
    const now = new Date().toISOString();
    const newAccount: FinancialAccount = {
      ...account,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.financialAccounts.set(id, newAccount);
    return newAccount;
  }

  async updateFinancialAccount(
    id: string,
    updates: Partial<InsertFinancialAccount>
  ): Promise<FinancialAccount | undefined> {
    const existing = this.financialAccounts.get(id);
    if (!existing) return undefined;
    const updated: FinancialAccount = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.financialAccounts.set(id, updated);
    return updated;
  }

  async deleteFinancialAccount(id: string): Promise<boolean> {
    return this.financialAccounts.delete(id);
  }

  async getTransactionCategories(): Promise<TransactionCategory[]> {
    return Array.from(this.transactionCategories.values());
  }

  async createTransactionCategory(
    category: InsertTransactionCategory
  ): Promise<TransactionCategory> {
    const id = `cat-${randomUUID()}`;
    const now = new Date().toISOString();
    const newCategory: TransactionCategory = {
      ...category,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.transactionCategories.set(id, newCategory);
    return newCategory;
  }

  async updateTransactionCategory(
    id: string,
    updates: Partial<InsertTransactionCategory>
  ): Promise<TransactionCategory | undefined> {
    const existing = this.transactionCategories.get(id);
    if (!existing) return undefined;
    const updated: TransactionCategory = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.transactionCategories.set(id, updated);
    return updated;
  }

  async deleteTransactionCategory(id: string): Promise<boolean> {
    return this.transactionCategories.delete(id);
  }

  async getTransactionTags(): Promise<TransactionTag[]> {
    return Array.from(this.transactionTags.values());
  }

  async createTransactionTag(
    tag: InsertTransactionTag
  ): Promise<TransactionTag> {
    const id = `tag-${randomUUID()}`;
    const now = new Date().toISOString();
    const newTag: TransactionTag = {
      ...tag,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.transactionTags.set(id, newTag);
    return newTag;
  }

  async updateTransactionTag(
    id: string,
    updates: Partial<InsertTransactionTag>
  ): Promise<TransactionTag | undefined> {
    const existing = this.transactionTags.get(id);
    if (!existing) return undefined;
    const updated: TransactionTag = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.transactionTags.set(id, updated);
    return updated;
  }

  async deleteTransactionTag(id: string): Promise<boolean> {
    return this.transactionTags.delete(id);
  }

  async getTransactions(filters?: {
    accountId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Transaction[]> {
    let transactions = Array.from(this.transactions.values());
    if (filters?.accountId) {
      transactions = transactions.filter((txn) => txn.accountId === filters.accountId);
    }
    if (filters?.startDate) {
      const start = new Date(filters.startDate).getTime();
      transactions = transactions.filter((txn) => new Date(txn.date).getTime() >= start);
    }
    if (filters?.endDate) {
      const end = new Date(filters.endDate).getTime();
      transactions = transactions.filter((txn) => new Date(txn.date).getTime() <= end);
    }
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = `txn-${randomUUID()}`;
    const now = new Date().toISOString();
    const newTransaction: Transaction = {
      ...transaction,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async updateTransaction(
    id: string,
    updates: Partial<InsertTransaction>
  ): Promise<Transaction | undefined> {
    const existing = this.transactions.get(id);
    if (!existing) return undefined;
    const updated: Transaction = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.transactions.set(id, updated);
    return updated;
  }

  async deleteTransaction(id: string): Promise<boolean> {
    return this.transactions.delete(id);
  }

  async getBills(): Promise<Bill[]> {
    return Array.from(this.bills.values());
  }

  async createBill(bill: InsertBill): Promise<Bill> {
    const id = `bill-${randomUUID()}`;
    const now = new Date().toISOString();
    const newBill: Bill = {
      ...bill,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.bills.set(id, newBill);
    return newBill;
  }

  async updateBill(
    id: string,
    updates: Partial<InsertBill>
  ): Promise<Bill | undefined> {
    const existing = this.bills.get(id);
    if (!existing) return undefined;
    const updated: Bill = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.bills.set(id, updated);
    return updated;
  }

  async deleteBill(id: string): Promise<boolean> {
    return this.bills.delete(id);
  }

  async getSubscriptions(): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values());
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const id = `sub-${randomUUID()}`;
    const now = new Date().toISOString();
    const newSubscription: Subscription = {
      ...subscription,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.subscriptions.set(id, newSubscription);
    return newSubscription;
  }

  async updateSubscription(
    id: string,
    updates: Partial<InsertSubscription>
  ): Promise<Subscription | undefined> {
    const existing = this.subscriptions.get(id);
    if (!existing) return undefined;
    const updated: Subscription = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.subscriptions.set(id, updated);
    return updated;
  }

  async deleteSubscription(id: string): Promise<boolean> {
    return this.subscriptions.delete(id);
  }

  async getSinkingFunds(): Promise<SinkingFund[]> {
    return Array.from(this.sinkingFunds.values());
  }

  async createSinkingFund(fund: InsertSinkingFund): Promise<SinkingFund> {
    const id = `fund-${randomUUID()}`;
    const now = new Date().toISOString();
    const newFund: SinkingFund = {
      ...fund,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.sinkingFunds.set(id, newFund);
    return newFund;
  }

  async updateSinkingFund(
    id: string,
    updates: Partial<InsertSinkingFund>
  ): Promise<SinkingFund | undefined> {
    const existing = this.sinkingFunds.get(id);
    if (!existing) return undefined;
    const updated: SinkingFund = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.sinkingFunds.set(id, updated);
    return updated;
  }

  async deleteSinkingFund(id: string): Promise<boolean> {
    return this.sinkingFunds.delete(id);
  }

  async getDebtPlans(): Promise<DebtPlan[]> {
    return Array.from(this.debtPlans.values());
  }

  async createDebtPlan(plan: InsertDebtPlan): Promise<DebtPlan> {
    const id = `debt-${randomUUID()}`;
    const now = new Date().toISOString();
    const newPlan: DebtPlan = {
      ...plan,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.debtPlans.set(id, newPlan);
    return newPlan;
  }

  async updateDebtPlan(
    id: string,
    updates: Partial<InsertDebtPlan>
  ): Promise<DebtPlan | undefined> {
    const existing = this.debtPlans.get(id);
    if (!existing) return undefined;
    const updated: DebtPlan = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.debtPlans.set(id, updated);
    return updated;
  }

  async deleteDebtPlan(id: string): Promise<boolean> {
    return this.debtPlans.delete(id);
  }

  async getCashFlowScenarios(): Promise<CashFlowScenario[]> {
    return Array.from(this.cashFlowScenarios.values());
  }

  async createCashFlowScenario(
    scenario: InsertCashFlowScenario
  ): Promise<CashFlowScenario> {
    const id = `scenario-${randomUUID()}`;
    const now = new Date().toISOString();
    const newScenario: CashFlowScenario = {
      ...scenario,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.cashFlowScenarios.set(id, newScenario);
    return newScenario;
  }

  async updateCashFlowScenario(
    id: string,
    updates: Partial<InsertCashFlowScenario>
  ): Promise<CashFlowScenario | undefined> {
    const existing = this.cashFlowScenarios.get(id);
    if (!existing) return undefined;
    const updated: CashFlowScenario = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.cashFlowScenarios.set(id, updated);
    return updated;
  }

  async deleteCashFlowScenario(id: string): Promise<boolean> {
    return this.cashFlowScenarios.delete(id);
  }

  async getCategoryRules(): Promise<CategoryRule[]> {
    return Array.from(this.categoryRules.values());
  }

  async createCategoryRule(rule: InsertCategoryRule): Promise<CategoryRule> {
    const id = `rule-${randomUUID()}`;
    const now = new Date().toISOString();
    const newRule: CategoryRule = {
      ...rule,
      id,
      confidence: 0.5, // Initial neutral confidence
      acceptedCount: 0,
      rejectedCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.categoryRules.set(id, newRule);
    return newRule;
  }

  async updateCategoryRule(
    id: string,
    updates: Partial<InsertCategoryRule>
  ): Promise<CategoryRule | undefined> {
    const existing = this.categoryRules.get(id);
    if (!existing) return undefined;
    
    // Prevent manual confidence updates - it's computed automatically
    const { confidence, ...allowedUpdates } = updates as any;
    
    // Use updated counts if provided, otherwise use existing counts
    const acceptedCount = (allowedUpdates as any).acceptedCount ?? existing.acceptedCount;
    const rejectedCount = (allowedUpdates as any).rejectedCount ?? existing.rejectedCount;
    
    const updated: CategoryRule = {
      ...existing,
      ...allowedUpdates,
      id,
      // Recalculate confidence based on acceptance rate using updated counts
      confidence: this.calculateConfidence(acceptedCount, rejectedCount),
      updatedAt: new Date().toISOString(),
    };
    this.categoryRules.set(id, updated);
    return updated;
  }

  // Calculate confidence from acceptance rate
  calculateConfidence(acceptedCount: number, rejectedCount: number): number {
    const total = acceptedCount + rejectedCount;
    if (total === 0) return 0.5; // Neutral starting point if no data
    return acceptedCount / total;
  }

  // Adjust rule confidence based on user acceptance/rejection
  async adjustRuleConfidence(ruleId: string, accepted: boolean): Promise<CategoryRule | undefined> {
    const existing = this.categoryRules.get(ruleId);
    if (!existing) return undefined;

    const newAcceptedCount = accepted ? existing.acceptedCount + 1 : existing.acceptedCount;
    const newRejectedCount = accepted ? existing.rejectedCount : existing.rejectedCount + 1;
    const newConfidence = this.calculateConfidence(newAcceptedCount, newRejectedCount);

    const updated: CategoryRule = {
      ...existing,
      acceptedCount: newAcceptedCount,
      rejectedCount: newRejectedCount,
      confidence: newConfidence,
      updatedAt: new Date().toISOString(),
    };
    this.categoryRules.set(ruleId, updated);
    return updated;
  }

  async deleteCategoryRule(id: string): Promise<boolean> {
    return this.categoryRules.delete(id);
  }

  async getAnomalies(): Promise<Anomaly[]> {
    return this.anomalies;
  }

  async setAnomalies(anomalies: Anomaly[]): Promise<void> {
    this.anomalies = anomalies;
  }

  async getSecuritySettings(userId: string): Promise<SecuritySettings> {
    const existing = this.securitySettings.get(userId);
    if (existing) return existing;
    const defaults = this.getDefaultSecuritySettings();
    this.securitySettings.set(userId, defaults);
    return defaults;
  }

  async updateSecuritySettings(
    userId: string,
    updates: Partial<SecuritySettings>
  ): Promise<SecuritySettings> {
    const current = await this.getSecuritySettings(userId);
    const merged: SecuritySettings = {
      ...current,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
    this.securitySettings.set(userId, merged);
    return merged;
  }

  // ============================================
  // NET WORTH SUMMARY
  // ============================================

  async getNetWorthSummary(): Promise<NetWorthSummary> {
    // Get all holdings (stocks & ETFs)
    const holdings = await this.getHoldings();
    const stocksAndETFs = holdings.reduce((sum, h) => sum + h.currentValue, 0);

    // Get real estate
    const properties = await this.getRealEstateProperties();
    const realEstateValue = properties.reduce((sum, p) => sum + p.estimatedValue, 0);
    const mortgages = properties.reduce((sum, p) => sum + (p.mortgageBalance || 0), 0);

    // Get crypto assets and update prices
    let cryptoAssetsList = await this.getCryptoAssets();
    
    // Update crypto prices with current market data
    try {
      const updatedCrypto = await updateCryptoAssetPrices(cryptoAssetsList);
      
      // Save updated prices back to storage
      for (const updated of updatedCrypto) {
        const existing = this.cryptoAssets.get(updated.id);
        if (existing && (existing.currentPrice !== updated.currentPrice || existing.currentValue !== updated.currentValue)) {
          this.cryptoAssets.set(updated.id, {
            ...existing,
            currentPrice: updated.currentPrice,
            currentValue: updated.currentValue,
            updatedAt: new Date().toISOString(),
          });
        }
      }
      
      cryptoAssetsList = updatedCrypto;
    } catch (error) {
      console.error("Error updating crypto prices:", error);
      // Continue with existing prices if update fails
    }
    
    const cryptoValue = cryptoAssetsList.reduce((sum, c) => sum + c.currentValue, 0);

    // Get collectibles
    const collectiblesList = await this.getCollectibles();
    const collectiblesValue = collectiblesList.reduce((sum, c) => sum + c.estimatedValue, 0);

    // Get alternative investments
    const altInvestments = await this.getAlternativeInvestments();
    const altInvestmentsValue = altInvestments.reduce((sum, a) => sum + a.currentNAV, 0);

    const totalNetWorth = stocksAndETFs + realEstateValue + cryptoValue + collectiblesValue + altInvestmentsValue;
    const totalLiabilities = mortgages;
    const netEquity = totalNetWorth - totalLiabilities;

    return {
      stocksAndETFs,
      realEstate: realEstateValue,
      crypto: cryptoValue,
      collectibles: collectiblesValue,
      alternativeInvestments: altInvestmentsValue,
      totalNetWorth,
      totalLiabilities,
      netEquity,
    };
  }
}

// ============================================
// DATABASE STORAGE IMPLEMENTATION
// ============================================

export class DatabaseStorage implements IStorage {
  constructor() {
    if (!db) {
      throw new Error("Database connection not available. DATABASE_URL must be set.");
    }
  }

  private ensureDb() {
    if (!db) {
      throw new Error("Database connection not available");
    }
    return db;
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.ensureDb().select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] as User | undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.ensureDb().select().from(users).where(eq(users.username, username)).limit(1);
    return result[0] as User | undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.ensureDb().insert(users).values(user).returning();
    return result[0] as User;
  }

  // Holdings methods
  async getHoldings(): Promise<Holding[]> {
    const results = await this.ensureDb().select().from(holdings);
    // Update prices asynchronously
    this.updateHoldingsPrices(results as Holding[]).catch(console.error);
    return results as Holding[];
  }

  private async updateHoldingsPrices(holdings: Holding[]): Promise<void> {
    for (const holding of holdings) {
      try {
        const quote = await fetchCurrentQuote(holding.ticker);
        if (quote && quote.price !== holding.currentPrice) {
          const priceChange = ((quote.price - holding.currentPrice) / holding.currentPrice) * 100;
          await this.ensureDb().update(holdings)
            .set({
              currentPrice: quote.price,
              currentValue: holding.quantity * quote.price,
              growthRate30d: priceChange,
            })
            .where(eq(holdings.id, holding.id));
        }
      } catch (error) {
        console.error(`Error updating price for ${holding.ticker}:`, error);
      }
    }
  }

  async getHolding(id: string): Promise<Holding | undefined> {
    const result = await this.ensureDb().select().from(holdings).where(eq(holdings.id, id)).limit(1);
    return result[0] as Holding | undefined;
  }

  async createHolding(holding: InsertHolding): Promise<Holding> {
    const result = await this.ensureDb().insert(holdings).values(holding).returning();
    return result[0] as Holding;
  }

  async updateHolding(id: string, updates: Partial<InsertHolding>): Promise<Holding | undefined> {
    const result = await this.ensureDb().update(holdings)
      .set(updates)
      .where(eq(holdings.id, id))
      .returning();
    return result[0] as Holding | undefined;
  }

  async deleteHolding(id: string): Promise<boolean> {
    try {
      await this.ensureDb().delete(holdings).where(eq(holdings.id, id));
      return true;
    } catch {
      return false;
    }
  }

  // Portfolio metrics (calculated, same as MemStorage)
  async getPortfolioMetrics(): Promise<PortfolioMetrics> {
    const holdings = await this.getHoldings();
    const cryptoAssets = await this.getCryptoAssets();

    // Calculate from holdings
    const holdingsValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const holdingsCostBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);
    
    // Calculate from crypto
    const cryptoValue = cryptoAssets.reduce((sum, c) => sum + c.currentValue, 0);
    const cryptoCostBasis = cryptoAssets.reduce((sum, c) => sum + c.costBasis, 0);
    
    // Combined totals
    const totalValue = holdingsValue + cryptoValue;
    const totalCostBasis = holdingsCostBasis + cryptoCostBasis;
    const totalReturn = totalValue - totalCostBasis;
    const totalReturnPercent = totalCostBasis > 0 ? (totalReturn / totalCostBasis) * 100 : 0;
    const timeWeightedReturn = totalCostBasis > 0 ? ((totalValue / totalCostBasis) - 1) * 100 : 0;
    return { totalValue, totalCostBasis, totalReturn, totalReturnPercent, timeWeightedReturn };
  }

  async getBenchmarkData(timeframe: string = "1M"): Promise<BenchmarkData> {
    const holdings = await this.getHoldings();
    const cryptoAssets = await this.getCryptoAssets();

    // Calculate weighted average growth from holdings and crypto
    const holdingsTotal = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const cryptoTotal = cryptoAssets.reduce((sum, c) => sum + c.currentValue, 0);
    const totalPortfolioValue = holdingsTotal + cryptoTotal;

    let portfolioGrowth = 0;
    if (totalPortfolioValue > 0) {
      // Weight holdings growth by their value
      const holdingsWeightedGrowth = holdings.reduce((sum, h) => {
        const weight = h.currentValue / totalPortfolioValue;
        return sum + (h.growthRate30d * weight);
      }, 0);
      
      // For crypto, approximate growth from current vs cost basis (30-day approximation)
      const cryptoWeightedGrowth = cryptoAssets.reduce((sum, c) => {
        const weight = c.currentValue / totalPortfolioValue;
        const cryptoGrowth = c.costBasis > 0 ? ((c.currentValue - c.costBasis) / c.costBasis) * 100 : 0;
        // Approximate 30-day growth (this is a simplification)
        const crypto30dGrowth = cryptoGrowth / 12; // Rough monthly approximation
        return sum + (crypto30dGrowth * weight);
      }, 0);
      
      portfolioGrowth = holdingsWeightedGrowth + cryptoWeightedGrowth;
    }
    let spyGrowth = 3.8;
    let spyCurrentPrice = 512.45;
    try {
      const spyQuote = await fetchCurrentQuote("SPY");
      if (spyQuote) spyCurrentPrice = spyQuote.price;
      const spyHistorical = await fetchHistoricalData("SPY", timeframe);
      if (spyHistorical && spyHistorical.length >= 2) {
        const startPrice = spyHistorical[0].price;
        const endPrice = spyHistorical[spyHistorical.length - 1].price;
        spyGrowth = ((endPrice - startPrice) / startPrice) * 100;
      }
    } catch (error) {
      console.error("Error fetching S&P 500 data:", error);
    }
    return { portfolioGrowth, spyGrowth, spyCurrentPrice };
  }

  async getBenchmarkChartData(timeframe: string): Promise<BenchmarkChartData> {
    // Same implementation as MemStorage
    const memStorage = new MemStorage();
    return memStorage.getBenchmarkChartData(timeframe);
  }

  async getIndustryAnalysis(): Promise<IndustryAnalysis[]> {
    const memStorage = new MemStorage();
    return memStorage.getIndustryAnalysis();
  }

  async getBubbleWarnings(): Promise<BubbleWarning[]> {
    const memStorage = new MemStorage();
    return memStorage.getBubbleWarnings();
  }

  async getNewsArticles(): Promise<NewsArticle[]> {
    const memStorage = new MemStorage();
    return memStorage.getNewsArticles();
  }

  async getStockData(query: string, timeframe: string): Promise<StockData | null> {
    const memStorage = new MemStorage();
    return memStorage.getStockData(query, timeframe);
  }

  async getIndexData(indices: string[], timeframe: string): Promise<IndexData[]> {
    const memStorage = new MemStorage();
    return memStorage.getIndexData(indices, timeframe);
  }

  // Plaid Accounts
  async createPlaidAccount(account: InsertPlaidAccount): Promise<PlaidAccount> {
    const result = await this.ensureDb().insert(plaidAccounts).values(account).returning();
    return result[0] as PlaidAccount;
  }

  async getPlaidAccounts(userId: string): Promise<PlaidAccount[]> {
    return await this.ensureDb().select().from(plaidAccounts).where(eq(plaidAccounts.userId, userId));
  }

  async getPlaidAccount(id: string): Promise<PlaidAccount | undefined> {
    const result = await this.ensureDb().select().from(plaidAccounts).where(eq(plaidAccounts.id, id)).limit(1);
    return result[0] as PlaidAccount | undefined;
  }

  async updatePlaidAccount(id: string, updates: Partial<InsertPlaidAccount>): Promise<PlaidAccount | undefined> {
    const result = await this.ensureDb().update(plaidAccounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(plaidAccounts.id, id))
      .returning();
    return result[0] as PlaidAccount | undefined;
  }

  async deletePlaidAccount(id: string): Promise<boolean> {
    try {
      await this.ensureDb().delete(plaidAccounts).where(eq(plaidAccounts.id, id));
      return true;
    } catch {
      return false;
    }
  }

  // Real Estate
  async getRealEstateProperties(): Promise<RealEstate[]> {
    const results = await this.ensureDb().select().from(realEstate);
    return results.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      purchaseDate: r.purchaseDate.toISOString(),
      lastPaidDate: r.lastPaidDate?.toISOString(),
    })) as RealEstate[];
  }

  async getRealEstateProperty(id: string): Promise<RealEstate | undefined> {
    const result = await this.ensureDb().select().from(realEstate).where(eq(realEstate.id, id)).limit(1);
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      purchaseDate: r.purchaseDate.toISOString(),
      lastPaidDate: r.lastPaidDate?.toISOString(),
    } as RealEstate;
  }

  async createRealEstateProperty(property: InsertRealEstate): Promise<RealEstate> {
    const result = await this.ensureDb().insert(realEstate).values({
      ...property,
      purchaseDate: new Date(property.purchaseDate),
    }).returning();
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      purchaseDate: r.purchaseDate.toISOString(),
      lastPaidDate: r.lastPaidDate?.toISOString(),
    } as RealEstate;
  }

  async updateRealEstateProperty(id: string, updates: Partial<InsertRealEstate>): Promise<RealEstate | undefined> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    if (updates.purchaseDate) updateData.purchaseDate = new Date(updates.purchaseDate);
    const result = await this.ensureDb().update(realEstate)
      .set(updateData)
      .where(eq(realEstate.id, id))
      .returning();
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      purchaseDate: r.purchaseDate.toISOString(),
      lastPaidDate: r.lastPaidDate?.toISOString(),
    } as RealEstate;
  }

  async deleteRealEstateProperty(id: string): Promise<boolean> {
    try {
      await this.ensureDb().delete(realEstate).where(eq(realEstate.id, id));
      return true;
    } catch {
      return false;
    }
  }

  // Crypto Assets
  async getCryptoAssets(): Promise<CryptoAsset[]> {
    const results = await this.ensureDb().select().from(cryptoAssets);
    // Update prices
    try {
      const updated = await updateCryptoAssetPrices(results as CryptoAsset[]);
      for (const asset of updated) {
        await this.ensureDb().update(cryptoAssets)
          .set({ currentPrice: asset.currentPrice, currentValue: asset.currentValue, updatedAt: new Date() })
          .where(eq(cryptoAssets.id, asset.id));
      }
      return updated;
    } catch (error) {
      console.error("Error updating crypto prices:", error);
    }
    return results.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })) as CryptoAsset[];
  }

  async getCryptoAsset(id: string): Promise<CryptoAsset | undefined> {
    const result = await this.ensureDb().select().from(cryptoAssets).where(eq(cryptoAssets.id, id)).limit(1);
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as CryptoAsset;
  }

  async createCryptoAsset(asset: InsertCryptoAsset): Promise<CryptoAsset> {
    const calculatedValue = asset.quantity * asset.currentPrice;
    const result = await this.ensureDb().insert(cryptoAssets).values({
      ...asset,
      currentValue: calculatedValue,
    }).returning();
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as CryptoAsset;
  }

  async updateCryptoAsset(id: string, updates: Partial<InsertCryptoAsset>): Promise<CryptoAsset | undefined> {
    const existing = await this.getCryptoAsset(id);
    if (!existing) return undefined;
    const quantity = updates.quantity ?? existing.quantity;
    const currentPrice = updates.currentPrice ?? existing.currentPrice;
    const calculatedValue = quantity * currentPrice;
    const result = await this.ensureDb().update(cryptoAssets)
      .set({
        ...updates,
        currentValue: calculatedValue,
        updatedAt: new Date(),
      })
      .where(eq(cryptoAssets.id, id))
      .returning();
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as CryptoAsset;
  }

  async deleteCryptoAsset(id: string): Promise<boolean> {
    try {
      await this.ensureDb().delete(cryptoAssets).where(eq(cryptoAssets.id, id));
      return true;
    } catch {
      return false;
    }
  }

  // Collectibles
  async getCollectibles(): Promise<Collectible[]> {
    const results = await this.ensureDb().select().from(collectibles);
    return results.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      purchaseDate: r.purchaseDate.toISOString(),
      appraisalDate: r.appraisalDate?.toISOString(),
    })) as Collectible[];
  }

  async getCollectible(id: string): Promise<Collectible | undefined> {
    const result = await this.ensureDb().select().from(collectibles).where(eq(collectibles.id, id)).limit(1);
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      purchaseDate: r.purchaseDate.toISOString(),
      appraisalDate: r.appraisalDate?.toISOString(),
    } as Collectible;
  }

  async createCollectible(collectible: InsertCollectible): Promise<Collectible> {
    const result = await this.ensureDb().insert(collectibles).values({
      ...collectible,
      purchaseDate: new Date(collectible.purchaseDate),
      appraisalDate: collectible.appraisalDate ? new Date(collectible.appraisalDate) : undefined,
    }).returning();
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      purchaseDate: r.purchaseDate.toISOString(),
      appraisalDate: r.appraisalDate?.toISOString(),
    } as Collectible;
  }

  async updateCollectible(id: string, updates: Partial<InsertCollectible>): Promise<Collectible | undefined> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    if (updates.purchaseDate) updateData.purchaseDate = new Date(updates.purchaseDate);
    if (updates.appraisalDate) updateData.appraisalDate = new Date(updates.appraisalDate);
    const result = await this.ensureDb().update(collectibles)
      .set(updateData)
      .where(eq(collectibles.id, id))
      .returning();
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      purchaseDate: r.purchaseDate.toISOString(),
      appraisalDate: r.appraisalDate?.toISOString(),
    } as Collectible;
  }

  async deleteCollectible(id: string): Promise<boolean> {
    try {
      await this.ensureDb().delete(collectibles).where(eq(collectibles.id, id));
      return true;
    } catch {
      return false;
    }
  }

  // Alternative Investments
  async getAlternativeInvestments(): Promise<AlternativeInvestment[]> {
    const results = await this.ensureDb().select().from(alternativeInvestments);
    return results.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      investmentDate: r.investmentDate.toISOString(),
      expectedMaturity: r.expectedMaturity?.toISOString(),
    })) as AlternativeInvestment[];
  }

  async getAlternativeInvestment(id: string): Promise<AlternativeInvestment | undefined> {
    const result = await this.ensureDb().select().from(alternativeInvestments).where(eq(alternativeInvestments.id, id)).limit(1);
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      investmentDate: r.investmentDate.toISOString(),
      expectedMaturity: r.expectedMaturity?.toISOString(),
    } as AlternativeInvestment;
  }

  async createAlternativeInvestment(investment: InsertAlternativeInvestment): Promise<AlternativeInvestment> {
    const result = await this.ensureDb().insert(alternativeInvestments).values({
      ...investment,
      investmentDate: new Date(investment.investmentDate),
      expectedMaturity: investment.expectedMaturity ? new Date(investment.expectedMaturity) : undefined,
    }).returning();
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      investmentDate: r.investmentDate.toISOString(),
      expectedMaturity: r.expectedMaturity?.toISOString(),
    } as AlternativeInvestment;
  }

  async updateAlternativeInvestment(id: string, updates: Partial<InsertAlternativeInvestment>): Promise<AlternativeInvestment | undefined> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    if (updates.investmentDate) updateData.investmentDate = new Date(updates.investmentDate);
    if (updates.expectedMaturity) updateData.expectedMaturity = new Date(updates.expectedMaturity);
    const result = await this.ensureDb().update(alternativeInvestments)
      .set(updateData)
      .where(eq(alternativeInvestments.id, id))
      .returning();
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      investmentDate: r.investmentDate.toISOString(),
      expectedMaturity: r.expectedMaturity?.toISOString(),
    } as AlternativeInvestment;
  }

  async deleteAlternativeInvestment(id: string): Promise<boolean> {
    try {
      await this.ensureDb().delete(alternativeInvestments).where(eq(alternativeInvestments.id, id));
      return true;
    } catch {
      return false;
    }
  }

  // User Preferences
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const result = await this.ensureDb().select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
    if (result[0]) {
      return userPreferencesSchema.parse(result[0]);
    }
    const defaults = userPreferencesSchema.parse({});
    await this.ensureDb().insert(userPreferences).values({ userId, ...defaults });
    return defaults;
  }

  async updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getUserPreferences(userId);
    const merged = userPreferencesSchema.parse({ ...current, ...updates });
    await this.ensureDb().update(userPreferences)
      .set(merged)
      .where(eq(userPreferences.userId, userId));
    return merged;
  }

  // Net Worth
  async getNetWorthSummary(): Promise<NetWorthSummary> {
    const holdings = await this.getHoldings();
    const stocksAndETFs = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const properties = await this.getRealEstateProperties();
    const realEstateValue = properties.reduce((sum, p) => sum + p.estimatedValue, 0);
    const mortgages = properties.reduce((sum, p) => sum + (p.mortgageBalance || 0), 0);
    const cryptoAssetsList = await this.getCryptoAssets();
    const cryptoValue = cryptoAssetsList.reduce((sum, c) => sum + c.currentValue, 0);
    const collectiblesList = await this.getCollectibles();
    const collectiblesValue = collectiblesList.reduce((sum, c) => sum + c.estimatedValue, 0);
    const altInvestments = await this.getAlternativeInvestments();
    const altInvestmentsValue = altInvestments.reduce((sum, a) => sum + a.currentNAV, 0);
    const totalNetWorth = stocksAndETFs + realEstateValue + cryptoValue + collectiblesValue + altInvestmentsValue;
    const totalLiabilities = mortgages;
    const netEquity = totalNetWorth - totalLiabilities;
    return {
      stocksAndETFs,
      realEstate: realEstateValue,
      crypto: cryptoValue,
      collectibles: collectiblesValue,
      alternativeInvestments: altInvestmentsValue,
      totalNetWorth,
      totalLiabilities,
      netEquity,
    };
  }

  // Financial Institutions
  async getFinancialInstitutions(): Promise<FinancialInstitution[]> {
    const results = await this.ensureDb().select().from(financialInstitutions);
    return results.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })) as FinancialInstitution[];
  }

  async createFinancialInstitution(institution: InsertFinancialInstitution): Promise<FinancialInstitution> {
    const result = await this.ensureDb().insert(financialInstitutions).values(institution).returning();
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as FinancialInstitution;
  }

  async updateFinancialInstitution(id: string, updates: Partial<InsertFinancialInstitution>): Promise<FinancialInstitution | undefined> {
    const result = await this.ensureDb().update(financialInstitutions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(financialInstitutions.id, id))
      .returning();
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as FinancialInstitution;
  }

  async deleteFinancialInstitution(id: string): Promise<boolean> {
    try {
      await this.ensureDb().delete(financialInstitutions).where(eq(financialInstitutions.id, id));
      return true;
    } catch {
      return false;
    }
  }

  // Financial Accounts
  async getFinancialAccounts(userId?: string): Promise<FinancialAccount[]> {
    const db = this.ensureDb();
    let results;
    if (userId) {
      results = await db.select().from(financialAccounts).where(eq(financialAccounts.userId, userId));
    } else {
      results = await db.select().from(financialAccounts);
    }
    return results.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      lastSyncedAt: r.lastSyncedAt?.toISOString(),
    })) as FinancialAccount[];
  }

  async createFinancialAccount(account: InsertFinancialAccount): Promise<FinancialAccount> {
    const result = await this.ensureDb().insert(financialAccounts).values(account).returning();
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      lastSyncedAt: r.lastSyncedAt?.toISOString(),
    } as FinancialAccount;
  }

  async updateFinancialAccount(id: string, updates: Partial<InsertFinancialAccount>): Promise<FinancialAccount | undefined> {
    const result = await this.ensureDb().update(financialAccounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(financialAccounts.id, id))
      .returning();
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      lastSyncedAt: r.lastSyncedAt?.toISOString(),
    } as FinancialAccount;
  }

  async deleteFinancialAccount(id: string): Promise<boolean> {
    try {
      await this.ensureDb().delete(financialAccounts).where(eq(financialAccounts.id, id));
      return true;
    } catch {
      return false;
    }
  }

  // Transaction Categories
  async getTransactionCategories(): Promise<TransactionCategory[]> {
    const results = await this.ensureDb().select().from(transactionCategories);
    return results.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })) as TransactionCategory[];
  }

  async createTransactionCategory(category: InsertTransactionCategory): Promise<TransactionCategory> {
    const result = await this.ensureDb().insert(transactionCategories).values(category).returning();
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as TransactionCategory;
  }

  async updateTransactionCategory(id: string, updates: Partial<InsertTransactionCategory>): Promise<TransactionCategory | undefined> {
    const result = await this.ensureDb().update(transactionCategories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(transactionCategories.id, id))
      .returning();
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as TransactionCategory;
  }

  async deleteTransactionCategory(id: string): Promise<boolean> {
    try {
      await this.ensureDb().delete(transactionCategories).where(eq(transactionCategories.id, id));
      return true;
    } catch {
      return false;
    }
  }

  // Transaction Tags
  async getTransactionTags(): Promise<TransactionTag[]> {
    const results = await this.ensureDb().select().from(transactionTags);
    return results.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })) as TransactionTag[];
  }

  async createTransactionTag(tag: InsertTransactionTag): Promise<TransactionTag> {
    const result = await this.ensureDb().insert(transactionTags).values(tag).returning();
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as TransactionTag;
  }

  async updateTransactionTag(id: string, updates: Partial<InsertTransactionTag>): Promise<TransactionTag | undefined> {
    const result = await this.ensureDb().update(transactionTags)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(transactionTags.id, id))
      .returning();
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as TransactionTag;
  }

  async deleteTransactionTag(id: string): Promise<boolean> {
    try {
      await this.ensureDb().delete(transactionTags).where(eq(transactionTags.id, id));
      return true;
    } catch {
      return false;
    }
  }

  // Transactions
  async getTransactions(filters?: { accountId?: string; startDate?: string; endDate?: string }): Promise<Transaction[]> {
    let query = this.ensureDb().select().from(transactions);
    const conditions = [];
    if (filters?.accountId) {
      conditions.push(eq(transactions.accountId, filters.accountId));
    }
    if (filters?.startDate) {
      conditions.push(gte(transactions.date, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(transactions.date, new Date(filters.endDate)));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    const results = await query.orderBy(desc(transactions.date));
    return results.map(r => ({
      ...r,
      date: r.date.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })) as Transaction[];
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const result = await this.ensureDb().select().from(transactions).where(eq(transactions.id, id)).limit(1);
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      date: r.date.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as Transaction;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const result = await this.ensureDb().insert(transactions).values({
      ...transaction,
      date: new Date(transaction.date),
    }).returning();
    const r = result[0];
    return {
      ...r,
      date: r.date.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as Transaction;
  }

  async updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    if (updates.date) updateData.date = new Date(updates.date);
    const result = await this.ensureDb().update(transactions)
      .set(updateData)
      .where(eq(transactions.id, id))
      .returning();
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      date: r.date.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as Transaction;
  }

  async deleteTransaction(id: string): Promise<boolean> {
    try {
      await this.ensureDb().delete(transactions).where(eq(transactions.id, id));
      return true;
    } catch {
      return false;
    }
  }

  // Bills
  async getBills(): Promise<Bill[]> {
    const results = await this.ensureDb().select().from(bills);
    return results.map(r => ({
      ...r,
      dueDate: r.dueDate.toISOString(),
      lastPaidDate: r.lastPaidDate?.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })) as Bill[];
  }

  async createBill(bill: InsertBill): Promise<Bill> {
    const result = await this.ensureDb().insert(bills).values({
      ...bill,
      dueDate: new Date(bill.dueDate),
      lastPaidDate: bill.lastPaidDate ? new Date(bill.lastPaidDate) : undefined,
    }).returning();
    const r = result[0];
    return {
      ...r,
      dueDate: r.dueDate.toISOString(),
      lastPaidDate: r.lastPaidDate?.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as Bill;
  }

  async updateBill(id: string, updates: Partial<InsertBill>): Promise<Bill | undefined> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    if (updates.dueDate) updateData.dueDate = new Date(updates.dueDate);
    if (updates.lastPaidDate) updateData.lastPaidDate = new Date(updates.lastPaidDate);
    const result = await this.ensureDb().update(bills)
      .set(updateData)
      .where(eq(bills.id, id))
      .returning();
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      dueDate: r.dueDate.toISOString(),
      lastPaidDate: r.lastPaidDate?.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as Bill;
  }

  async deleteBill(id: string): Promise<boolean> {
    try {
      await this.ensureDb().delete(bills).where(eq(bills.id, id));
      return true;
    } catch {
      return false;
    }
  }

  // Subscriptions
  async getSubscriptions(): Promise<Subscription[]> {
    const results = await this.ensureDb().select().from(subscriptions);
    return results.map(r => ({
      ...r,
      nextBillingDate: r.nextBillingDate.toISOString(),
      lastBillingDate: r.lastBillingDate?.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })) as Subscription[];
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const result = await this.ensureDb().insert(subscriptions).values({
      ...subscription,
      nextBillingDate: new Date(subscription.nextBillingDate),
      lastBillingDate: subscription.lastBillingDate ? new Date(subscription.lastBillingDate) : undefined,
    }).returning();
    const r = result[0];
    return {
      ...r,
      nextBillingDate: r.nextBillingDate.toISOString(),
      lastBillingDate: r.lastBillingDate?.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as Subscription;
  }

  async updateSubscription(id: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    if (updates.nextBillingDate) updateData.nextBillingDate = new Date(updates.nextBillingDate);
    if (updates.lastBillingDate) updateData.lastBillingDate = new Date(updates.lastBillingDate);
    const result = await this.ensureDb().update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.id, id))
      .returning();
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      nextBillingDate: r.nextBillingDate.toISOString(),
      lastBillingDate: r.lastBillingDate?.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as Subscription;
  }

  async deleteSubscription(id: string): Promise<boolean> {
    try {
      await this.ensureDb().delete(subscriptions).where(eq(subscriptions.id, id));
      return true;
    } catch {
      return false;
    }
  }

  // Sinking Funds
  async getSinkingFunds(): Promise<SinkingFund[]> {
    const results = await this.ensureDb().select().from(sinkingFunds);
    return results.map(r => ({
      ...r,
      dueDate: r.dueDate?.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })) as SinkingFund[];
  }

  async createSinkingFund(fund: InsertSinkingFund): Promise<SinkingFund> {
    const result = await this.ensureDb().insert(sinkingFunds).values({
      ...fund,
      dueDate: fund.dueDate ? new Date(fund.dueDate) : undefined,
    }).returning();
    const r = result[0];
    return {
      ...r,
      dueDate: r.dueDate?.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as SinkingFund;
  }

  async updateSinkingFund(id: string, updates: Partial<InsertSinkingFund>): Promise<SinkingFund | undefined> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    if (updates.dueDate) updateData.dueDate = new Date(updates.dueDate);
    const result = await this.ensureDb().update(sinkingFunds)
      .set(updateData)
      .where(eq(sinkingFunds.id, id))
      .returning();
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      dueDate: r.dueDate?.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as SinkingFund;
  }

  async deleteSinkingFund(id: string): Promise<boolean> {
    try {
      await this.ensureDb().delete(sinkingFunds).where(eq(sinkingFunds.id, id));
      return true;
    } catch {
      return false;
    }
  }

  // Debt Plans
  async getDebtPlans(): Promise<DebtPlan[]> {
    const results = await this.ensureDb().select().from(debtPlans);
    return results.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })) as DebtPlan[];
  }

  async createDebtPlan(plan: InsertDebtPlan): Promise<DebtPlan> {
    const result = await this.ensureDb().insert(debtPlans).values(plan).returning();
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as DebtPlan;
  }

  async updateDebtPlan(id: string, updates: Partial<InsertDebtPlan>): Promise<DebtPlan | undefined> {
    const result = await this.ensureDb().update(debtPlans)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(debtPlans.id, id))
      .returning();
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as DebtPlan;
  }

  async deleteDebtPlan(id: string): Promise<boolean> {
    try {
      await this.ensureDb().delete(debtPlans).where(eq(debtPlans.id, id));
      return true;
    } catch {
      return false;
    }
  }

  // Cash Flow Scenarios
  async getCashFlowScenarios(): Promise<CashFlowScenario[]> {
    const results = await this.ensureDb().select().from(cashFlowScenarios);
    return results.map(r => ({
      ...r,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate?.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })) as CashFlowScenario[];
  }

  async createCashFlowScenario(scenario: InsertCashFlowScenario): Promise<CashFlowScenario> {
    const result = await this.ensureDb().insert(cashFlowScenarios).values({
      ...scenario,
      startDate: new Date(scenario.startDate),
      endDate: scenario.endDate ? new Date(scenario.endDate) : undefined,
    }).returning();
    const r = result[0];
    return {
      ...r,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate?.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as CashFlowScenario;
  }

  async updateCashFlowScenario(id: string, updates: Partial<InsertCashFlowScenario>): Promise<CashFlowScenario | undefined> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    if (updates.startDate) updateData.startDate = new Date(updates.startDate);
    if (updates.endDate) updateData.endDate = new Date(updates.endDate);
    const result = await this.ensureDb().update(cashFlowScenarios)
      .set(updateData)
      .where(eq(cashFlowScenarios.id, id))
      .returning();
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate?.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as CashFlowScenario;
  }

  async deleteCashFlowScenario(id: string): Promise<boolean> {
    try {
      await this.ensureDb().delete(cashFlowScenarios).where(eq(cashFlowScenarios.id, id));
      return true;
    } catch {
      return false;
    }
  }

  // Category Rules
  async getCategoryRules(): Promise<CategoryRule[]> {
    const results = await this.ensureDb().select().from(categoryRules);
    return results.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })) as CategoryRule[];
  }

  async createCategoryRule(rule: InsertCategoryRule): Promise<CategoryRule> {
    const result = await this.ensureDb().insert(categoryRules).values({
      ...rule,
      confidence: 0.5,
      acceptedCount: 0,
      rejectedCount: 0,
    }).returning();
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as CategoryRule;
  }

  async updateCategoryRule(id: string, updates: Partial<InsertCategoryRule>): Promise<CategoryRule | undefined> {
    const existing = await this.ensureDb().select().from(categoryRules).where(eq(categoryRules.id, id)).limit(1);
    if (!existing[0]) return undefined;
    const acceptedCount = updates.acceptedCount ?? existing[0].acceptedCount;
    const rejectedCount = updates.rejectedCount ?? existing[0].rejectedCount;
    const total = acceptedCount + rejectedCount;
    const confidence = total > 0 ? acceptedCount / total : 0.5;
    const result = await this.ensureDb().update(categoryRules)
      .set({
        ...updates,
        confidence,
        updatedAt: new Date(),
      })
      .where(eq(categoryRules.id, id))
      .returning();
    if (!result[0]) return undefined;
    const r = result[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    } as CategoryRule;
  }

  async deleteCategoryRule(id: string): Promise<boolean> {
    try {
      await this.ensureDb().delete(categoryRules).where(eq(categoryRules.id, id));
      return true;
    } catch {
      return false;
    }
  }

  // Anomalies
  async getAnomalies(): Promise<Anomaly[]> {
    const results = await this.ensureDb().select().from(anomalies);
    return results.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })) as Anomaly[];
  }

  async setAnomalies(anomaliesList: Anomaly[]): Promise<void> {
    // Delete all existing anomalies
    await this.ensureDb().delete(anomalies);
    // Insert new ones
    if (anomaliesList.length > 0) {
      await this.ensureDb().insert(anomalies).values(anomaliesList.map(a => ({
        ...a,
        createdAt: new Date(a.createdAt),
      })));
    }
  }

  // Security Settings
  async getSecuritySettings(userId: string): Promise<SecuritySettings> {
    const result = await this.ensureDb().select().from(securitySettings).where(eq(securitySettings.userId, userId)).limit(1);
    if (result[0]) {
      return {
        ...result[0],
        lastUpdated: result[0].lastUpdated?.toISOString(),
      } as SecuritySettings;
    }
    const defaults: SecuritySettings = {
      mfaEnabled: false,
      biometricEnabled: false,
      encryptionEnabled: true,
      lastUpdated: new Date().toISOString(),
    };
    await this.ensureDb().insert(securitySettings).values({ userId, ...defaults });
    return defaults;
  }

  async updateSecuritySettings(userId: string, updates: Partial<SecuritySettings>): Promise<SecuritySettings> {
    const current = await this.getSecuritySettings(userId);
    const merged: SecuritySettings = {
      ...current,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
    await this.ensureDb().update(securitySettings)
      .set({
        ...merged,
        lastUpdated: new Date(),
      })
      .where(eq(securitySettings.userId, userId));
    return merged;
  }
}

// Use database storage if DATABASE_URL is set and valid, otherwise use in-memory storage
function createStorage() {
  const dbUrl = process.env.DATABASE_URL;
  // Check if DATABASE_URL is set and doesn't contain placeholder values
  if (dbUrl && 
      !dbUrl.includes("USERNAME") && 
      !dbUrl.includes("PASSWORD") && 
      !dbUrl.includes("DATABASE_NAME") &&
      db !== null) {
    try {
      return new DatabaseStorage();
    } catch (error) {
      console.warn("Failed to initialize database storage, falling back to in-memory storage:", error);
      return new MemStorage();
    }
  }
  return new MemStorage();
}

export const storage = createStorage();
