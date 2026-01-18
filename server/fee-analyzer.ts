/**
 * Fee Analyzer
 * 
 * Analyzes portfolio holdings for expense ratios and hidden fees:
 * - Detects ETFs and mutual funds
 * - Fetches expense ratios
 * - Calculates annual fee costs
 * - Projects long-term fee impact
 * - Suggests lower-cost alternatives
 */

import type { Holding, FeeAnalysis, HoldingFee, FeeAlternative, FeeProjection } from "@shared/schema";
import { overview } from "./alpha-vantage";

// Common low-cost ETF alternatives by category
const LOW_COST_ALTERNATIVES: Record<string, { ticker: string; name: string; expenseRatio: number }[]> = {
  "S&P 500": [
    { ticker: "VOO", name: "Vanguard S&P 500 ETF", expenseRatio: 0.03 },
    { ticker: "IVV", name: "iShares Core S&P 500 ETF", expenseRatio: 0.03 },
    { ticker: "SPLG", name: "SPDR Portfolio S&P 500 ETF", expenseRatio: 0.02 },
  ],
  "Total Market": [
    { ticker: "VTI", name: "Vanguard Total Stock Market ETF", expenseRatio: 0.03 },
    { ticker: "ITOT", name: "iShares Core S&P Total US Stock Market ETF", expenseRatio: 0.03 },
    { ticker: "SPTM", name: "SPDR Portfolio S&P 1500 Composite Stock Market ETF", expenseRatio: 0.03 },
  ],
  "Large Cap Growth": [
    { ticker: "VUG", name: "Vanguard Growth ETF", expenseRatio: 0.04 },
    { ticker: "SCHG", name: "Schwab U.S. Large-Cap Growth ETF", expenseRatio: 0.04 },
    { ticker: "IWF", name: "iShares Russell 1000 Growth ETF", expenseRatio: 0.19 },
  ],
  "Large Cap Value": [
    { ticker: "VTV", name: "Vanguard Value ETF", expenseRatio: 0.04 },
    { ticker: "SCHV", name: "Schwab U.S. Large-Cap Value ETF", expenseRatio: 0.04 },
    { ticker: "IWD", name: "iShares Russell 1000 Value ETF", expenseRatio: 0.19 },
  ],
  "International": [
    { ticker: "VXUS", name: "Vanguard Total International Stock ETF", expenseRatio: 0.07 },
    { ticker: "IXUS", name: "iShares Core MSCI Total International Stock ETF", expenseRatio: 0.07 },
    { ticker: "SPDW", name: "SPDR Portfolio Developed World ex-US ETF", expenseRatio: 0.04 },
  ],
  "Bonds": [
    { ticker: "BND", name: "Vanguard Total Bond Market ETF", expenseRatio: 0.03 },
    { ticker: "AGG", name: "iShares Core U.S. Aggregate Bond ETF", expenseRatio: 0.03 },
    { ticker: "SCHZ", name: "Schwab U.S. Aggregate Bond ETF", expenseRatio: 0.03 },
  ],
  "Technology": [
    { ticker: "VGT", name: "Vanguard Information Technology ETF", expenseRatio: 0.10 },
    { ticker: "XLK", name: "Technology Select Sector SPDR Fund", expenseRatio: 0.09 },
    { ticker: "FTEC", name: "Fidelity MSCI Information Technology Index ETF", expenseRatio: 0.08 },
  ],
};

