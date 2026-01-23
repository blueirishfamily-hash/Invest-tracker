/**
 * CoinGecko API Integration
 * 
 * Uses CoinGecko's free public API for cryptocurrency prices.
 * Rate limits: 10-30 calls/minute without API key
 * 
 * Documentation: https://www.coingecko.com/en/api/documentation
 */

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

// Cache for API responses (5 minute TTL)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1500; // 1.5 seconds between requests

interface CoinGeckoPrice {
  [coinId: string]: {
    usd: number;
    usd_24h_change?: number;
    usd_market_cap?: number;
  };
}

interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
}

interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
}

/**
 * Enforces rate limiting by waiting if necessary
 */
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) => 
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }
  
  lastRequestTime = Date.now();
}

/**
 * Gets data from cache if available and not expired
 */
function getFromCache<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  return null;
}

/**
 * Stores data in cache
 */
function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Fetches the list of all coins supported by CoinGecko
 * Use this to map symbols (BTC, ETH) to CoinGecko IDs (bitcoin, ethereum)
 */
export async function getCoinsList(): Promise<CoinGeckoCoin[]> {
  const cacheKey = "coins_list";
  const cached = getFromCache<CoinGeckoCoin[]>(cacheKey);
  if (cached) return cached;

  try {
    await rateLimit();
    
    const response = await fetch(`${COINGECKO_BASE_URL}/coins/list`);
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error fetching CoinGecko coins list:", error);
    return [];
  }
}

/**
 * Maps common crypto symbols to CoinGecko IDs
 */
const SYMBOL_TO_ID_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  BNB: "binancecoin",
  XRP: "ripple",
  USDC: "usd-coin",
  SOL: "solana",
  ADA: "cardano",
  DOGE: "dogecoin",
  TRX: "tron",
  TON: "the-open-network",
  DOT: "polkadot",
  MATIC: "matic-network",
  LTC: "litecoin",
  SHIB: "shiba-inu",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  XLM: "stellar",
  UNI: "uniswap",
  ATOM: "cosmos",
  XMR: "monero",
  ETC: "ethereum-classic",
  FIL: "filecoin",
  NEAR: "near",
  APT: "aptos",
  ARB: "arbitrum",
  OP: "optimism",
  ALGO: "algorand",
  VET: "vechain",
  AAVE: "aave",
  MKR: "maker",
  CRV: "curve-dao-token",
  SAND: "the-sandbox",
  MANA: "decentraland",
  AXS: "axie-infinity",
  GALA: "gala",
  ENJ: "enjincoin",
  CHZ: "chiliz",
  FLOW: "flow",
  THETA: "theta-token",
  ICP: "internet-computer",
  HBAR: "hedera-hashgraph",
};

/**
 * Converts a symbol (BTC) to a CoinGecko ID (bitcoin)
 */
export async function symbolToId(symbol: string): Promise<string | null> {
  const upperSymbol = symbol.toUpperCase();
  
  // Check common mappings first
  if (SYMBOL_TO_ID_MAP[upperSymbol]) {
    return SYMBOL_TO_ID_MAP[upperSymbol];
  }
  
  // Fall back to searching the coins list
  const coinsList = await getCoinsList();
  const coin = coinsList.find(
    (c) => c.symbol.toUpperCase() === upperSymbol
  );
  
  return coin?.id || null;
}

/**
 * Fetches current prices for multiple cryptocurrencies
 * @param coinIds Array of CoinGecko coin IDs (e.g., ["bitcoin", "ethereum"])
 */
