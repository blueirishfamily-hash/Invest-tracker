import {
  type User,
  type InsertUser,
  type Holding,
  type InsertHolding,
  type PortfolioMetrics,
  type BenchmarkData,
  type IndustryAnalysis,
  type BubbleWarning,
  demoHoldings,
} from "@shared/schema";
import { randomUUID } from "crypto";

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
  getBenchmarkData(): Promise<BenchmarkData>;
  getIndustryAnalysis(): Promise<IndustryAnalysis[]>;
  getBubbleWarnings(): Promise<BubbleWarning[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private holdings: Map<string, Holding>;

  constructor() {
    this.users = new Map();
    this.holdings = new Map();
    
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
    return Array.from(this.holdings.values());
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

  async getBenchmarkData(): Promise<BenchmarkData> {
    const holdings = await this.getHoldings();

    const portfolioGrowth =
      holdings.length > 0
        ? holdings.reduce((sum, h) => sum + h.growthRate30d, 0) / holdings.length
        : 0;

    const spyGrowth = 3.8;
    const spyCurrentPrice = 512.45;

    return {
      portfolioGrowth,
      spyGrowth,
      spyCurrentPrice,
    };
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

    for (const [industry, data] of industryMap.entries()) {
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
}

export const storage = new MemStorage();