// Known expense ratios for popular funds (fallback data)
const KNOWN_EXPENSE_RATIOS: Record<string, { expenseRatio: number; category: string; type: "ETF" | "Mutual Fund" }> = {
  // S&P 500 ETFs
  SPY: { expenseRatio: 0.0945, category: "S&P 500", type: "ETF" },
  VOO: { expenseRatio: 0.03, category: "S&P 500", type: "ETF" },
  IVV: { expenseRatio: 0.03, category: "S&P 500", type: "ETF" },
  SPLG: { expenseRatio: 0.02, category: "S&P 500", type: "ETF" },
  
  // Total Market ETFs
  VTI: { expenseRatio: 0.03, category: "Total Market", type: "ETF" },
  ITOT: { expenseRatio: 0.03, category: "Total Market", type: "ETF" },
  SPTM: { expenseRatio: 0.03, category: "Total Market", type: "ETF" },
  
  // Growth ETFs
  QQQ: { expenseRatio: 0.20, category: "Large Cap Growth", type: "ETF" },
  VUG: { expenseRatio: 0.04, category: "Large Cap Growth", type: "ETF" },
  SCHG: { expenseRatio: 0.04, category: "Large Cap Growth", type: "ETF" },
  IWF: { expenseRatio: 0.19, category: "Large Cap Growth", type: "ETF" },
  
  // Value ETFs
  VTV: { expenseRatio: 0.04, category: "Large Cap Value", type: "ETF" },
  SCHV: { expenseRatio: 0.04, category: "Large Cap Value", type: "ETF" },
  IWD: { expenseRatio: 0.19, category: "Large Cap Value", type: "ETF" },
  
  // International ETFs
  VXUS: { expenseRatio: 0.07, category: "International", type: "ETF" },
  IXUS: { expenseRatio: 0.07, category: "International", type: "ETF" },
  VEA: { expenseRatio: 0.05, category: "International", type: "ETF" },
  VWO: { expenseRatio: 0.08, category: "International", type: "ETF" },
  
  // Bond ETFs
  BND: { expenseRatio: 0.03, category: "Bonds", type: "ETF" },
  AGG: { expenseRatio: 0.03, category: "Bonds", type: "ETF" },
  SCHZ: { expenseRatio: 0.03, category: "Bonds", type: "ETF" },
  
  // Sector ETFs
  XLK: { expenseRatio: 0.09, category: "Technology", type: "ETF" },
  VGT: { expenseRatio: 0.10, category: "Technology", type: "ETF" },
  XLF: { expenseRatio: 0.09, category: "Financial", type: "ETF" },
  XLV: { expenseRatio: 0.09, category: "Healthcare", type: "ETF" },
  XLE: { expenseRatio: 0.09, category: "Energy", type: "ETF" },
  
  // High fee mutual funds (examples)
  FXAIX: { expenseRatio: 0.015, category: "S&P 500", type: "Mutual Fund" },
  VFIAX: { expenseRatio: 0.04, category: "S&P 500", type: "Mutual Fund" },
  VTSAX: { expenseRatio: 0.04, category: "Total Market", type: "Mutual Fund" },
  
  // Actively managed funds (higher fees)
  ARKK: { expenseRatio: 0.75, category: "Large Cap Growth", type: "ETF" },
  ARKW: { expenseRatio: 0.88, category: "Large Cap Growth", type: "ETF" },
};

/**
 * Determine if a ticker is an ETF or mutual fund
 */
function isFund(ticker: string): boolean {
  // Check known funds
  if (KNOWN_EXPENSE_RATIOS[ticker.toUpperCase()]) {
    return true;
  }
  
  // Heuristics for fund detection:
  // - ETF tickers are usually 3-4 letters
  // - Mutual funds often have 5 letters ending in X
  const upperTicker = ticker.toUpperCase();
  
  // Check for mutual fund patterns (5 chars ending in X)
  if (upperTicker.length === 5 && upperTicker.endsWith("X")) {
    return true;
  }
  
  // Common ETF patterns
  const etfPatterns = [
    /^[A-Z]{3,4}$/, // 3-4 letter tickers often ETFs
    /^SPD/, // SPDR funds
    /^iShares/i,
    /^Vanguard/i,
  ];
  
  return false; // Default to stock
}

/**
 * Get expense ratio for a holding
 */
