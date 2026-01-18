/**
 * Portfolio Risk Calculations
 * 
 * Provides professional-grade risk metrics for portfolio analysis:
 * - Volatility (annualized standard deviation)
 * - Beta (market sensitivity)
 * - Sharpe Ratio (risk-adjusted returns)
 * - Value at Risk (VaR)
 * - Maximum Drawdown
 */

import type { Holding, PortfolioRiskMetrics, RiskLevel } from "@shared/schema";
import { timeSeriesDailyAdjusted } from "./alpha-vantage";

// Risk-free rate (approximate 10-year Treasury yield)
const RISK_FREE_RATE = 0.045; // 4.5% annual

// Trading days per year for annualization
const TRADING_DAYS_PER_YEAR = 252;

// Z-scores for VaR confidence levels
const Z_SCORE_95 = 1.645;
const Z_SCORE_99 = 2.326;

interface DailyReturn {
  date: string;
  return: number;
}

interface HistoricalData {
  date: string;
  price: number;
}

/**
 * Calculate daily returns from price data
 */
function calculateDailyReturns(prices: HistoricalData[]): DailyReturn[] {
  if (prices.length < 2) return [];
  
  const returns: DailyReturn[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prevPrice = prices[i - 1].price;
    const currPrice = prices[i].price;
    if (prevPrice > 0) {
      returns.push({
        date: prices[i].date,
        return: (currPrice - prevPrice) / prevPrice,
      });
    }
  }
  return returns;
}

/**
 * Calculate mean of an array of numbers
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  return Math.sqrt(mean(squaredDiffs));
}

/**
 * Calculate covariance between two arrays
 */
function covariance(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;
  const meanX = mean(x);
  const meanY = mean(y);
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += (x[i] - meanX) * (y[i] - meanY);
  }
  return sum / (x.length - 1);
}

/**
 * Calculate variance
 */
function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1);
}

/**
 * Get risk level interpretation for volatility
 */
function getVolatilityLevel(volatility: number): RiskLevel {
  if (volatility < 10) return "Low";
  if (volatility < 20) return "Medium";
  if (volatility < 30) return "High";
  return "Very High";
}

/**
 * Get beta interpretation
 */
function getBetaInterpretation(beta: number): string {
  if (beta < 0.5) return "Much less volatile than market";
  if (beta < 0.8) return "Less volatile than market";
  if (beta < 1.0) return "Slightly less volatile than market";
  if (beta === 1.0) return "Moves with market";
  if (beta < 1.2) return "Slightly more volatile than market";
  if (beta < 1.5) return "More volatile than market";
  return "Much more volatile than market";
}

/**
 * Get Sharpe ratio interpretation
 */
function getSharpeInterpretation(sharpe: number): string {
  if (sharpe < 0) return "Negative risk-adjusted returns";
  if (sharpe < 0.5) return "Poor risk-adjusted returns";
  if (sharpe < 1.0) return "Acceptable risk-adjusted returns";
  if (sharpe < 2.0) return "Good risk-adjusted returns";
  if (sharpe < 3.0) return "Very good risk-adjusted returns";
  return "Excellent risk-adjusted returns";
}

/**
 * Calculate maximum drawdown from price series
 */
function calculateMaxDrawdown(prices: HistoricalData[]): { maxDrawdown: number; period: string } {
  if (prices.length < 2) return { maxDrawdown: 0, period: "" };
  
  let maxDrawdown = 0;
  let peak = prices[0].price;
  let peakDate = prices[0].date;
  let troughDate = prices[0].date;
  let maxDrawdownPeakDate = "";
  let maxDrawdownTroughDate = "";
  
  for (const point of prices) {
    if (point.price > peak) {
      peak = point.price;
      peakDate = point.date;
    }
    
    const drawdown = (peak - point.price) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPeakDate = peakDate;
      maxDrawdownTroughDate = point.date;
    }
  }
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };
  
  const period = maxDrawdownPeakDate && maxDrawdownTroughDate
    ? `${formatDate(maxDrawdownPeakDate)} - ${formatDate(maxDrawdownTroughDate)}`
    : "";
  
  return { maxDrawdown: maxDrawdown * 100, period };
}

/**
 * Fetch historical price data for a ticker
 */
