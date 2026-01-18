/**
 * Cash Flow Forecasting Module
 * 
 * Projects future net worth based on:
 * - Current portfolio value
 * - Monthly savings rate
 * - Expected investment returns
 * - Planned expenses/income events
 */

import type {
  CashFlowInput,
  CashFlowProjection,
  YearlyProjection,
  FinancialMilestone,
  PlannedExpense,
} from "@shared/schema";

// Default milestones to track
const DEFAULT_MILESTONES = [
  { name: "Emergency Fund (6 months)", multiplier: 0.5 }, // 6 months of annual expenses
  { name: "$100K Net Worth", amount: 100000 },
  { name: "$250K Net Worth", amount: 250000 },
  { name: "$500K Net Worth", amount: 500000 },
  { name: "$1M Net Worth", amount: 1000000 },
  { name: "$2M Net Worth", amount: 2000000 },
  { name: "Coast FIRE", multiplier: 0.25 }, // 25% of full FIRE number
  { name: "Lean FIRE", multiplier: 0.5 }, // 50% of full FIRE number
  { name: "Full FIRE (25x expenses)", multiplier: 1 },
];

/**
 * Project cash flow year-by-year
 */
export function projectCashFlow(input: CashFlowInput): CashFlowProjection {
  const {
    currentNetWorth,
    monthlyIncome,
    monthlyExpenses,
    monthlySavings,
    expectedReturn,
    inflationRate,
    yearsToProject,
    plannedExpenses = [],
  } = input;
  
  const yearlyData: YearlyProjection[] = [];
  
  let netWorth = currentNetWorth;
  let cumulativeContributions = 0;
  let cumulativeGains = 0;
  let totalPlannedExpenses = 0;
  
  // Inflation-adjusted annual savings
  let annualSavings = monthlySavings * 12;
  
  // Create a map of planned expenses by year
  const expensesByYear = new Map<number, number>();
  for (const expense of plannedExpenses) {
    const currentYearExpenses = expensesByYear.get(expense.year) || 0;
    const amount = expense.type === "expense" ? expense.amount : -expense.amount;
    expensesByYear.set(expense.year, currentYearExpenses + amount);
  }
  
  const currentYear = new Date().getFullYear();
  
  for (let year = 0; year <= yearsToProject; year++) {
    const calendarYear = currentYear + year;
    const startingNetWorth = netWorth;
    
    // Get planned expenses for this year
    const yearExpenses = expensesByYear.get(calendarYear) || 0;
    
    // Calculate investment gains on starting balance
    const investmentGains = year === 0 ? 0 : startingNetWorth * expectedReturn;
    
    // Contributions (savings) for the year
    const contributions = year === 0 ? 0 : annualSavings;
    
    // Ending net worth
    netWorth = startingNetWorth + investmentGains + contributions - yearExpenses;
    
    // Track cumulative totals
    cumulativeContributions += contributions;
    cumulativeGains += investmentGains;
    totalPlannedExpenses += yearExpenses;
    
    yearlyData.push({
      year: calendarYear,
      startingNetWorth: Math.round(startingNetWorth),
      contributions: Math.round(contributions),
      investmentGains: Math.round(investmentGains),
      plannedExpenses: Math.round(yearExpenses),
      endingNetWorth: Math.round(netWorth),
      cumulativeContributions: Math.round(cumulativeContributions),
      cumulativeGains: Math.round(cumulativeGains),
    });
    
    // Adjust savings for inflation for next year
    annualSavings *= (1 + inflationRate);
  }
  
  // Calculate savings rate
  const annualIncome = monthlyIncome * 12;
  const savingsRate = annualIncome > 0 ? (monthlySavings * 12 / annualIncome) * 100 : 0;
  
  // Calculate effective growth rate
  const effectiveGrowthRate = currentNetWorth > 0
    ? Math.pow(netWorth / currentNetWorth, 1 / yearsToProject) - 1
    : expectedReturn;
  
  // Calculate milestones
  const annualExpenses = monthlyExpenses * 12;
  const fireNumber = annualExpenses * 25; // 4% rule
  
  const milestones = calculateMilestones(
    currentNetWorth,
    yearlyData,
    annualExpenses,
    fireNumber
  );
  
  // Key net worth points
  const netWorthIn5Years = yearlyData.find(y => y.year === currentYear + 5)?.endingNetWorth || 0;
  const netWorthIn10Years = yearlyData.find(y => y.year === currentYear + 10)?.endingNetWorth || 0;
  const netWorthIn20Years = yearlyData.find(y => y.year === currentYear + 20)?.endingNetWorth || 0;
  
  return {
    yearlyData,
    finalNetWorth: Math.round(netWorth),
    totalContributions: Math.round(cumulativeContributions),
    totalInvestmentGains: Math.round(cumulativeGains),
    totalPlannedExpenses: Math.round(totalPlannedExpenses),
    savingsRate: Math.round(savingsRate * 10) / 10,
    effectiveGrowthRate: Math.round(effectiveGrowthRate * 1000) / 10,
    milestones,
    netWorthIn5Years,
    netWorthIn10Years,
    netWorthIn20Years,
  };
}

