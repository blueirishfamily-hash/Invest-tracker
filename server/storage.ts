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
  type BubbleWarning,
  type NewsArticle,
  type StockData,
  type IndexData,
  type PlaidAccount,
  type InsertPlaidAccount,
  demoHoldings,
} from "@shared/schema";
import { randomUUID } from "crypto";
import {
  fetchHistoricalData,
  fetchCurrentQuote,
  searchStock,
} from "./market-data";

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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private holdings: Map<string, Holding>;
  private plaidAccounts: Map<string, PlaidAccount>;

  constructor() {
    this.users = new Map();
    this.holdings = new Map();
    this.plaidAccounts = new Map();
    
    for (const holding of demoHoldings) {
      this.holdings.set(holding.id, holding);
    }
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

    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalCostBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);
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

    const portfolioGrowth =
      holdings.length > 0
        ? holdings.reduce((sum, h) => sum + h.growthRate30d, 0) / holdings.length
        : 0;

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

    // Normalize to start at 100
    const firstPrice = historicalData[0]?.price || 100;
    return historicalData.map((point) => ({
      ...point,
      price: (point.price / firstPrice) * 100,
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
}

export const storage = new MemStorage();
