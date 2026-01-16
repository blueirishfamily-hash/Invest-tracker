import { globalQuote, overview, timeSeriesDailyAdjusted } from "./alpha-vantage";

export interface DividendRecord {
  date: string; // Payment date
  amount: number; // Dividend amount per share
  exDate?: string; // Ex-dividend date
}

export interface DividendSchedule {
  ticker: string;
  name: string;
  quantity: number;
  paymentDate: string;
  amountPerShare: number;
  totalAmount: number;
  frequency: string;
  yield: number; // Dividend yield percentage
  exDividendDate?: string;
}

/**
 * Fetches historical dividend data from Alpha Vantage
 * Uses TIME_SERIES_DAILY_ADJUSTED which includes dividend amounts
 */
export async function fetchDividendHistory(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<DividendRecord[]> {
  try {
    // Fetch daily adjusted data which includes dividend amounts
    const timeSeries = await timeSeriesDailyAdjusted(symbol, "full");
    
    if (!timeSeries || timeSeries.length === 0) {
      return [];
    }

    // Extract dividends from adjusted close prices
    // Dividends are indicated by differences between close and adjusted close
    // Also check for dividend amount field if available
    const dividends: DividendRecord[] = [];
    
    for (const item of timeSeries) {
      const itemDate = new Date(item.date);
      
      // Only process dates within range
      if (itemDate < startDate || itemDate > endDate) {
        continue;
      }
      
      // Check if dividend amount is explicitly provided
      if (item.dividendAmount && item.dividendAmount > 0) {
        dividends.push({
          date: item.date,
          amount: item.dividendAmount,
          exDate: item.date, // Use same date as ex-date if not available
        });
      }
    }

    // Sort by date descending (most recent first)
    return dividends.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error(`Error fetching dividend history for ${symbol}:`, error);
    return [];
  }
}

/**
 * Determines dividend payment frequency from historical data
 */
export function getDividendFrequency(history: DividendRecord[]): string {
  if (history.length === 0) {
    return "Unknown";
  }

  if (history.length === 1) {
    return "Annual";
  }

  // Calculate average days between payments
  const dates = history.map((h) => new Date(h.date).getTime()).sort((a, b) => b - a);
  const intervals: number[] = [];
  
  for (let i = 0; i < dates.length - 1; i++) {
    const daysDiff = (dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24);
    intervals.push(daysDiff);
  }

  const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  const paymentsPerYear = 365 / avgInterval;

  // Classify frequency
  if (paymentsPerYear >= 11) return "Monthly";
  if (paymentsPerYear >= 3.5 && paymentsPerYear <= 4.5) return "Quarterly";
  if (paymentsPerYear >= 1.8 && paymentsPerYear <= 2.2) return "Semi-Annual";
  if (paymentsPerYear >= 0.8 && paymentsPerYear <= 1.2) return "Annual";
  
  return "Irregular";
}

/**
 * Safely get number value
 */
function getNumber(value: any): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Estimates upcoming dividends for the current year based on historical pattern
 */
export async function estimateUpcomingDividends(
  symbol: string,
  quantity: number,
  currentPrice: number,
  currentYear: number
): Promise<DividendSchedule[]> {
  const now = new Date();
  const startDate = new Date(currentYear - 2, 0, 1); // 2 years ago
  const endDate = new Date(currentYear, 11, 31); // End of current year

  // Fetch historical dividend data
  const history = await fetchDividendHistory(symbol, startDate, endDate);

  if (history.length === 0) {
    // Try to get dividend data from overview as fallback
    try {
      const overviewData = await overview(symbol);
      const dividendYield = getNumber(overviewData.DividendYield);
      const dividendPerShare = getNumber(overviewData.DividendPerShare);
      
      if (dividendYield > 0 || dividendPerShare > 0) {
        // Calculate annual dividend
        let annualDividend: number;
        if (dividendPerShare > 0) {
          annualDividend = dividendPerShare;
        } else if (currentPrice > 0 && dividendYield > 0) {
          annualDividend = (currentPrice * dividendYield) / 100;
        } else {
          return [];
        }
        
        // Estimate quarterly payments if we have dividend data
        const quarterlyAmount = annualDividend / 4;
        const frequency = "Quarterly";
        
        // Estimate next 4 payments (quarterly)
        const schedules: DividendSchedule[] = [];
        const today = new Date();
        const nextQuarter = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
        
        for (let i = 0; i < 4; i++) {
          const paymentDate = new Date(nextQuarter);
          paymentDate.setMonth(nextQuarter.getMonth() + i * 3);
          paymentDate.setDate(15); // Assume payment on 15th of month
          
          if (paymentDate <= endDate && paymentDate >= today) {
            const yieldPercent = currentPrice > 0 ? (annualDividend / currentPrice) * 100 : dividendYield;
            schedules.push({
              ticker: symbol,
              name: overviewData.Name || symbol,
              quantity,
              paymentDate: paymentDate.toISOString().split("T")[0],
              amountPerShare: quarterlyAmount,
              totalAmount: quarterlyAmount * quantity,
              frequency,
              yield: yieldPercent,
            });
          }
        }
        
        return schedules;
      }
    } catch (error) {
      console.warn(`Could not get dividend estimate from overview for ${symbol}:`, error);
    }
    
    return [];
  }

  // Determine frequency
  const frequency = getDividendFrequency(history);

  // Get most recent dividend
  const mostRecent = history[0];
  if (!mostRecent) {
    return [];
  }

  // Calculate average dividend amount (use last few payments to account for increases)
  const recentAmounts = history.slice(0, Math.min(4, history.length)).map((h) => h.amount);
  const avgAmount = recentAmounts.reduce((sum, val) => sum + val, 0) / recentAmounts.length;
  const estimatedAmount = mostRecent.amount; // Use most recent as primary estimate

  // Calculate interval in days based on frequency
  let intervalDays: number;
  switch (frequency) {
    case "Monthly":
      intervalDays = 30;
      break;
    case "Quarterly":
      intervalDays = 90;
      break;
    case "Semi-Annual":
      intervalDays = 180;
      break;
    case "Annual":
      intervalDays = 365;
      break;
    default:
      // Calculate from average interval
      const dates = history.map((h) => new Date(h.date).getTime()).sort((a, b) => b - a);
      if (dates.length > 1) {
        const totalDays = dates[0] - dates[dates.length - 1];
        intervalDays = totalDays / (dates.length - 1);
      } else {
        intervalDays = 90; // Default to quarterly
      }
  }

  // Calculate upcoming payments
  const schedules: DividendSchedule[] = [];
  const lastPaymentDate = new Date(mostRecent.date);
  let nextPaymentDate = new Date(lastPaymentDate);
  nextPaymentDate.setDate(nextPaymentDate.getDate() + intervalDays);

  // Project dividends until end of year
  while (nextPaymentDate <= endDate && nextPaymentDate >= now) {
    const annualDividend = estimatedAmount * (365 / intervalDays);
    const dividendYield = currentPrice > 0 ? (annualDividend / currentPrice) * 100 : 0;

    schedules.push({
      ticker: symbol,
      name: "", // Will be filled by caller
      quantity,
      paymentDate: nextPaymentDate.toISOString().split("T")[0],
      amountPerShare: estimatedAmount,
      totalAmount: estimatedAmount * quantity,
      frequency,
      yield: dividendYield,
      exDividendDate: mostRecent.exDate,
    });

    // Move to next payment
    nextPaymentDate = new Date(nextPaymentDate);
    nextPaymentDate.setDate(nextPaymentDate.getDate() + intervalDays);
  }

  return schedules;
}

/**
 * Gets company name from quote
 */
export async function getCompanyName(symbol: string): Promise<string> {
  try {
    const overviewData = await overview(symbol);
    return overviewData.Name || symbol;
  } catch (error) {
    console.warn(`Could not fetch company name for ${symbol}:`, error);
    // Fallback to quote
    try {
      const quote = await globalQuote(symbol);
      return quote.symbol || symbol;
    } catch {
      return symbol;
    }
  }
}