async function getExpenseRatio(
  ticker: string
): Promise<{ expenseRatio: number | null; category: string; fundType: "ETF" | "Mutual Fund" | "Stock" }> {
  const upperTicker = ticker.toUpperCase();
  
  // Check known expense ratios first
  const known = KNOWN_EXPENSE_RATIOS[upperTicker];
  if (known) {
    return {
      expenseRatio: known.expenseRatio,
      category: known.category,
      fundType: known.type,
    };
  }
  
  // Try to fetch from Alpha Vantage
  try {
    const overviewData = await overview(ticker);
    // Alpha Vantage doesn't provide expense ratios directly
    // We would need a specialized fund data API for this
    // For now, return null for unknown funds/stocks
  } catch (error) {
    console.error(`Error fetching expense ratio for ${ticker}:`, error);
  }
  
  // Check if it's likely a fund
  if (isFund(ticker)) {
    return {
      expenseRatio: null, // Unknown expense ratio
      category: "Unknown",
      fundType: ticker.length === 5 && ticker.endsWith("X") ? "Mutual Fund" : "ETF",
    };
  }
  
  // Individual stock - no expense ratio
  return {
    expenseRatio: null,
    category: "Individual Stock",
    fundType: "Stock",
  };
}

/**
 * Find lower-cost alternatives for a fund
 */
function findAlternatives(
  ticker: string,
  category: string,
  currentExpenseRatio: number,
  holdingValue: number
): FeeAlternative[] {
  const alternatives: FeeAlternative[] = [];
  
  // Get alternatives for this category
  const categoryAlternatives = LOW_COST_ALTERNATIVES[category];
  if (!categoryAlternatives) return alternatives;
  
  for (const alt of categoryAlternatives) {
    // Skip if same ticker or higher expense ratio
    if (alt.ticker === ticker || alt.expenseRatio >= currentExpenseRatio) {
      continue;
    }
    
    const expenseRatioDiff = currentExpenseRatio - alt.expenseRatio;
    const annualSavings = (expenseRatioDiff / 100) * holdingValue;
    
    // Calculate 10-year savings with 7% annual growth
    const growthRate = 0.07;
    let tenYearSavings = 0;
    let currentValue = holdingValue;
    
    for (let year = 1; year <= 10; year++) {
      tenYearSavings += (expenseRatioDiff / 100) * currentValue;
      currentValue *= (1 + growthRate);
    }
    
    alternatives.push({
      currentTicker: ticker,
      currentExpenseRatio,
      alternativeTicker: alt.ticker,
      alternativeName: alt.name,
      alternativeExpenseRatio: alt.expenseRatio,
      annualSavings: Math.round(annualSavings * 100) / 100,
      tenYearSavings: Math.round(tenYearSavings * 100) / 100,
    });
  }
  
  // Sort by savings (highest first) and return top 2
  return alternatives
    .sort((a, b) => b.annualSavings - a.annualSavings)
    .slice(0, 2);
}

/**
 * Project fee impact over time
 */
function projectFeeImpact(
  portfolioValue: number,
  weightedExpenseRatio: number,
  years: number = 30,
  expectedReturn: number = 0.07
): FeeProjection[] {
  const projections: FeeProjection[] = [];
  
  let portfolioWithFees = portfolioValue;
  let portfolioWithoutFees = portfolioValue;
  let cumulativeFeesLost = 0;
  
  for (let year = 1; year <= years; year++) {
    // Portfolio with fees grows at (return - expense ratio)
    const netReturn = expectedReturn - (weightedExpenseRatio / 100);
    portfolioWithFees *= (1 + netReturn);
    
    // Portfolio without fees grows at full return
    portfolioWithoutFees *= (1 + expectedReturn);
    
    // Calculate cumulative fees lost
    cumulativeFeesLost = portfolioWithoutFees - portfolioWithFees;
    
    // Only include key years
    if ([1, 5, 10, 15, 20, 25, 30].includes(year)) {
      projections.push({
        year,
        portfolioWithFees: Math.round(portfolioWithFees),
        portfolioWithoutFees: Math.round(portfolioWithoutFees),
        cumulativeFeesLost: Math.round(cumulativeFeesLost),
      });
    }
  }
  
  return projections;
}

/**
 * Analyze portfolio fees
 */
