/**
 * Monte Carlo Simulation Engine
 * 
 * Runs thousands of simulations to project portfolio growth and
 * determine the probability of reaching financial goals.
 * 
 * Uses log-normal distribution for returns to model realistic
 * market behavior (positive skew, fat tails).
 */

import type { MonteCarloInput, MonteCarloResult, YearlyPercentiles } from "@shared/schema";

/**
 * Box-Muller transform to generate standard normal random numbers
 * More accurate than simple approximations
 */
function randomNormal(): number {
  let u1 = 0, u2 = 0;
  // Avoid log(0)
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Generate a log-normal return
 * 
 * @param expectedReturn Annual expected return (e.g., 0.07 for 7%)
 * @param volatility Annual standard deviation (e.g., 0.15 for 15%)
 * @returns A single year's return multiplier (e.g., 1.08 for 8% return)
 */
function generateLogNormalReturn(expectedReturn: number, volatility: number): number {
  // Convert arithmetic mean to geometric mean for log-normal
  // mu = ln(1 + expectedReturn) - 0.5 * sigma^2
  const mu = Math.log(1 + expectedReturn) - 0.5 * volatility * volatility;
  const sigma = volatility;
  
  // Generate log-normal return
  const z = randomNormal();
  return Math.exp(mu + sigma * z);
}

/**
 * Run a single simulation path
 * 
 * @param input Simulation parameters
 * @returns Array of portfolio values for each year (starting from year 0)
 */
function runSingleSimulation(input: MonteCarloInput): number[] {
  const {
    currentPortfolioValue,
    annualContribution,
    yearsToRetirement,
    expectedReturn,
    volatility,
    inflationRate,
  } = input;
  
  const values: number[] = [currentPortfolioValue];
  let portfolioValue = currentPortfolioValue;
  
  // Adjust contribution for inflation each year
  let adjustedContribution = annualContribution;
  
  for (let year = 1; year <= yearsToRetirement; year++) {
    // Generate this year's return
    const returnMultiplier = generateLogNormalReturn(expectedReturn, volatility);
    
    // Apply return to portfolio
    portfolioValue = portfolioValue * returnMultiplier;
    
    // Add contribution (made at end of year)
    portfolioValue += adjustedContribution;
    
    // Adjust contribution for next year's inflation
    adjustedContribution *= (1 + inflationRate);
    
    values.push(portfolioValue);
  }
  
  return values;
}

/**
 * Calculate percentile value from sorted array
 */
function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  
  const index = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) return sortedArr[lower];
  
  // Linear interpolation
  const fraction = index - lower;
  return sortedArr[lower] * (1 - fraction) + sortedArr[upper] * fraction;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1);
  
  return Math.sqrt(variance);
}

/**
 * Run Monte Carlo simulation
 * 
 * @param input Simulation parameters
 * @returns Simulation results with success rate, percentiles, and statistics
 */
export function runMonteCarloSimulation(input: MonteCarloInput): MonteCarloResult {
  const startTime = Date.now();
  
  const {
    targetAmount,
    yearsToRetirement,
    numSimulations,
  } = input;
  
  // Store all simulation paths
  const allPaths: number[][] = [];
  const finalValues: number[] = [];
  
  // Run simulations
  for (let i = 0; i < numSimulations; i++) {
    const path = runSingleSimulation(input);
    allPaths.push(path);
    finalValues.push(path[path.length - 1]);
  }
  
  // Sort final values for percentile calculations
  const sortedFinalValues = [...finalValues].sort((a, b) => a - b);
  
  // Calculate success rate (reaching target amount)
  const successCount = finalValues.filter(v => v >= targetAmount).length;
  const successRate = (successCount / numSimulations) * 100;
  
  // Calculate final value percentiles
  const percentiles = {
    p10: percentile(sortedFinalValues, 10),
    p25: percentile(sortedFinalValues, 25),
    p50: percentile(sortedFinalValues, 50),
    p75: percentile(sortedFinalValues, 75),
    p90: percentile(sortedFinalValues, 90),
  };
  
  // Calculate year-by-year percentiles for fan chart
  const yearlyPercentiles: YearlyPercentiles[] = [];
  
  for (let year = 0; year <= yearsToRetirement; year++) {
    const yearValues = allPaths.map(path => path[year]);
    const sortedYearValues = [...yearValues].sort((a, b) => a - b);
    
    yearlyPercentiles.push({
      year,
      p10: percentile(sortedYearValues, 10),
      p25: percentile(sortedYearValues, 25),
      p50: percentile(sortedYearValues, 50),
      p75: percentile(sortedYearValues, 75),
      p90: percentile(sortedYearValues, 90),
    });
  }
  
  // Calculate statistics
  const mean = finalValues.reduce((sum, v) => sum + v, 0) / finalValues.length;
  const median = percentiles.p50;
  const min = Math.min(...finalValues);
  const max = Math.max(...finalValues);
  const stdDev = standardDeviation(finalValues);
  
  const calculationTimeMs = Date.now() - startTime;
  
  return {
    successRate: Math.round(successRate * 10) / 10,
    successCount,
    failureCount: numSimulations - successCount,
    percentiles: {
      p10: Math.round(percentiles.p10),
      p25: Math.round(percentiles.p25),
      p50: Math.round(percentiles.p50),
      p75: Math.round(percentiles.p75),
      p90: Math.round(percentiles.p90),
    },
    yearlyPercentiles: yearlyPercentiles.map(yp => ({
      year: yp.year,
      p10: Math.round(yp.p10),
      p25: Math.round(yp.p25),
      p50: Math.round(yp.p50),
      p75: Math.round(yp.p75),
      p90: Math.round(yp.p90),
    })),
    statistics: {
      mean: Math.round(mean),
      median: Math.round(median),
      min: Math.round(min),
      max: Math.round(max),
      stdDev: Math.round(stdDev),
    },
    inputs: input,
    simulationsRun: numSimulations,
    calculationTimeMs,
  };
}

/**
 * Calculate suggested FIRE target based on current spending
 * Uses the 4% rule (25x annual expenses)
 * 
 * @param annualExpenses Estimated annual expenses in retirement
 * @returns Suggested target portfolio value
 */
export function calculateFIRETarget(annualExpenses: number): number {
  return annualExpenses * 25;
}

/**
 * Calculate years to FIRE based on savings rate
 * Uses the simplified formula: ln((1 + target/savings) / (1 + portfolio/savings)) / ln(1 + return)
 * 
 * @param currentPortfolio Current portfolio value
 * @param annualSavings Annual savings amount
 * @param targetAmount FIRE target amount
 * @param expectedReturn Expected annual return (as decimal)
 * @returns Estimated years to reach target
 */
export function estimateYearsToFIRE(
  currentPortfolio: number,
  annualSavings: number,
  targetAmount: number,
  expectedReturn: number
): number {
  if (annualSavings <= 0) return Infinity;
  if (currentPortfolio >= targetAmount) return 0;
  
  // Use future value of annuity formula solved for n
  // FV = PV(1+r)^n + PMT * ((1+r)^n - 1) / r
  // This is an approximation using numerical methods
  
  const r = expectedReturn;
  let years = 0;
  let portfolio = currentPortfolio;
  
  while (portfolio < targetAmount && years < 100) {
    portfolio = portfolio * (1 + r) + annualSavings;
    years++;
  }
  
  return years;
}
