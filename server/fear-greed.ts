/**
 * CNN Fear & Greed Index Fetcher
 * Fetches the current Fear & Greed Index from CNN
 */

interface FearGreedData {
  score: number;
  rating: "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
  timestamp: string;
  previousClose?: number;
  previousWeek?: number;
  previousMonth?: number;
}

// Simple in-memory cache with TTL
interface CacheEntry {
  value: FearGreedData;
  expiresAt: number;
}

let cache: CacheEntry | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Get rating based on score
 */
function getRating(score: number): "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed" {
  if (score <= 25) return "Extreme Fear";
  if (score <= 45) return "Fear";
  if (score <= 55) return "Neutral";
  if (score <= 75) return "Greed";
  return "Extreme Greed";
}

/**
 * Fetch Fear & Greed Index from CNN
 * Uses web scraping since CNN doesn't have an official API
 */
async function fetchFearGreedIndex(): Promise<FearGreedData | null> {
  try {
    // Check cache first
    if (cache && Date.now() < cache.expiresAt) {
      return cache.value;
    }

    // CNN Fear & Greed Index URL
    const url = "https://www.cnn.com/markets/fear-and-greed";
    
    // Fetch the page with a browser-like user agent
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch Fear & Greed Index: ${response.status}`);
      // Return cached data if available, even if expired
      if (cache) {
        return cache.value;
      }
      return null;
    }

    const html = await response.text();
    
    // Parse the score from the HTML
    // CNN typically displays the score in a specific format
    // Look for patterns like "Fear & Greed Index: XX" or data attributes
    let score: number | null = null;
    
    // Try to find score in various formats
    // Pattern 1: Look for "fear-greed-index" or similar class/id
    const indexMatch = html.match(/fear[-\s]?greed[-\s]?index["\s:]+(\d+)/i);
    if (indexMatch) {
      score = parseInt(indexMatch[1], 10);
    }
    
    // Pattern 2: Look for data attributes
    if (!score) {
      const dataMatch = html.match(/data-index["\s:=]+(\d+)/i) || html.match(/index["\s:]+(\d+)/i);
      if (dataMatch) {
        score = parseInt(dataMatch[1], 10);
      }
    }
    
    // Pattern 3: Look for JSON data embedded in page
    if (!score) {
      const jsonMatch = html.match(/"value":\s*(\d+)/i) || html.match(/"score":\s*(\d+)/i);
      if (jsonMatch) {
        score = parseInt(jsonMatch[1], 10);
      }
    }

    // If we couldn't parse the score, return cached data or null
    if (score === null || isNaN(score) || score < 0 || score > 100) {
      console.warn("Could not parse Fear & Greed Index score from page");
      if (cache) {
        return cache.value;
      }
      return null;
    }

    const rating = getRating(score);
    const timestamp = new Date().toISOString();

    const result: FearGreedData = {
      score,
      rating,
      timestamp,
    };

    // Update cache
    cache = {
      value: result,
      expiresAt: Date.now() + CACHE_TTL,
    };

    return result;
  } catch (error) {
    console.error("Error fetching Fear & Greed Index:", error);
    // Return cached data if available
    if (cache) {
      return cache.value;
    }
    return null;
  }
}

/**
 * Alternative: Fetch from a third-party API or use mock data for development
 * This can be used if CNN blocking becomes an issue
 */
async function fetchFearGreedIndexMock(): Promise<FearGreedData> {
  // Mock data for development/testing
  // In production, replace with actual API call or scraping
  const mockScore = Math.floor(Math.random() * 100);
  return {
    score: mockScore,
    rating: getRating(mockScore),
    timestamp: new Date().toISOString(),
    previousClose: mockScore + Math.floor(Math.random() * 10) - 5,
  };
}

/**
 * Main export function
 * Tries to fetch real data, falls back to mock if needed
 */
export async function getFearGreedIndex(): Promise<FearGreedData | null> {
  // Try to fetch real data
  const data = await fetchFearGreedIndex();
  
  // If fetching failed and no cache, use mock for development
  // In production, you might want to return null instead
  if (!data && process.env.NODE_ENV === "development") {
    console.warn("Using mock Fear & Greed Index data for development");
    return fetchFearGreedIndexMock();
  }
  
  return data;
}