/**
 * Calculate when financial milestones will be reached
 */
function calculateMilestones(
  currentNetWorth: number,
  yearlyData: YearlyProjection[],
  annualExpenses: number,
  fireNumber: number
): FinancialMilestone[] {
  const milestones: FinancialMilestone[] = [];
  const currentYear = new Date().getFullYear();
  
  // Define milestone targets
  const milestoneTargets = [
    { name: "Emergency Fund (6 months)", amount: annualExpenses * 0.5 },
    { name: "$100K Net Worth", amount: 100000 },
    { name: "$250K Net Worth", amount: 250000 },
    { name: "$500K Net Worth", amount: 500000 },
    { name: "$1M Net Worth", amount: 1000000 },
    { name: "$2M Net Worth", amount: 2000000 },
    { name: "Coast FIRE (25%)", amount: fireNumber * 0.25 },
    { name: "Lean FIRE (50%)", amount: fireNumber * 0.5 },
    { name: "Full FIRE", amount: fireNumber },
  ];
  
  for (const target of milestoneTargets) {
    const isAchieved = currentNetWorth >= target.amount;
    const progressPercent = Math.min((currentNetWorth / target.amount) * 100, 100);
    
    let estimatedYear: number | null = null;
    let estimatedDate: string | null = null;
    let yearsAway: number | null = null;
    
    if (!isAchieved) {
      // Find the year when this milestone is reached
      const achievementYear = yearlyData.find(y => y.endingNetWorth >= target.amount);
      
      if (achievementYear) {
        estimatedYear = achievementYear.year;
        yearsAway = achievementYear.year - currentYear;
        estimatedDate = `${achievementYear.year}`;
      }
    }
    
    milestones.push({
      name: target.name,
      targetAmount: Math.round(target.amount),
      estimatedYear,
      estimatedDate,
      yearsAway,
      isAchieved,
      progressPercent: Math.round(progressPercent * 10) / 10,
    });
  }
  
  return milestones;
}

/**
 * Get default cash flow values based on portfolio
 */
export function getCashFlowDefaults(
  currentNetWorth: number,
  monthlyExpenses: number = 5000
): {
  currentNetWorth: number;
  estimatedMonthlySavings: number;
  suggestedMilestones: Array<{ name: string; amount: number }>;
} {
  // Estimate monthly savings as 20% of net worth / 12 (very rough estimate)
  // In practice, this would come from actual income/expense tracking
  const estimatedMonthlySavings = Math.round(currentNetWorth * 0.02); // 2% of net worth annually / 12
  
  const annualExpenses = monthlyExpenses * 12;
  const fireNumber = annualExpenses * 25;
  
  const suggestedMilestones = [
    { name: "Emergency Fund", amount: annualExpenses * 0.5 },
    { name: "Half FIRE", amount: fireNumber * 0.5 },
    { name: "Full FIRE", amount: fireNumber },
  ];
  
  return {
    currentNetWorth,
    estimatedMonthlySavings,
    suggestedMilestones,
  };
}

/**
 * Calculate compound growth
 */
export function calculateCompoundGrowth(
  principal: number,
  monthlyContribution: number,
  annualRate: number,
  years: number
): number {
  const monthlyRate = annualRate / 12;
  const months = years * 12;
  
  // Future value of principal
  const fvPrincipal = principal * Math.pow(1 + annualRate, years);
  
  // Future value of annuity (monthly contributions)
  const fvAnnuity = monthlyContribution * (
    (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate
  );
  
  return fvPrincipal + fvAnnuity;
}
