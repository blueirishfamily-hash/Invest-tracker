import { candle, quote, symbolSearch } from "./finnhub";

export interface HistoricalPrice {
  date: string;
  price: number;
}

// Map index symbols for market data provider
const indexSymbols: Record<string, string> = {
  SPY: "SPY", // S&P 500 ETF (works directly)
  DJI: "DIA", // DOW Jones ETF (or use ^DJI if available)
  IXIC: "QQQ", // Nasdaq ETF (or use ^IXIC if available)
};

function getResolution(timeframe: string): "60" | "D" | "W" {
  switch (timeframe) {
    case "1D":
    case "5D":
      return "60";
    case "1M":
    case "3M":
    case "6M":
    case "YTD":
    case "1Y":
      return "D";
    case "5Y":
    case "MAX":
      return "W";
    default:
      return "D";
  }
}

/**
 * Fetches historical price data for a stock or index
 * Falls back to null if API fails
 * Note: Finnhub candle endpoint requires Premium access - free tier will return null
 */
export async function fetchHistoricalData(
  symbol: string,
  timeframe: string
): Promise<HistoricalPrice[] | null> {
  try {
    const providerSymbol = indexSymbols[symbol] || symbol;
    const resolution = getResolution(timeframe);

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

    const from = Math.floor(startDate.getTime() / 1000);
    const to = Math.floor(now.getTime() / 1000);
    
    console.log(`[Finnhub] Fetching historical data for ${providerSymbol} (${timeframe}): ${resolution} resolution`);
    const candleData = await candle(providerSymbol, resolution, from, to);

    if (!candleData || candleData.t.length === 0 || candleData.c.length === 0) {
      console.log(`[Finnhub] No historical data available for ${providerSymbol}. Finnhub candle endpoint requires Premium subscription.`);
      return null;
    }

    // Normalize data - get closing prices and format dates
    const prices = candleData.t.map((timestamp, index) => {
      const itemDate = new Date(timestamp * 1000);
      return {
        date: itemDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        price: candleData.c[index] || 0,
      };
    });
    
    // Filter out invalid prices
    const validPrices = prices.filter((p) => p.price > 0);
    if (validPrices.length === 0) {
      console.log(`[Finnhub] All prices were invalid for ${providerSymbol}`);
      return null;
    }
    
    // Index to start at 0 (calculate percentage change from first price)
    const firstPrice = validPrices[0].price;
    console.log(`[Finnhub] Returning ${validPrices.length} historical data points for ${providerSymbol}`);
    return validPrices.map((item) => ({
      date: item.date,
      price: ((item.price - firstPrice) / firstPrice) * 100,
    }));
  } catch (error) {
    console.error(`[Finnhub] Error fetching historical data for ${symbol}:`, error);
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
    const providerSymbol = indexSymbols[symbol] || symbol;
    console.log(`[Finnhub] Fetching quote for ${providerSymbol}`);
    const quoteData = await quote(providerSymbol);
    if (!quoteData || !quoteData.price || quoteData.price === 0) {
      console.log(`[Finnhub] No valid quote data for ${providerSymbol}`);
      return null;
    }
    return {
      price: quoteData.price,
      name: quoteData.symbol,
    };
  } catch (error) {
    console.error(`[Finnhub] Error fetching quote for ${symbol}:`, error);
    return null;
  }
}

// Currency symbols to exclude from stock search results
const CURRENCY_SYMBOLS = /^(USD|EUR|GBP|JPY|CNY|AUD|CAD|CHF|NZD|SEK|NOK|DKK|PLN|HUF|CZK|RUB|BRL|MXN|ZAR|INR|KRW|SGD|HKD|TWD|THB|MYR|IDR|PHP|VND)$/;

/**
 * Check if a Finnhub type represents a tradeable security (stock, ETF, fund)
 * Finnhub returns types like "Common Stock", "ETP", "ADR", etc.
 */
function isTradeableSecurity(type: string | undefined): boolean {
  if (!type) return true; // Allow results with no type (likely stocks)
  const lowerType = type.toLowerCase();
  // Include stocks, ETFs, funds, ADRs, REITs, etc.
  return (
    lowerType.includes("stock") ||
    lowerType.includes("equity") ||
    lowerType.includes("etf") ||
    lowerType.includes("etp") ||
    lowerType.includes("fund") ||
    lowerType.includes("adr") ||
    lowerType.includes("reit") ||
    lowerType === "" // Empty type is likely a stock
  );
}

/**
 * Searches for a stock by ticker or name
 */