export async function getPrices(coinIds: string[]): Promise<CoinGeckoPrice> {
  if (coinIds.length === 0) return {};
  
  const cacheKey = `prices_${coinIds.sort().join(",")}`;
  const cached = getFromCache<CoinGeckoPrice>(cacheKey);
  if (cached) return cached;

  try {
    await rateLimit();
    
    const idsParam = coinIds.join(",");
    const url = `${COINGECKO_BASE_URL}/simple/price?ids=${idsParam}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error fetching CoinGecko prices:", error);
    return {};
  }
}

/**
 * Fetches price for a single cryptocurrency by symbol
 * @param symbol Crypto symbol (e.g., "BTC", "ETH")
 */
export async function getPriceBySymbol(
  symbol: string
): Promise<{ price: number; change24h: number; marketCap: number } | null> {
  const coinId = await symbolToId(symbol);
  if (!coinId) return null;
  
  const prices = await getPrices([coinId]);
  const priceData = prices[coinId];
  
  if (!priceData) return null;
  
  return {
    price: priceData.usd,
    change24h: priceData.usd_24h_change || 0,
    marketCap: priceData.usd_market_cap || 0,
  };
}

/**
 * Fetches market data for top cryptocurrencies
 * @param limit Number of coins to fetch (max 250 per page)
 */
export async function getMarketData(
  limit: number = 50
): Promise<CoinGeckoMarketData[]> {
  const cacheKey = `market_data_${limit}`;
  const cached = getFromCache<CoinGeckoMarketData[]>(cacheKey);
  if (cached) return cached;

  try {
    await rateLimit();
    
    const url = `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h,7d,30d`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error fetching CoinGecko market data:", error);
    return [];
  }
}

/**
 * Searches for coins by name or symbol
 * @param query Search query
 */
export async function searchCoins(
  query: string
): Promise<Array<{ id: string; symbol: string; name: string; thumb: string }>> {
  if (!query || query.length < 2) return [];
  
  const cacheKey = `search_${query.toLowerCase()}`;
  const cached = getFromCache<Array<{ id: string; symbol: string; name: string; thumb: string }>>(cacheKey);
  if (cached) return cached;

  try {
    await rateLimit();
    
    const url = `${COINGECKO_BASE_URL}/search?query=${encodeURIComponent(query)}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    const coins = data.coins?.slice(0, 10) || [];
    setCache(cacheKey, coins);
    return coins;
  } catch (error) {
    console.error("Error searching CoinGecko:", error);
    return [];
  }
}

/**
 * Fetches price history for a cryptocurrency
 * @param coinId CoinGecko coin ID (e.g., "bitcoin")
 * @param days Number of days of history (1, 7, 30, 90, 365, max)
 * @returns Array of { date: string, price: number }
 */
export async function getPriceHistory(
  coinId: string,
  days: number = 30
): Promise<Array<{ date: string; price: number }>> {
  const cacheKey = `price_history_${coinId}_${days}`;
  const cached = getFromCache<Array<{ date: string; price: number }>>(cacheKey);
  if (cached) return cached;

  try {
    await rateLimit();
    
    const url = `${COINGECKO_BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    const priceHistory = data.prices?.map(([timestamp, price]: [number, number]) => ({
      date: new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      price: price,
    })) || [];
    
    setCache(cacheKey, priceHistory);
    return priceHistory;
  } catch (error) {
    console.error("Error fetching price history:", error);
    return [];
  }
}

/**
 * Updates crypto asset prices from CoinGecko
 * @param assets Array of crypto assets with symbols
 * @returns Assets with updated prices
 */
export async function updateCryptoAssetPrices<T extends { symbol: string; quantity: number; currentPrice: number; currentValue: number }>(
  assets: T[]
): Promise<T[]> {
  if (assets.length === 0) return assets;

  // Convert symbols to CoinGecko IDs
  const symbolIdMap = new Map<string, string>();
  for (const asset of assets) {
    const id = await symbolToId(asset.symbol);
    if (id) {
      symbolIdMap.set(asset.symbol.toUpperCase(), id);
    }
  }

  // Fetch prices for all IDs
  const ids = Array.from(symbolIdMap.values());
  const prices = await getPrices(ids);

  // Update assets with new prices
  return assets.map((asset) => {
    const id = symbolIdMap.get(asset.symbol.toUpperCase());
    if (id && prices[id]) {
      const newPrice = prices[id].usd;
      return {
        ...asset,
        currentPrice: newPrice,
        currentValue: asset.quantity * newPrice,
      };
    }
    return asset;
  });
}
