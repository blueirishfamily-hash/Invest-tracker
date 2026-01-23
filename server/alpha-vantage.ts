/**
 * Alpha Vantage API Client
 * Handles API calls with rate limiting and caching
 * 
 * Environment Variable Required:
 * - ALPHA_VANTAGE_API_KEY: Your Alpha Vantage API key (get one at https://www.alphavantage.co/support/#api-key)
 * 
 * Free Tier Limits:
 * - 25 API requests per day
 * - 5 API requests per minute
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// @ts-ignore - request is a CommonJS module
const request = require('request');

const ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query";
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || "";

// Rate limiting: 5 requests per minute
const MAX_REQUESTS_PER_MINUTE = 5;
const RATE_LIMIT_WINDOW = 60 * 1000; // 60 seconds in milliseconds

// Request tracking for rate limiting
const requestTimestamps: number[] = [];

// Simple in-memory cache with TTL
interface CacheEntry {
  value: any;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Get cached value if not expired
 */
function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return entry.value;
}

/**
 * Set cache value with TTL in milliseconds
 */
function setCache(key: string, value: any, ttl: number): void {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  });
}

/**
 * Check and enforce rate limiting
 * Waits if necessary to avoid exceeding 5 requests per minute
 */
async function checkRateLimit(): Promise<void> {
  const now = Date.now();
  
  // Remove timestamps older than 1 minute
  while (requestTimestamps.length > 0 && now - requestTimestamps[0] > RATE_LIMIT_WINDOW) {
    requestTimestamps.shift();
  }
  
  // If we've made 5 requests in the last minute, wait
  if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    const oldestTimestamp = requestTimestamps[0];
    const waitTime = RATE_LIMIT_WINDOW - (now - oldestTimestamp) + 100; // Add 100ms buffer
    
    if (waitTime > 0) {
      console.warn(`Alpha Vantage rate limit: Waiting ${Math.ceil(waitTime / 1000)}s before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  // Record this request
  requestTimestamps.push(Date.now());
}

/**
 * Make API request to Alpha Vantage
 */
async function apiRequest(params: Record<string, string>): Promise<any> {
  if (!API_KEY || API_KEY.trim().length === 0) {
    throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
  }
  
  await checkRateLimit();
  
  const urlParams = new URLSearchParams({
    apikey: API_KEY,
    ...params,
  });
  
  const url = `${ALPHA_VANTAGE_BASE_URL}?${urlParams.toString()}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for rate limit response
    if (data.Note && typeof data.Note === "string" && data.Note.includes("call frequency")) {
      console.warn("Alpha Vantage rate limit reached:", data.Note);
      throw new Error("Alpha Vantage API rate limit exceeded. Please try again later.");
    }
    
    // Check for error messages
    if (data["Error Message"]) {
      const errorMsg = data["Error Message"];
      console.error("Alpha Vantage error:", errorMsg);
      throw new Error(errorMsg);
    }
    
    // Check for informational messages (often indicates API key issues)
    if (data["Information"] && typeof data.Information === "string") {
      const infoMsg = data.Information;
      console.warn("Alpha Vantage info:", infoMsg);
      // Don't throw for informational messages, just log them
      // Some endpoints return info messages that aren't errors
    }
    
    return data;
  } catch (error: any) {
    if (error.message && error.message.includes("rate limit")) {
      throw error;
    }
    console.error("Alpha Vantage API error:", error);
    throw new Error(`Alpha Vantage API error: ${error.message || "Unknown error"}`);
  }
}

/**
 * Get real-time quote for a symbol
 */
export async function globalQuote(symbol: string): Promise<{
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  name?: string;
}> {
  const cacheKey = `quote:${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  const data = await apiRequest({
    function: "GLOBAL_QUOTE",
    symbol: symbol,
  });
  
  const quote = data["Global Quote"];
  if (!quote || !quote["05. price"]) {
    throw new Error(`No quote data found for ${symbol}`);
  }
  
  const result = {
    symbol: quote["01. symbol"] || symbol,
    price: parseFloat(quote["05. price"] || "0"),
    change: parseFloat(quote["09. change"] || "0"),
    changePercent: parseFloat((quote["10. change percent"] || "0%").replace("%", "")),
    volume: parseFloat(quote["06. volume"] || "0"),
    high: parseFloat(quote["03. high"] || "0"),
    low: parseFloat(quote["04. low"] || "0"),
    open: parseFloat(quote["02. open"] || "0"),
    previousClose: parseFloat(quote["08. previous close"] || "0"),
  };
  
  setCache(cacheKey, result, 5 * 60 * 1000); // 5 minutes
  return result;
}

/**
 * Get historical daily adjusted prices
 */
export async function timeSeriesDailyAdjusted(
  symbol: string,
  outputsize: "compact" | "full" = "compact"
): Promise<Array<{
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose: number;
  volume: number;
  dividendAmount: number;
}>> {
  const cacheKey = `timeseries:${symbol}:${outputsize}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  const data = await apiRequest({
    function: "TIME_SERIES_DAILY_ADJUSTED",
    symbol: symbol,
    outputsize: outputsize,
  });
  
  const timeSeries = data["Time Series (Daily)"] || {};
  
  const result = Object.entries(timeSeries)
    .map(([date, values]: [string, any]) => ({
      date,
      open: parseFloat(values["1. open"] || "0"),
      high: parseFloat(values["2. high"] || "0"),
      low: parseFloat(values["3. low"] || "0"),
      close: parseFloat(values["4. close"] || "0"),
      adjustedClose: parseFloat(values["5. adjusted close"] || values["4. close"] || "0"),
      volume: parseFloat(values["6. volume"] || "0"),
      dividendAmount: parseFloat(values["7. dividend amount"] || "0"),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date ascending
  
  setCache(cacheKey, result, 15 * 60 * 1000); // 15 minutes
  return result;
}

/**
 * Search for stocks by keywords
 */
export async function symbolSearch(keywords: string): Promise<Array<{
  symbol: string;
  name: string;
  type: string;
  region: string;
  marketOpen?: string;
  marketClose?: string;
  timezone?: string;
  currency?: string;
  matchScore?: number;
}>> {
  const cacheKey = `search:${keywords}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  // Check rate limit before making request
  await checkRateLimit();
  
  if (!API_KEY || API_KEY.trim().length === 0) {
    throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
  }
  
  const url = `${ALPHA_VANTAGE_BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(keywords)}&apikey=${API_KEY}`;
  
  // Wrap request in Promise for async/await compatibility
  const data = await new Promise<any>((resolve, reject) => {
    request.get({
      url: url,
      json: true,
      headers: {'User-Agent': 'request'}
    }, (err: any, res: any, body: any) => {
      if (err) {
        console.error('Alpha Vantage API error:', err);
        reject(new Error(`Alpha Vantage API error: ${err.message || "Unknown error"}`));
      } else if (res.statusCode !== 200) {
        console.error('Alpha Vantage API status:', res.statusCode);
        reject(new Error(`HTTP error! status: ${res.statusCode}`));
      } else {
        // Check for rate limit response
        if (body.Note && typeof body.Note === "string" && body.Note.includes("call frequency")) {
          console.warn("Alpha Vantage rate limit reached:", body.Note);
          reject(new Error("Alpha Vantage API rate limit exceeded. Please try again later."));
          return;
        }
        
        // Check for error messages
        if (body["Error Message"]) {
          const errorMsg = body["Error Message"];
          console.error("Alpha Vantage error:", errorMsg);
          reject(new Error(errorMsg));
          return;
        }
        
        // Check for informational messages (often indicates API key issues)
        if (body["Information"] && typeof body.Information === "string") {
          const infoMsg = body.Information;
          console.warn("Alpha Vantage info:", infoMsg);
          // Don't throw for informational messages, just log them
        }
        
        resolve(body);
      }
    });
  });
  
  const matches = data.bestMatches || [];
  
  const result = matches.map((match: any) => ({
    symbol: match["1. symbol"] || "",
    name: match["2. name"] || "",
    type: match["3. type"] || "",
    region: match["4. region"] || "",
    marketOpen: match["5. marketOpen"],
    marketClose: match["6. marketClose"],
    timezone: match["7. timezone"],
    currency: match["8. currency"],
    matchScore: parseFloat(match["9. matchScore"] || "0"),
  }));
  
  setCache(cacheKey, result, 10 * 60 * 1000); // 10 minutes
  return result;
}

/**
 * Get company overview/fundamental data
 */
export async function overview(symbol: string): Promise<any> {
  const cacheKey = `overview:${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  const data = await apiRequest({
    function: "OVERVIEW",
    symbol: symbol,
  });
  
  setCache(cacheKey, data, 60 * 60 * 1000); // 1 hour
  return data;
}

/**
 * Get earnings data
 */
export async function earnings(symbol: string): Promise<any> {
  const cacheKey = `earnings:${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  const data = await apiRequest({
    function: "EARNINGS",
    symbol: symbol,
  });
  
  setCache(cacheKey, data, 60 * 60 * 1000); // 1 hour
  return data;
}

/**
 * Get income statement
 */
export async function incomeStatement(symbol: string): Promise<any> {
  const cacheKey = `income:${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  const data = await apiRequest({
    function: "INCOME_STATEMENT",
    symbol: symbol,
  });
  
  setCache(cacheKey, data, 60 * 60 * 1000); // 1 hour
  return data;
}

/**
 * Get balance sheet
 */
export async function balanceSheet(symbol: string): Promise<any> {
  const cacheKey = `balance:${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  const data = await apiRequest({
    function: "BALANCE_SHEET",
    symbol: symbol,
  });
  
  setCache(cacheKey, data, 60 * 60 * 1000); // 1 hour
  return data;
}

/**
 * Get cash flow statement
 */
export async function cashFlow(symbol: string): Promise<any> {
  const cacheKey = `cashflow:${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  const data = await apiRequest({
    function: "CASH_FLOW",
    symbol: symbol,
  });
  
  setCache(cacheKey, data, 60 * 60 * 1000); // 1 hour
  return data;
}

/**
 * Get intraday time series (for shorter timeframes)
 */
export async function timeSeriesIntraday(
  symbol: string,
  interval: "1min" | "5min" | "15min" | "30min" | "60min" = "60min",
  outputsize: "compact" | "full" = "compact"
): Promise<Array<{
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}>> {
  const cacheKey = `intraday:${symbol}:${interval}:${outputsize}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  const data = await apiRequest({
    function: "TIME_SERIES_INTRADAY",
    symbol: symbol,
    interval: interval,
    outputsize: outputsize,
  });
  
  const timeSeriesKey = `Time Series (${interval})`;
  const timeSeries = data[timeSeriesKey] || {};
  
  const result = Object.entries(timeSeries)
    .map(([date, values]: [string, any]) => ({
      date,
      open: parseFloat(values["1. open"] || "0"),
      high: parseFloat(values["2. high"] || "0"),
      low: parseFloat(values["3. low"] || "0"),
      close: parseFloat(values["4. close"] || "0"),
      volume: parseFloat(values["5. volume"] || "0"),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  setCache(cacheKey, result, 5 * 60 * 1000); // 5 minutes
  return result;
}
