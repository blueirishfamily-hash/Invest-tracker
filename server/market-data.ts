import yahooFinance from "yahoo-finance2";

export interface HistoricalPrice {
  date: string;
  price: number;
}

const indexSymbols: Record<string, string> = {
  SPY: "^GSPC", // S&P 500
  DJI: "^DJI",  // DOW Jones
  IXIC: "^IXIC", // Nasdaq Composite
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
    const now = new Date();
    let startDate: Date;
    let period1: number;
    let period2: number = Math.floor(now.getTime() / 1000);

    // Convert timeframe to start date
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

    period1 = Math.floor(startDate.getTime() / 1000);

    // Map index symbols to Yahoo Finance symbols
    const yahooSymbol = indexSymbols[symbol] || symbol;

    const quote: any = await yahooFinance.historical(yahooSymbol, {
      period1,
      period2,
      interval: "1d" as const,
    });

    if (!quote || !Array.isArray(quote) || quote.length === 0) {
      return null;
    }

    // Normalize data - get closing prices and index to start at 0
    const prices = quote.map((item: any) => ({
      date: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      price: item.close || item.adjClose || 0,
    }));

    // Filter out invalid prices
    const validPrices = prices.filter((p: any) => p.price > 0);
    if (validPrices.length === 0) {
      return null;
    }

    // Index to start at 0 (calculate percentage change from first price)
    const firstPrice = validPrices[0].price;
    return validPrices.map((item: any) => ({
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
    const yahooSymbol = indexSymbols[symbol] || symbol;
    const quote: any = await yahooFinance.quote(yahooSymbol);

    if (!quote || !quote.regularMarketPrice) {
      return null;
    }

    return {
      price: quote.regularMarketPrice,
      name: quote.longName || quote.shortName || symbol,
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
        name: directQuote.name,
      };
    }

    // If direct quote fails, try search
    const searchResults: any = await yahooFinance.search(query, {
      newsCount: 0,
    });

    if (searchResults?.quotes && Array.isArray(searchResults.quotes) && searchResults.quotes.length > 0) {
      const firstResult = searchResults.quotes[0];
      return {
        symbol: firstResult.symbol || query.toUpperCase(),
        name: firstResult.longname || firstResult.shortname || query,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error searching for stock ${query}:`, error);
    return null;
  }
}
