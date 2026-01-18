/**
 * Tax Planning Module
 * 
 * Provides tax-related calculations:
 * - Tax-loss harvesting opportunities
 * - Capital gains analysis
 * - Roth conversion modeling
 */

import type { 
  Holding, 
  TaxLossHarvesting, 
  TaxHolding, 
  HoldingPeriod,
  RothConversionInput,
  RothConversionResult,
} from "@shared/schema";

// Default tax rates (2024 US federal rates)
const DEFAULT_SHORT_TERM_RATE = 0.32; // Assuming 32% bracket
const DEFAULT_LONG_TERM_RATE = 0.15; // 15% LTCG rate

// Long-term holding threshold (1 year + 1 day)
const LONG_TERM_DAYS = 366;

/**
 * Determine holding period based on purchase date or default to long-term
 */
function getHoldingPeriod(purchaseDate?: string): { period: HoldingPeriod; daysHeld: number } {
  if (!purchaseDate) {
    // Default to long-term if no purchase date
    return { period: "long-term", daysHeld: 400 };
  }
  
  const purchase = new Date(purchaseDate);
  const now = new Date();
  const daysHeld = Math.floor((now.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    period: daysHeld >= LONG_TERM_DAYS ? "long-term" : "short-term",
    daysHeld,
  };
}

/**
 * Analyze portfolio for tax-loss harvesting opportunities
 */
export function analyzeTaxLossHarvesting(
  holdings: Holding[],
  shortTermRate: number = DEFAULT_SHORT_TERM_RATE,
  longTermRate: number = DEFAULT_LONG_TERM_RATE
): TaxLossHarvesting {
  const taxHoldings: TaxHolding[] = [];
  
  let totalUnrealizedLosses = 0;
  let totalUnrealizedGains = 0;
  let shortTermLosses = 0;
  let longTermLosses = 0;
  let shortTermGains = 0;
  let longTermGains = 0;
  let totalPotentialTaxSavings = 0;
  let estimatedTaxLiability = 0;
  
  for (const holding of holdings) {
    const unrealizedGainLoss = holding.currentValue - holding.costBasis;
    const unrealizedGainLossPercent = holding.costBasis > 0 
      ? (unrealizedGainLoss / holding.costBasis) * 100 
      : 0;
    const isLoss = unrealizedGainLoss < 0;
    
    // Determine holding period (mock - in real app would track actual dates)
    const { period: holdingPeriod, daysHeld } = getHoldingPeriod();
    
    // Calculate tax impact
    const applicableRate = holdingPeriod === "short-term" ? shortTermRate : longTermRate;
    
    let potentialTaxSavings = 0;
    let estimatedTax = 0;
    
    if (isLoss) {
      potentialTaxSavings = Math.abs(unrealizedGainLoss) * applicableRate;
      totalUnrealizedLosses += Math.abs(unrealizedGainLoss);
      
      if (holdingPeriod === "short-term") {
        shortTermLosses += Math.abs(unrealizedGainLoss);
      } else {
        longTermLosses += Math.abs(unrealizedGainLoss);
      }
      
      totalPotentialTaxSavings += potentialTaxSavings;
    } else {
      estimatedTax = unrealizedGainLoss * applicableRate;
      totalUnrealizedGains += unrealizedGainLoss;
      
      if (holdingPeriod === "short-term") {
        shortTermGains += unrealizedGainLoss;
      } else {
        longTermGains += unrealizedGainLoss;
      }
      
      estimatedTaxLiability += estimatedTax;
    }
    
    taxHoldings.push({
      ticker: holding.ticker,
      name: holding.name,
      quantity: holding.quantity,
      costBasis: holding.costBasis,
      currentValue: holding.currentValue,
      unrealizedGainLoss: Math.round(unrealizedGainLoss * 100) / 100,
      unrealizedGainLossPercent: Math.round(unrealizedGainLossPercent * 100) / 100,
      isLoss,
      potentialTaxSavings: Math.round(potentialTaxSavings * 100) / 100,
      estimatedTax: Math.round(estimatedTax * 100) / 100,
      holdingPeriod,
      daysHeld,
    });
  }
  
  // Sort by unrealized gain/loss (losses first, then gains)
  taxHoldings.sort((a, b) => a.unrealizedGainLoss - b.unrealizedGainLoss);
  
  const netGainLoss = totalUnrealizedGains - totalUnrealizedLosses;
  
  return {
    holdings: taxHoldings,
    totalUnrealizedLosses: Math.round(totalUnrealizedLosses * 100) / 100,
    shortTermLosses: Math.round(shortTermLosses * 100) / 100,
    longTermLosses: Math.round(longTermLosses * 100) / 100,
    totalPotentialTaxSavings: Math.round(totalPotentialTaxSavings * 100) / 100,
    totalUnrealizedGains: Math.round(totalUnrealizedGains * 100) / 100,
    shortTermGains: Math.round(shortTermGains * 100) / 100,
    longTermGains: Math.round(longTermGains * 100) / 100,
    estimatedTaxLiability: Math.round(estimatedTaxLiability * 100) / 100,
    netGainLoss: Math.round(netGainLoss * 100) / 100,
    shortTermRate: shortTermRate * 100,
    longTermRate: longTermRate * 100,
  };
}

/**
 * Calculate Roth conversion analysis
 * 
 * Compares keeping money in Traditional IRA vs converting to Roth IRA
 */
export function calculateRothConversion(input: RothConversionInput): RothConversionResult {
  const {
    conversionAmount,
    currentAge,
    retirementAge,
    currentTaxBracket,
    expectedRetirementTaxBracket,
    expectedReturn,
  } = input;
  
  const yearsToRetirement = retirementAge - currentAge;
  
  // Tax on conversion (paid now from taxable funds)
  const taxOnConversion = conversionAmount * (currentTaxBracket / 100);
  const effectiveTaxRate = currentTaxBracket;
  
  // Future value if converted to Roth (grows tax-free)
  const futureValueIfConverted = conversionAmount * Math.pow(1 + expectedReturn, yearsToRetirement);
  
  // Future value if NOT converted (stays in Traditional)
  const futureValueIfNotConverted = conversionAmount * Math.pow(1 + expectedReturn, yearsToRetirement);
  
  // Tax on Traditional withdrawal at retirement
  const taxOnTraditionalWithdrawal = futureValueIfNotConverted * (expectedRetirementTaxBracket / 100);
  const afterTaxTraditional = futureValueIfNotConverted - taxOnTraditionalWithdrawal;
  
  // Roth advantage (positive = Roth is better)
  // Compare: Roth future value vs Traditional after-tax value + opportunity cost of conversion tax
  const taxInvestmentGrowth = taxOnConversion * Math.pow(1 + expectedReturn, yearsToRetirement);
  const rothAdvantage = futureValueIfConverted - (afterTaxTraditional + taxInvestmentGrowth);
  
  // Calculate break-even years
  // Find n where: conversionAmount * (1+r)^n = conversionAmount * (1+r)^n * (1 - retirementRate) + taxOnConversion * (1+r)^n
  // Simplified: Find when Roth catches up to Traditional + invested tax savings
  let breakEvenYears = 0;
  if (currentTaxBracket < expectedRetirementTaxBracket) {
    // Roth is immediately better if current rate < retirement rate
    breakEvenYears = 0;
  } else if (currentTaxBracket === expectedRetirementTaxBracket) {
    // Break even immediately (ignoring state taxes, etc.)
    breakEvenYears = 0;
  } else {
    // Calculate break-even
    const rateDiff = (currentTaxBracket - expectedRetirementTaxBracket) / 100;
    // Approximate break-even using logarithmic approach
    const taxRatio = taxOnConversion / conversionAmount;
    const retirementTaxRatio = expectedRetirementTaxBracket / 100;
    
    if (rateDiff > 0 && expectedReturn > 0) {
      // Solve for n: (1-retirementRate)*(1+r)^n = (1+r)^n - taxRatio*(1+r)^n
      // This simplifies to finding when the benefit of lower future taxes equals current tax cost
      breakEvenYears = Math.ceil(
        Math.log(taxRatio / retirementTaxRatio) / Math.log(1 + expectedReturn)
      );
      if (breakEvenYears < 0 || !isFinite(breakEvenYears)) {
        breakEvenYears = 99; // Never breaks even
      }
    } else {
      breakEvenYears = 99; // Never breaks even
    }
  }
  
  // Generate recommendation
  let recommendation: string;
  if (rothAdvantage > 0) {
    if (currentTaxBracket <= expectedRetirementTaxBracket) {
      recommendation = "Convert to Roth - you'll pay the same or lower tax rate now vs retirement.";
    } else {
      recommendation = `Convert to Roth - despite higher current rate, tax-free growth makes it worthwhile over ${yearsToRetirement} years.`;
    }
  } else if (rothAdvantage > -1000) {
    recommendation = "Conversion is roughly neutral. Consider other factors like estate planning and RMD avoidance.";
  } else {
    recommendation = `Keep in Traditional - projected ${Math.abs(rothAdvantage).toFixed(0)} more after-tax value at retirement.`;
  }
  
  return {
    conversionAmount,
    taxOnConversion: Math.round(taxOnConversion * 100) / 100,
    effectiveTaxRate,
    yearsToRetirement,
    futureValueIfConverted: Math.round(futureValueIfConverted),
    futureValueIfNotConverted: Math.round(futureValueIfNotConverted),
    taxOnTraditionalWithdrawal: Math.round(taxOnTraditionalWithdrawal),
    afterTaxTraditional: Math.round(afterTaxTraditional),
    rothAdvantage: Math.round(rothAdvantage),
    breakEvenYears: Math.min(breakEvenYears, 99),
    recommendation,
  };
}

/**
 * Get tax bracket based on income (simplified 2024 single filer brackets)
 */
export function getTaxBracket(annualIncome: number): number {
  if (annualIncome <= 11600) return 10;
  if (annualIncome <= 47150) return 12;
  if (annualIncome <= 100525) return 22;
  if (annualIncome <= 191950) return 24;
  if (annualIncome <= 243725) return 32;
  if (annualIncome <= 609350) return 35;
  return 37;
}
