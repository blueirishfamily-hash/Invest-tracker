import {
  globalQuote,
  overview,
  earnings,
  incomeStatement,
  balanceSheet,
  cashFlow,
} from "./alpha-vantage";

export interface FinancialData {
  overview: {
    currentPrice: number;
    marketCap: number;
    peRatio: number;
    volume: number;
    averageVolume: number;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
    dividendYield?: number;
    beta?: number;
  };
  earnings: {
    epsTTM: number;
    epsQuarterly: Array<{ quarter: string; eps: number; date: string }>;
    earningsHistory: Array<{ date: string; actual: number; estimate: number }>;
    earningsEstimates: { nextQuarter?: number; nextYear?: number };
  };
  revenue: {
    revenueTTM: number;
    revenueQuarterly: Array<{ quarter: string; revenue: number; date: string }>;
    revenueGrowth: { yoy?: number; qoq?: number };
  };
  growth: {
    revenueGrowthYoy: number;
    revenueGrowthQoq: number;
    earningsGrowthYoy: number;
    earningsGrowthQoq: number;
    profitMargin: number;
    profitMarginTTM: number;
  };
  financials: {
    balanceSheet: {
      totalAssets: number;
      totalLiabilities: number;
      totalEquity: number;
      cash: number;
      debt: number;
    };
    cashFlow: {
      operatingCashFlow: number;
      freeCashFlow: number;
      cashFlowTTM: number;
    };
    ratios: {
      roe: number;
      roa: number;
      debtToEquity: number;
      currentRatio: number;
      quickRatio: number;
    };
  };
}

/**
 * Safely get number value from financial data
 */