export async function searchStock(query: string): Promise<{
  symbol: string;
  name: string;
} | null> {
  try {
    if (!query || query.trim().length === 0) {
      return null;
    }

    const trimmedQuery = query.trim().toUpperCase();
    
    // Use Finnhub search API first
    console.log(`[Finnhub] Searching for: ${query}`);
    const searchResults = await symbolSearch(query);
    console.log(`[Finnhub] Raw search results count: ${searchResults?.length || 0}`);
    
    if (searchResults && searchResults.length > 0) {
      // Log first few results for debugging
      console.log(`[Finnhub] First 3 results:`, searchResults.slice(0, 3).map(r => ({
        symbol: r.symbol,
        type: r.type,
        name: r.name?.substring(0, 30)
      })));
      
      // Filter for tradeable securities (exclude currencies, indices, etc.)
      const stockResults = searchResults.filter((result) => {
        const symbol = result.symbol?.toUpperCase() || "";
        const isTradeable = isTradeableSecurity(result.type);
        const isNotCurrency = !CURRENCY_SYMBOLS.test(symbol);
        return isTradeable && isNotCurrency;
      });
      
      console.log(`[Finnhub] Filtered results count: ${stockResults.length}`);
      
      if (stockResults.length > 0) {
        const firstResult = stockResults[0];
        return {
          symbol: firstResult.symbol || trimmedQuery,
          name: firstResult.name || firstResult.symbol || query,
        };
      }
      
      // Fallback to first result if no stock filter matches (but still exclude currencies)
      const firstResult = searchResults[0];
      const symbol = firstResult.symbol?.toUpperCase() || trimmedQuery;
      const isNotCurrency = !CURRENCY_SYMBOLS.test(symbol);
      
      if (isNotCurrency) {
        console.log(`[Finnhub] Using fallback result: ${symbol}`);
        return {
          symbol: symbol,
          name: firstResult.name || symbol,
        };
      }
    }
    
    // Fallback to direct quote if search didn't return results
    if (!searchResults || searchResults.length === 0) {
      try {
        console.log(`[Finnhub] Search returned no results, trying direct quote for ${trimmedQuery}...`);
        const directQuote = await fetchCurrentQuote(trimmedQuery);
        if (directQuote && directQuote.price > 0) {
          return {
            symbol: trimmedQuery,
            name: directQuote.name || trimmedQuery,
          };
        }
      } catch (quoteError) {
        console.log(`[Finnhub] Direct quote also failed for ${trimmedQuery}`);
      }
    }
    
    return null;
  } catch (error: any) {
    console.error(`[Finnhub] Error searching for stock ${query}:`, error?.message || error);
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
    if (!query || query.trim().length === 0) {
      return [];
    }

    const trimmedQuery = query.trim().toUpperCase();
    
    // Search for multiple matches first (prioritize search over direct quote for suggestions)
    console.log(`[Finnhub] searchStocks: Searching for "${query}"`);
    const searchResults = await symbolSearch(query);
    console.log(`[Finnhub] searchStocks: Raw results count: ${searchResults?.length || 0}`);
    
    if (searchResults && searchResults.length > 0) {
      // Log first few results for debugging
      if (searchResults.length > 0) {
        console.log(`[Finnhub] searchStocks: Sample results:`, searchResults.slice(0, 3).map(r => ({
          symbol: r.symbol,
          type: r.type,
          exchange: r.exchange
        })));
      }
      
      // Filter for tradeable securities and limit to top 10 results
      const stockResults = searchResults
        .filter((result) => {
          const symbol = result.symbol?.toUpperCase() || "";
          const isTradeable = isTradeableSecurity(result.type);
          const isNotCurrency = !CURRENCY_SYMBOLS.test(symbol);
          return isTradeable && isNotCurrency;
        })
        .slice(0, 10)
        .map((result) => ({
          symbol: result.symbol?.toUpperCase() || trimmedQuery,
          name: result.name || result.symbol || query,
          exchange: result.exchange,
          quoteType: result.type,
        }));
      
      console.log(`[Finnhub] searchStocks: Filtered results count: ${stockResults.length}`);
      
      if (stockResults.length > 0) {
        return stockResults;
      }
      
      // If filtering removed all results, return unfiltered results (excluding only currencies)
      const unfilteredResults = searchResults
        .filter((result) => {
          const symbol = result.symbol?.toUpperCase() || "";
          return !CURRENCY_SYMBOLS.test(symbol);
        })
        .slice(0, 10)
        .map((result) => ({
          symbol: result.symbol?.toUpperCase() || trimmedQuery,
          name: result.name || result.symbol || query,
          exchange: result.exchange,
          quoteType: result.type,
        }));
      
      if (unfilteredResults.length > 0) {
        console.log(`[Finnhub] searchStocks: Using unfiltered results (${unfilteredResults.length})`);
        return unfilteredResults;
      }
    }
    
    // Fallback to direct quote if search didn't return results
    if (!searchResults || searchResults.length === 0) {
      try {
        console.log(`[Finnhub] searchStocks: No search results, trying direct quote for ${trimmedQuery}...`);
        const directQuote = await fetchCurrentQuote(trimmedQuery);
        if (directQuote && directQuote.price > 0) {
          return [{
            symbol: trimmedQuery,
            name: directQuote.name || trimmedQuery,
          }];
        }
      } catch (quoteError) {
        console.log(`[Finnhub] searchStocks: Direct quote also failed for ${trimmedQuery}`);
      }
    }
    
    return [];
  } catch (error: any) {
    console.error(`[Finnhub] Error in searchStocks for "${query}":`, error?.message || error);
    return [];
  }
}