async function fetchHistoricalPrices(
  ticker: string,
  timeframe: "1Y" | "3Y" | "5Y" = "1Y"
): Promise<HistoricalData[]> {
  try {
    const outputSize = timeframe === "1Y" ? "compact" : "full";
    const data = await timeSeriesDailyAdjusted(ticker, outputSize);
    
    if (!data || data.length === 0) return [];
    
    // Filter by timeframe
    const now = new Date();
    let cutoffDate: Date;
    switch (timeframe) {
      case "1Y":
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case "3Y":
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 3));
        break;
      case "5Y":
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 5));
        break;
    }
    
    return data
      .filter(d => new Date(d.date) >= cutoffDate)
      .map(d => ({
        date: d.date,
        price: d.adjustedClose || d.close,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error(`Error fetching historical prices for ${ticker}:`, error);
    return [];
  }
}

/**
 * Calculate weighted portfolio returns from holdings
 */
async function calculatePortfolioReturns(
  holdings: Holding[],
  timeframe: "1Y" | "3Y" | "5Y" = "1Y"
): Promise<{ portfolioReturns: DailyReturn[]; portfolioPrices: HistoricalData[] }> {
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  if (totalValue === 0) return { portfolioReturns: [], portfolioPrices: [] };
  
  // Fetch historical data for each holding
  const holdingDataMap = new Map<string, HistoricalData[]>();
  const weights = new Map<string, number>();
  
  for (const holding of holdings) {
    const weight = holding.currentValue / totalValue;
    weights.set(holding.ticker, weight);
    
    const historicalData = await fetchHistoricalPrices(holding.ticker, timeframe);
    if (historicalData.length > 0) {
      holdingDataMap.set(holding.ticker, historicalData);
    }
  }
  
  if (holdingDataMap.size === 0) return { portfolioReturns: [], portfolioPrices: [] };
  
  // Find common dates across all holdings
  const allDates = new Set<string>();
  holdingDataMap.forEach(data => {
    data.forEach(d => allDates.add(d.date));
  });
  
  const sortedDates = Array.from(allDates).sort();
  
  // Calculate portfolio value for each date
  const portfolioPrices: HistoricalData[] = [];
  
  for (const date of sortedDates) {
    let portfolioValue = 0;
    let hasAllData = true;
    
    for (const [ticker, data] of holdingDataMap.entries()) {
      const point = data.find(d => d.date === date);
      if (point) {
        const weight = weights.get(ticker) || 0;
        // Normalize to weight (as if portfolio started at 100)
        const firstPrice = data[0]?.price || 1;
        const normalizedValue = (point.price / firstPrice) * weight * 100;
        portfolioValue += normalizedValue;
      } else {
        hasAllData = false;
      }
    }
    
    if (hasAllData && portfolioValue > 0) {
      portfolioPrices.push({ date, price: portfolioValue });
    }
  }
  
  const portfolioReturns = calculateDailyReturns(portfolioPrices);
  
  return { portfolioReturns, portfolioPrices };
}

/**
 * Calculate all portfolio risk metrics
 */
export async function calculatePortfolioRiskMetrics(
  holdings: Holding[],
  timeframe: "1Y" | "3Y" | "5Y" = "1Y"
): Promise<PortfolioRiskMetrics> {
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  
  // Get portfolio returns
  const { portfolioReturns, portfolioPrices } = await calculatePortfolioReturns(holdings, timeframe);
  
  // Get S&P 500 (SPY) returns for comparison
  const spyPrices = await fetchHistoricalPrices("SPY", timeframe);
  const spyReturns = calculateDailyReturns(spyPrices);
  
  // Align portfolio and SPY returns by date
  const spyReturnMap = new Map(spyReturns.map(r => [r.date, r.return]));
  const alignedPortfolioReturns: number[] = [];
  const alignedSpyReturns: number[] = [];
  
  for (const pr of portfolioReturns) {
    const spyReturn = spyReturnMap.get(pr.date);
    if (spyReturn !== undefined) {
      alignedPortfolioReturns.push(pr.return);
      alignedSpyReturns.push(spyReturn);
    }
  }
  
  // Calculate volatility (annualized)
  const dailyVolatility = standardDeviation(alignedPortfolioReturns);
  const annualizedVolatility = dailyVolatility * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100;
  
  const spyDailyVolatility = standardDeviation(alignedSpyReturns);
  const spyAnnualizedVolatility = spyDailyVolatility * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100;
  
  // Calculate Beta
  const portfolioSpyCovariance = covariance(alignedPortfolioReturns, alignedSpyReturns);
  const spyVariance = variance(alignedSpyReturns);
  const beta = spyVariance > 0 ? portfolioSpyCovariance / spyVariance : 1;
  
  // Calculate Sharpe Ratio
  const meanDailyReturn = mean(alignedPortfolioReturns);
  const annualizedReturn = meanDailyReturn * TRADING_DAYS_PER_YEAR;
  const excessReturn = annualizedReturn - RISK_FREE_RATE;
  const sharpeRatio = annualizedVolatility > 0 ? (excessReturn / (annualizedVolatility / 100)) : 0;
  
  // Calculate SPY Sharpe for comparison
  const spyMeanDailyReturn = mean(alignedSpyReturns);
  const spyAnnualizedReturn = spyMeanDailyReturn * TRADING_DAYS_PER_YEAR;
  const spyExcessReturn = spyAnnualizedReturn - RISK_FREE_RATE;
  const spySharpeRatio = spyAnnualizedVolatility > 0 ? (spyExcessReturn / (spyAnnualizedVolatility / 100)) : 0;
  
  // Calculate Value at Risk
  const var95Percent = Z_SCORE_95 * dailyVolatility * 100;
  const var99Percent = Z_SCORE_99 * dailyVolatility * 100;
  const var95 = totalValue * (var95Percent / 100);
  const var99 = totalValue * (var99Percent / 100);
  
  // Calculate Max Drawdown
  const { maxDrawdown, period: maxDrawdownPeriod } = calculateMaxDrawdown(portfolioPrices);
  
  return {
    volatility: Math.round(annualizedVolatility * 100) / 100,
    volatilityLevel: getVolatilityLevel(annualizedVolatility),
    beta: Math.round(beta * 100) / 100,
    betaInterpretation: getBetaInterpretation(beta),
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    sharpeInterpretation: getSharpeInterpretation(sharpeRatio),
    var95: Math.round(var95 * 100) / 100,
    var99: Math.round(var99 * 100) / 100,
    var95Percent: Math.round(var95Percent * 100) / 100,
    var99Percent: Math.round(var99Percent * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    maxDrawdownPeriod,
    spyVolatility: Math.round(spyAnnualizedVolatility * 100) / 100,
    spyBeta: 1.0,
    spySharpeRatio: Math.round(spySharpeRatio * 100) / 100,
    calculationDate: new Date().toISOString(),
    dataPoints: alignedPortfolioReturns.length,
    timeframe,
  };
}
