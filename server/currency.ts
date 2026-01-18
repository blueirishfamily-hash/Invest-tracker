/**
 * Multi-Currency Support Module
 * 
 * Fetches and caches exchange rates for currency conversion.
 * Uses exchangerate-api.com free tier or fallback rates.
 */

import type { ExchangeRates, SupportedCurrency } from "@shared/schema";

// Cache for exchange rates
let ratesCache: ExchangeRates | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Fallback rates (approximate, as of 2024)
const FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.50,
  CHF: 0.88,
  CAD: 1.36,
  AUD: 1.53,
  CNY: 7.24,
  INR: 83.12,
  BRL: 4.97,
};

/**
 * Fetch exchange rates from API
 */
async function fetchRatesFromAPI(): Promise<ExchangeRates | null> {
  try {
    // Using exchangerate-api.com free tier (no API key required for basic usage)
    const response = await fetch(
      "https://api.exchangerate-api.com/v4/latest/USD"
    );
    
    if (!response.ok) {
      console.error("Exchange rate API error:", response.status);
      return null;
    }
    
    const data = await response.json();
    
    return {
      base: "USD",
      rates: data.rates,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Failed to fetch exchange rates:", error);
    return null;
  }
}

/**
 * Get current exchange rates (with caching)
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();
  
  // Return cached rates if still valid
  if (ratesCache && now - lastFetch < CACHE_DURATION) {
    return ratesCache;
  }
  
  // Try to fetch fresh rates
  const freshRates = await fetchRatesFromAPI();
  
  if (freshRates) {
    ratesCache = freshRates;
    lastFetch = now;
    return freshRates;
  }
  
  // Use fallback rates if API fails
  if (ratesCache) {
    return ratesCache; // Return stale cache
  }
  
  // Return hardcoded fallback
  return {
    base: "USD",
    rates: FALLBACK_RATES,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  const rates = await getExchangeRates();
  
  const fromRate = rates.rates[fromCurrency] || 1;
  const toRate = rates.rates[toCurrency] || 1;
  
  // Convert to USD first, then to target currency
  const inUSD = amount / fromRate;
  const converted = inUSD * toRate;
  
  return Math.round(converted * 100) / 100;
}

/**
 * Get exchange rate between two currencies
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return 1;
  }
  
  const rates = await getExchangeRates();
  
  const fromRate = rates.rates[fromCurrency] || 1;
  const toRate = rates.rates[toCurrency] || 1;
  
  return toRate / fromRate;
}

/**
 * Format currency amount with proper symbol and locale
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CHF: "CHF",
    CAD: "C$",
    AUD: "A$",
    CNY: "¥",
    INR: "₹",
    BRL: "R$",
  };
  return symbols[currency] || currency;
}

/**
 * List of supported currencies with details
 */
export const currencyDetails = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
];