function getNumber(value: any): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    // Remove commas and parse
    const cleaned = value.replace(/,/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Safely get number value or undefined
 */
function getNumberOrUndefined(value: any): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    if (value === "None" || value === "N/A") return undefined;
    const cleaned = value.replace(/,/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? undefined : parsed;
  }
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Format date from Alpha Vantage format to quarter label
 */
function formatQuarter(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();
    const quarterNum = Math.floor(month / 3) + 1;
    return `Q${quarterNum} ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Fetches comprehensive financial data from Alpha Vantage
 */
export async function fetchFinancialData(symbol: string): Promise<FinancialData | null> {
  try {
    // Make parallel API calls where possible (but be mindful of rate limits)
    const [quoteData, overviewData, earningsData, incomeData, balanceData, cashflowData] = await Promise.allSettled([
      globalQuote(symbol),
      overview(symbol),
      earnings(symbol),
      incomeStatement(symbol),
      balanceSheet(symbol),
      cashFlow(symbol),
    ]);

    // Extract data from promises
    const quote = quoteData.status === "fulfilled" ? quoteData.value : null;
    const overviewResult = overviewData.status === "fulfilled" ? overviewData.value : {};
    const earningsResult = earningsData.status === "fulfilled" ? earningsData.value : {};
    const incomeResult = incomeData.status === "fulfilled" ? incomeData.value : {};
    const balanceResult = balanceData.status === "fulfilled" ? balanceData.value : {};
    const cashflowResult = cashflowData.status === "fulfilled" ? cashflowData.value : {};

    // Parse income statements
    const annualReports = incomeResult.annualReports || [];
    const quarterlyReports = incomeResult.quarterlyReports || [];
    
    const latestIncome = annualReports[0] || {};
    const previousIncome = annualReports[1] || {};
    const latestIncomeQuarterly = quarterlyReports[0] || {};
    const previousIncomeQuarterly = quarterlyReports[1] || {};

    // Calculate revenue growth
    const revenueTTM = getNumber(latestIncome.totalRevenue);
    const previousRevenueTTM = getNumber(previousIncome.totalRevenue);
    const revenueQuarterly = getNumber(latestIncomeQuarterly.totalRevenue);
    const previousRevenueQuarterly = getNumber(previousIncomeQuarterly.totalRevenue);
    
    const revenueGrowthYoy = previousRevenueTTM > 0 
      ? ((revenueTTM - previousRevenueTTM) / previousRevenueTTM) * 100 
      : 0;
    const revenueGrowthQoq = previousRevenueQuarterly > 0
      ? ((revenueQuarterly - previousRevenueQuarterly) / previousRevenueQuarterly) * 100
      : 0;

    // Calculate earnings growth
    const netIncome = getNumber(latestIncome.netIncome);
    const previousNetIncome = getNumber(previousIncome.netIncome);
    const netIncomeQuarterly = getNumber(latestIncomeQuarterly.netIncome);
    const previousNetIncomeQuarterly = getNumber(previousIncomeQuarterly.netIncome);
    
    const earningsGrowthYoy = previousNetIncome > 0
      ? ((netIncome - previousNetIncome) / Math.abs(previousNetIncome)) * 100
      : 0;
    const earningsGrowthQoq = previousNetIncomeQuarterly !== 0
      ? ((netIncomeQuarterly - previousNetIncomeQuarterly) / Math.abs(previousNetIncomeQuarterly)) * 100
      : 0;

    // Calculate profit margin
    const profitMargin = revenueTTM > 0 ? (netIncome / revenueTTM) * 100 : 0;
    const profitMarginTTM = revenueTTM > 0 ? (netIncome / revenueTTM) * 100 : 0;

    // EPS quarterly data - calculate from net income and shares outstanding
    const sharesOutstanding = getNumber(overviewResult.SharesOutstanding);
    const epsQuarterly = quarterlyReports.slice(0, 8).map((item: any) => {
      const date = item.fiscalDateEnding || "";
      const netIncomeItem = getNumber(item.netIncome);
      const shares = sharesOutstanding || 1;
      const eps = shares > 0 ? (netIncomeItem / shares) : 0;
      
      return {
        quarter: formatQuarter(date),
        eps,
        date,
      };
    }).reverse(); // Reverse to show oldest first

    // Earnings history - Alpha Vantage doesn't provide earnings estimates/history in same format
    // Use quarterly earnings reports as history
    const earningsHistoryFormatted = quarterlyReports.slice(0, 8).map((item: any) => {
      const date = item.fiscalDateEnding || "";
      const netIncomeItem = getNumber(item.netIncome);
      const shares = sharesOutstanding || 1;
      const eps = shares > 0 ? (netIncomeItem / shares) : 0;
      return {
        date: formatQuarter(date),
        actual: eps,
        estimate: 0, // Alpha Vantage doesn't provide estimates
      };
    }).reverse();

    // Revenue quarterly data
    const revenueQuarterlyData = quarterlyReports.slice(0, 8).map((item: any) => {
      const date = item.fiscalDateEnding || "";
      return {
        quarter: formatQuarter(date),
        revenue: getNumber(item.totalRevenue),
        date,
      };
    }).reverse();

    // Parse balance sheet
    const balanceAnnualReports = balanceResult.annualReports || [];
    const balanceQuarterlyReports = balanceResult.quarterlyReports || [];
    const latestBalanceSheet = balanceAnnualReports[0] || {};
    
    const totalEquity = getNumber(latestBalanceSheet.totalShareholderEquity);
    const totalAssets = getNumber(latestBalanceSheet.totalAssets);
    const totalLiabilities = getNumber(latestBalanceSheet.totalLiabilities);
    const cash = getNumber(latestBalanceSheet.cashAndCashEquivalentsAtCarryingValue) || 
                 getNumber(latestBalanceSheet.cashAndShortTermInvestments);
    const debt = getNumber(latestBalanceSheet.totalDebt) || 
                 getNumber(latestBalanceSheet.longTermDebt);
    const currentAssets = getNumber(latestBalanceSheet.totalCurrentAssets);
    const currentLiabilities = getNumber(latestBalanceSheet.totalCurrentLiabilities);
    const inventory = getNumber(latestBalanceSheet.inventory);
    const quickAssets = currentAssets - inventory;

    const roe = totalEquity > 0 ? (netIncome / totalEquity) * 100 : 0;
    const roa = totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0;
    const debtToEquity = totalEquity > 0 ? (debt / totalEquity) : 0;
    const currentRatio = currentLiabilities > 0 ? (currentAssets / currentLiabilities) : 0;
    const quickRatio = currentLiabilities > 0 ? (quickAssets / currentLiabilities) : 0;

    // Parse cash flow
    const cashflowAnnualReports = cashflowResult.annualReports || [];
    const cashflowQuarterlyReports = cashflowResult.quarterlyReports || [];
    const latestCashflow = cashflowAnnualReports[0] || {};
    const latestCashflowQuarterly = cashflowQuarterlyReports[0] || {};

    const operatingCashFlow = getNumber(latestCashflow.operatingCashflow);
    const capitalExpenditures = getNumber(latestCashflowQuarterly.capitalExpenditures);
    const operatingCashFlowQuarterly = getNumber(latestCashflowQuarterly.operatingCashflow);
    const freeCashFlow = operatingCashFlowQuarterly - Math.abs(capitalExpenditures);

    // Earnings estimates - Alpha Vantage doesn't provide forward estimates
    // Use earnings data if available
    const earningsEstimates = {
      nextQuarter: undefined,
      nextYear: undefined,
    };

    // Get current price from quote
    const currentPrice = quote?.price || getNumber(overviewResult["52WeekHigh"]);

    // Parse overview data
    const marketCap = getNumber(overviewResult.MarketCapitalization);
    const peRatio = getNumber(overviewResult.PERatio);
    const volume = quote?.volume || 0;
    const averageVolume = getNumber(overviewResult.AverageDailyVolume10Day);
    const fiftyTwoWeekHigh = getNumber(overviewResult["52WeekHigh"]);
    const fiftyTwoWeekLow = getNumber(overviewResult["52WeekLow"]);
    const dividendYield = getNumberOrUndefined(overviewResult.DividendYield);
    const beta = getNumberOrUndefined(overviewResult.Beta);
    const epsTTM = getNumber(overviewResult.EPS) || getNumber(overviewResult.TrailingPE);

    const financialDataResult: FinancialData = {
      overview: {
        currentPrice,
        marketCap,
        peRatio,
        volume,
        averageVolume,
        fiftyTwoWeekHigh,
        fiftyTwoWeekLow,
        dividendYield,
        beta,
      },
      earnings: {
        epsTTM,
        epsQuarterly,
        earningsHistory: earningsHistoryFormatted,
        earningsEstimates,
      },
      revenue: {
        revenueTTM,
        revenueQuarterly: revenueQuarterlyData,
        revenueGrowth: {
          yoy: revenueGrowthYoy,
          qoq: revenueGrowthQoq,
        },
      },
      growth: {
        revenueGrowthYoy,
        revenueGrowthQoq,
        earningsGrowthYoy,
        earningsGrowthQoq,
        profitMargin,
        profitMarginTTM,
      },
      financials: {
        balanceSheet: {
          totalAssets,
          totalLiabilities,
          totalEquity,
          cash,
          debt,
        },
        cashFlow: {
          operatingCashFlow,
          freeCashFlow,
          cashFlowTTM: operatingCashFlow,
        },
        ratios: {
          roe,
          roa,
          debtToEquity,
          currentRatio,
          quickRatio,
        },
      },
    };

    return financialDataResult;
  } catch (error) {
    console.error(`Error fetching financial data for ${symbol}:`, error);
    return null;
  }
}