export async function analyzePortfolioFees(holdings: Holding[]): Promise<FeeAnalysis> {
  const holdingFees: HoldingFee[] = [];
  const allAlternatives: FeeAlternative[] = [];
  
  let totalPortfolioValue = 0;
  let totalAnnualFees = 0;
  let weightedExpenseRatioSum = 0;
  let fundsCount = 0;
  let stocksCount = 0;
  let highestFee = { ticker: "", ratio: 0 };
  let lowestFee = { ticker: "", ratio: Infinity };
  
  // Analyze each holding
  for (const holding of holdings) {
    totalPortfolioValue += holding.currentValue;
    
    const { expenseRatio, category, fundType } = await getExpenseRatio(holding.ticker);
    
    const annualFee = expenseRatio !== null
      ? (expenseRatio / 100) * holding.currentValue
      : 0;
    
    totalAnnualFees += annualFee;
    
    if (expenseRatio !== null) {
      weightedExpenseRatioSum += (expenseRatio / 100) * holding.currentValue;
      
      if (expenseRatio > highestFee.ratio) {
        highestFee = { ticker: holding.ticker, ratio: expenseRatio };
      }
      if (expenseRatio < lowestFee.ratio && expenseRatio > 0) {
        lowestFee = { ticker: holding.ticker, ratio: expenseRatio };
      }
      
      // Find alternatives for funds with meaningful expense ratios
      if (expenseRatio > 0.05 && category !== "Individual Stock") {
        const alternatives = findAlternatives(
          holding.ticker,
          category,
          expenseRatio,
          holding.currentValue
        );
        allAlternatives.push(...alternatives);
      }
    }
    
    if (fundType === "ETF" || fundType === "Mutual Fund") {
      fundsCount++;
    } else {
      stocksCount++;
    }
    
    holdingFees.push({
      ticker: holding.ticker,
      name: holding.name,
      holdingValue: holding.currentValue,
      expenseRatio,
      annualFee: Math.round(annualFee * 100) / 100,
      isFund: fundType !== "Stock",
      fundType,
      category: category !== "Individual Stock" ? category : undefined,
    });
  }
  
  // Calculate weighted average expense ratio
  const weightedAverageExpenseRatio = totalPortfolioValue > 0
    ? (weightedExpenseRatioSum / totalPortfolioValue) * 100
    : 0;
  
  // Generate projections
  const projections = projectFeeImpact(totalPortfolioValue, weightedAverageExpenseRatio);
  
  // Calculate multi-year fee costs
  const tenYearProjection = projections.find(p => p.year === 10);
  const twentyYearProjection = projections.find(p => p.year === 20);
  const thirtyYearProjection = projections.find(p => p.year === 30);
  
  // Calculate potential savings from alternatives
  const potentialAnnualSavings = allAlternatives.reduce(
    (sum, alt) => sum + alt.annualSavings,
    0
  );
  
  // Sort holdings by expense ratio (highest first)
  holdingFees.sort((a, b) => (b.expenseRatio || 0) - (a.expenseRatio || 0));
  
  // Sort alternatives by savings
  allAlternatives.sort((a, b) => b.annualSavings - a.annualSavings);
  
  return {
    holdings: holdingFees,
    totalPortfolioValue: Math.round(totalPortfolioValue * 100) / 100,
    totalAnnualFees: Math.round(totalAnnualFees * 100) / 100,
    weightedAverageExpenseRatio: Math.round(weightedAverageExpenseRatio * 1000) / 1000,
    projections,
    tenYearFeeCost: tenYearProjection?.cumulativeFeesLost || 0,
    twentyYearFeeCost: twentyYearProjection?.cumulativeFeesLost || 0,
    thirtyYearFeeCost: thirtyYearProjection?.cumulativeFeesLost || 0,
    alternatives: allAlternatives.slice(0, 5), // Top 5 alternatives
    potentialAnnualSavings: Math.round(potentialAnnualSavings * 100) / 100,
    highestFeeHolding: highestFee.ratio > 0 ? highestFee.ticker : undefined,
    lowestFeeHolding: lowestFee.ratio < Infinity ? lowestFee.ticker : undefined,
    fundsCount,
    stocksCount,
  };
}
