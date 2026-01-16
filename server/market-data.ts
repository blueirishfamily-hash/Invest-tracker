import {
  globalQuote,
  timeSeriesDailyAdjusted,
  timeSeriesIntraday,
  symbolSearch,
} from "./alpha-vantage";

export interface HistoricalPrice {
  date: string;
  price: number;
}

// Map index symbols for Alpha Vantage
// Note: Alpha Vantage uses different symbols than Yahoo Finance
const indexSymbols: Record<string, string> = {
  SPY: "SPY", // S&P 500 ETF (works directly)
  DJI: "DIA", // DOW Jones ETF (or use ^DJI if available)
  IXIC: "QQQ", // Nasdaq ETF (or use ^IXIC if available)
};

/**
 * Fetches historical price data for a stock or index
 * Falls back to null if API fails
 */
export async function fetchHistoricalData(
  symbol: string,
  timeframe: string
): Promise<HistoricalPrice[] | null> {
  try {
    // Map index symbols for Alpha Vantage
    const alphaSymbol = indexSymbols[symbol] || symbol;
    
    // Determine output size based on timeframe
    let outputsize: "compact" | "full" = "compact";
    const needsFull = timeframe === "5Y" || timeframe === "MAX";
    if (needsFull) {
      outputsize = "full";
    }
    
    // For very short timeframes (1D, 5D), use intraday data if available
    // Otherwise use daily data
    let timeSeriesData: Array<{
      date: string;
      close: number;
      adjustedClose?: number;
    }> = [];
    
    if (timeframe === "1D" || timeframe === "5D") {
      try {
        // Try intraday first for short timeframes
        const intradayData = await timeSeriesIntraday(alphaSymbol, "60min", "compact");
        if (intradayData && intradayData.length > 0) {
          timeSeriesData = intradayData.map((item) => ({
            date: item.date,
            close: item.close,
            adjustedClose: item.close,
          }));
        }
      } catch (intradayError) {
        // Fall back to daily if intraday fails
        console.warn(`Intraday data not available for ${alphaSymbol}, using daily`);
      }
    }
    
    // Use daily data if intraday didn't work or for longer timeframes
    if (timeSeriesData.length === 0) {
      const dailyData = await timeSeriesDailyAdjusted(alphaSymbol, outputsize);
      timeSeriesData = dailyData.map((item) => ({
        date: item.date,
        close: item.close,
        adjustedClose: item.adjustedClose,
      }));
    }
    
    if (!timeSeriesData || timeSeriesData.length === 0) {
      return null;
    }
    
    // Calculate start date based on timeframe
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case "1D":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        break;
      case "5D":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 5);
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
      case "YTD":
        startDate = new Date(now.getFullYear(), 0, 1);
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
        startDate.setMonth(startDate.getMonth() - 1);
    }
    
    // Filter data to timeframe and normalize
    const filteredData = timeSeriesData.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= startDate && itemDate <= now;
    });
    
    if (filteredData.length === 0) {
      return null;
    }
    
    // Normalize data - get closing prices and format dates
    const prices = filteredData.map((item) => {
      const itemDate = new Date(item.date);
      return {
        date: itemDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        price: item.adjustedClose || item.close || 0,
      };
    });
    
    // Filter out invalid prices
    const validPrices = prices.filter((p) => p.price > 0);
    if (validPrices.length === 0) {
      return null;
    }
    
    // Index to start at 0 (calculate percentage change from first price)
    const firstPrice = validPrices[0].price;
    return validPrices.map((item) => ({
      date: item.date,
      price: ((item.price - firstPrice) / firstPrice) * 100,
    }));
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetches current quote for a stock or index
 */
export async function fetchCurrentQuote(symbol: string): Promise<{
  price: number;
  name: string;
} | null> {
  try {
    // Map index symbols for Alpha Vantage
    const alphaSymbol = indexSymbols[symbol] || symbol;
    
    const quote = await globalQuote(alphaSymbol);
    
    if (!quote || !quote.price || quote.price === 0) {
      return null;
    }
    
    return {
      price: quote.price,
      name: quote.symbol, // Alpha Vantage doesn't always return company name in GLOBAL_QUOTE
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return null;
  }
}

/**
 * Searches for a stock by ticker or name
 */
export async function searchStock(query: string): Promise<{
  symbol: string;
  name: string;
} | null> {
  try {
    // Try direct quote first (faster for exact ticker matches)
    const directQuote = await fetchCurrentQuote(query);
    if (directQuote) {
      return {
        symbol: query.toUpperCase(),
        name: directQuote.name || query.toUpperCase(),
      };
    }
    
    // If direct quote fails, try search
    const searchResults = await symbolSearch(query);
    
    if (searchResults && searchResults.length > 0) {
      // Filter for equities/stocks only (exclude indices, currencies, etc.)
      const stockResults = searchResults.filter((quote) => {
        const quoteType = quote.type?.toLowerCase() || "";
        // Include Equity, ETF, Common Stock
        return (
          quoteType === "equity" ||
          quoteType === "etf" ||
          quoteType === "common stock"
        );
      });
      
      if (stockResults.length > 0) {
        const firstResult = stockResults[0];
        return {
          symbol: firstResult.symbol || query.toUpperCase(),
          name: firstResult.name || query,
        };
      }
      
      // Fallback to first result if no stock filter matches
      const firstResult = searchResults[0];
      return {
        symbol: firstResult.symbol || query.toUpperCase(),
        name: firstResult.name || query,
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error searching for stock ${query}:`, error);
    return null;
  }
}

/**
 * Searches for multiple stock matches by ticker or name
 * Returns array of potential matches
 */
export async function searchStocks(query: string): Promise<Array<{
  symbol: string;
  name: string;
  exchange?: string;
  quoteType?: string;
}>> {
  try {
    // Try direct quote first
    const directQuote = await fetchCurrentQuote(query);
    if (directQuote) {
      return [{
        symbol: query.toUpperCase(),
        name: directQuote.name || query.toUpperCase(),
      }];
    }
    
    // Search for multiple matches
    const searchResults = await symbolSearch(query);
    
    if (searchResults && searchResults.length > 0) {
      // Filter for equities/stocks only and limit to top 10 results
      const stockResults = searchResults
        .filter((quote) => {
          const quoteType = quote.type?.toLowerCase() || "";
          return (
            quoteType === "equity" ||
            quoteType === "etf" ||
            quoteType === "common stock"
          );
        })
        .slice(0, 10)
        .map((quote) => ({
          symbol: quote.symbol || query.toUpperCase(),
          name: quote.name || quote.symbol || query,
          exchange: quote.region,
          quoteType: quote.type,
        }));
      
      return stockResults.length > 0 ? stockResults : [];
    }
    
    return [];
  } catch (error) {
    console.error(`Error searching for stocks ${query}:`, error);
    return [];
  }
}
