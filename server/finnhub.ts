/**
 * Finnhub API Client
 * Handles API calls with rate limiting and caching
 *
 * Environment Variable Required:
 * - FINNHUB_API_KEY: Your Finnhub API key
 */

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY || "";

// Log API key status on load
if (API_KEY) {
  const keyPreview = API_KEY.length > 8 
    ? `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}`
    : "[hidden]";
  console.log(`[Finnhub] API key loaded: ${keyPreview} (${API_KEY.length} chars)`);
} else {
  console.warn("[Finnhub] WARNING: No API key configured. Set FINNHUB_API_KEY in .env");
}

// Rate limiting: Finnhub free tier is 60/min. Use a conservative guard.
const MAX_REQUESTS_PER_MINUTE = 50;
const RATE_LIMIT_WINDOW = 60 * 1000;
const requestTimestamps: number[] = [];

interface CacheEntry {
  value: any;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key: string, value: any, ttl: number): void {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  });
}

async function checkRateLimit(): Promise<void> {
  const now = Date.now();
  while (requestTimestamps.length > 0 && now - requestTimestamps[0] > RATE_LIMIT_WINDOW) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    const oldestTimestamp = requestTimestamps[0];
    const waitTime = RATE_LIMIT_WINDOW - (now - oldestTimestamp) + 100;
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
  requestTimestamps.push(Date.now());
}

async function apiRequest(path: string, params: Record<string, string>): Promise<any> {
  if (!API_KEY || API_KEY.trim().length === 0) {
    console.error("[Finnhub] API key is not configured");
    throw new Error("FINNHUB_API_KEY is not configured");
  }

  // Log API key info for debugging (only first/last chars for security)
  const keyPreview = API_KEY.length > 8 
    ? `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)} (${API_KEY.length} chars)`
    : `[${API_KEY.length} chars]`;
  
  await checkRateLimit();

  const urlParams = new URLSearchParams({
    token: API_KEY,
    ...params,
  });

  const url = `${FINNHUB_BASE_URL}${path}?${urlParams.toString()}`;
  const urlForLog = `${FINNHUB_BASE_URL}${path}?${new URLSearchParams(params).toString()}&token=***`;
  
  console.log(`[Finnhub] Request: ${urlForLog}`);

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`[Finnhub] HTTP ${response.status} for ${path}: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Log response summary
    if (path === "/search") {
      console.log(`[Finnhub] Search response: ${data?.count || 0} results, result array: ${data?.result?.length || 0}`);
    } else if (path === "/quote") {
      console.log(`[Finnhub] Quote response: c=${data?.c}, pc=${data?.pc}`);
    } else if (path === "/stock/candle") {
      console.log(`[Finnhub] Candle response: status=${data?.s}, points=${data?.t?.length || 0}`);
    }
    
    return data;
  } catch (error: any) {
    console.error(`[Finnhub] Request failed for ${path}:`, error?.message || error);
    throw error;
  }
}

export async function quote(symbol: string): Promise<{
  symbol: string;
  price: number;
  previousClose: number;
} | null> {
  const cacheKey = `quote:${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[Finnhub] quote cache hit for ${symbol}: $${cached.price}`);
    return cached;
  }

  try {
    const data = await apiRequest("/quote", { symbol });
    
    // Handle empty or invalid response
    if (!data || typeof data.c !== "number") {
      console.log(`[Finnhub] No quote data for ${symbol}: response missing 'c' field`);
      return null;
    }
    
    // Price of 0 means the symbol wasn't found or market is closed with no data
    if (data.c === 0) {
      console.log(`[Finnhub] Quote for ${symbol} returned price=0 (symbol may not exist or market closed)`);
      return null;
    }

    const result = {
      symbol,
      price: data.c,
      previousClose: data.pc ?? 0,
    };
    
    console.log(`[Finnhub] Quote for ${symbol}: $${result.price} (prev: $${result.previousClose})`);
    setCache(cacheKey, result, 5 * 60 * 1000);
    return result;
  } catch (error: any) {
    console.error(`[Finnhub] Quote error for ${symbol}:`, error?.message || error);
    return null;
  }
}

export async function candle(
  symbol: string,
  resolution: "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M",
  from: number,
  to: number,
): Promise<{
  t: number[];
  c: number[];
  o: number[];
  h: number[];
  l: number[];
} | null> {
  const cacheKey = `candle:${symbol}:${resolution}:${from}:${to}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[Finnhub] candle cache hit for ${symbol}`);
    return cached;
  }

  try {
    const data = await apiRequest("/stock/candle", {
      symbol,
      resolution,
      from: String(from),
      to: String(to),
    });

    // Handle no_data response (common for free tier or invalid symbols)
    if (!data || data.s === "no_data") {
      console.log(`[Finnhub] No candle data for ${symbol} (status: ${data?.s || "empty"}). This endpoint requires Premium access.`);
      return null;
    }
    
    if (data.s !== "ok") {
      console.log(`[Finnhub] Candle request failed for ${symbol}: status=${data?.s}`);
      return null;
    }

    const result = {
      t: data.t || [],
      c: data.c || [],
      o: data.o || [],
      h: data.h || [],
      l: data.l || [],
    };
    
    console.log(`[Finnhub] Candle data for ${symbol}: ${result.t.length} data points`);
    setCache(cacheKey, result, 10 * 60 * 1000);
    return result;
  } catch (error: any) {
    // Check for 403 (premium required) or other access errors
    if (error?.message?.includes("403")) {
      console.warn(`[Finnhub] Candle endpoint requires Premium access for ${symbol}`);
    } else {
      console.error(`[Finnhub] Candle error for ${symbol}:`, error?.message || error);
    }
    return null;
  }
}

export async function symbolSearch(query: string): Promise<Array<{
  symbol: string;
  name: string;
  type?: string;
  exchange?: string;
}>> {
  const cacheKey = `search:${query}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[Finnhub] symbolSearch cache hit for "${query}": ${cached.length} results`);
    return cached;
  }

  try {
    const data = await apiRequest("/search", { q: query });
    
    // Handle error responses from Finnhub
    if (data?.error) {
      console.error(`[Finnhub] API error for search "${query}":`, data.error);
      return [];
    }
    
    const results = Array.isArray(data?.result) ? data.result : [];
    
    if (results.length === 0) {
      console.log(`[Finnhub] No results found for "${query}"`);
      return [];
    }

    const mapped = results.map((item: any) => ({
      symbol: item.symbol || item.displaySymbol || "",
      name: item.description || item.displaySymbol || "",
      type: item.type,
      exchange: item.primaryExchange,
    }));

    console.log(`[Finnhub] symbolSearch mapped ${mapped.length} results for "${query}"`);
    
    setCache(cacheKey, mapped, 10 * 60 * 1000);
    return mapped;
  } catch (error: any) {
    console.error(`[Finnhub] symbolSearch error for "${query}":`, error?.message || error);
    return [];
  }
}
