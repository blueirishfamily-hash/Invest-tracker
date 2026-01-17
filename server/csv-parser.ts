import { parse } from "csv-parse/sync";

export interface ParsedHolding {
  ticker: string;
  quantity: number;
  costBasis: number;
  name?: string;
  sector?: string;
  industry?: string;
  purchaseDate?: string;
  account?: string;
  currency?: string;
  market?: string;
  assetType?: string;
  errors?: string[];
}

export interface ParseResult {
  holdings: ParsedHolding[];
  errors: Array<{ row: number; message: string }>;
}

/**
 * Normalizes column names by removing spaces, special chars, and lowercasing
 */
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Maps normalized column names to standard field names
 */
function mapColumnToField(normalizedName: string): string | null {
  const columnMap: Record<string, string> = {
    // Ticker/Symbol
    symbol: "ticker",
    ticker: "ticker",
    stocksymbol: "ticker",
    sym: "ticker",
    
    // Quantity/Shares
    quantity: "quantity",
    qty: "quantity",
    shares: "quantity",
    share: "quantity",
    numshares: "quantity",
    numberofshares: "quantity",
    
    // Cost Basis
    costbasis: "costBasis",
    cost: "costBasis",
    averagecost: "costBasis",
    avgcost: "costBasis",
    costpershare: "costBasis",
    purchaseprice: "costBasis",
    totalcost: "costBasis",
    
    // Name
    name: "name",
    companyname: "name",
    company: "name",
    description: "name",
    securityname: "name",
    
    // Sector
    sector: "sector",
    
    // Industry
    industry: "industry",
    
    // Purchase Date
    purchasedate: "purchaseDate",
    date: "purchaseDate",
    purchase: "purchaseDate",
    
    // Account
    account: "account",
    
    // Currency
    currency: "currency",
    
    // Market/Exchange
    market: "market",
    exchange: "market",
    
    // Region
    region: "region",
    
    // Asset Type
    assettype: "assetType",
    asset: "assetType",
    type: "assetType",
    securitytype: "assetType",
  };

  return columnMap[normalizedName] || null;
}

/**
 * Parses a number value, handling commas, currency symbols, and parentheses for negatives
 */
function parseNumber(value: string): number | null {
  if (!value || typeof value !== "string") return null;
  
  // Remove currency symbols, commas, and whitespace
  let cleaned = value
    .replace(/[$,\s]/g, "")
    .trim();
  
  // Handle parentheses for negatives
  const isNegative = cleaned.startsWith("(") && cleaned.endsWith(")");
  if (isNegative) {
    cleaned = cleaned.slice(1, -1);
  }
  
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return null;
  
  return isNegative ? -parsed : parsed;
}

/**
 * Parses a CSV file with flexible column detection
 */
export function parseCSV(csvContent: string): ParseResult {
  const result: ParseResult = {
    holdings: [],
    errors: [],
  };

  try {
    // Parse CSV with headers
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    if (!records || records.length === 0) {
      result.errors.push({ row: 0, message: "CSV file is empty or has no data rows" });
      return result;
    }

    // Normalize column names and create mapping
    const firstRow = records[0];
    const columnMapping: Record<string, string> = {};
    
    for (const [originalCol, value] of Object.entries(firstRow)) {
      const normalized = normalizeColumnName(originalCol);
      const fieldName = mapColumnToField(normalized);
      if (fieldName) {
        columnMapping[fieldName] = originalCol;
      }
    }

    // Validate required columns
    if (!columnMapping["ticker"]) {
      result.errors.push({ 
        row: 0, 
        message: "Could not find ticker/symbol column. Please ensure your CSV has a column named 'Symbol', 'Ticker', or similar." 
      });
      return result;
    }

    if (!columnMapping["quantity"]) {
      result.errors.push({ 
        row: 0, 
        message: "Could not find quantity/shares column. Please ensure your CSV has a column named 'Quantity', 'Shares', or similar." 
      });
      return result;
    }

    if (!columnMapping["costBasis"]) {
      result.errors.push({ 
        row: 0, 
        message: "Could not find cost basis column. Please ensure your CSV has a column named 'Cost Basis', 'Average Cost', 'Cost', or similar." 
      });
      return result;
    }

    // Parse each row
    records.forEach((row: any, index: number) => {
      const rowNumber = index + 2; // +2 because CSV is 1-indexed and we have a header row
      const holding: ParsedHolding = {
        ticker: "",
        quantity: 0,
        costBasis: 0,
        errors: [],
      };

      // Extract ticker
      const tickerValue = row[columnMapping["ticker"]];
      if (!tickerValue || typeof tickerValue !== "string") {
        holding.errors!.push(`Missing or invalid ticker symbol`);
      } else {
        holding.ticker = tickerValue.toUpperCase().trim();
      }

      // Extract quantity
      const quantityValue = row[columnMapping["quantity"]];
      const parsedQuantity = parseNumber(String(quantityValue || ""));
      if (parsedQuantity === null || parsedQuantity <= 0) {
        holding.errors!.push(`Invalid quantity: ${quantityValue}`);
      } else {
        holding.quantity = parsedQuantity;
      }

      // Extract cost basis
      const costBasisValue = row[columnMapping["costBasis"]];
      const parsedCostBasis = parseNumber(String(costBasisValue || ""));
      if (parsedCostBasis === null || parsedCostBasis < 0) {
        holding.errors!.push(`Invalid cost basis: ${costBasisValue}`);
      } else {
        // Cost basis might be per-share or total - we'll assume per-share for now
        // If it's total, we can divide by quantity later if needed
        holding.costBasis = parsedCostBasis;
      }

      // Extract optional fields
      if (columnMapping["name"]) {
        const nameValue = row[columnMapping["name"]];
        if (nameValue && typeof nameValue === "string") {
          holding.name = nameValue.trim();
        }
      }

      if (columnMapping["sector"]) {
        const sectorValue = row[columnMapping["sector"]];
        if (sectorValue && typeof sectorValue === "string") {
          holding.sector = sectorValue.trim();
        }
      }

      if (columnMapping["industry"]) {
        const industryValue = row[columnMapping["industry"]];
        if (industryValue && typeof industryValue === "string") {
          holding.industry = industryValue.trim();
        }
      }

      if (columnMapping["purchaseDate"]) {
        const dateValue = row[columnMapping["purchaseDate"]];
        if (dateValue && typeof dateValue === "string") {
          holding.purchaseDate = dateValue.trim();
        }
      }

      // Extract account (default to "Manual" if not provided)
      if (columnMapping["account"]) {
        const accountValue = row[columnMapping["account"]];
        if (accountValue && typeof accountValue === "string") {
          holding.account = accountValue.trim();
        }
      } else {
        holding.account = "Manual";
      }

      // Extract currency (default to "USD" if not provided)
      if (columnMapping["currency"]) {
        const currencyValue = row[columnMapping["currency"]];
        if (currencyValue && typeof currencyValue === "string") {
          holding.currency = currencyValue.trim().toUpperCase();
        }
      } else {
        holding.currency = "USD";
      }

      // Extract market/exchange (optional, no default)
      if (columnMapping["market"]) {
        const marketValue = row[columnMapping["market"]];
        if (marketValue && typeof marketValue === "string") {
          holding.market = marketValue.trim();
        }
      }

      // Extract region (optional, will be derived from market if not provided)
      if (columnMapping["region"]) {
        const regionValue = row[columnMapping["region"]];
        if (regionValue && typeof regionValue === "string") {
          holding.region = regionValue.trim();
        }
      }

      // Extract asset type (default to "Equity" if not provided)
      if (columnMapping["assetType"]) {
        const assetTypeValue = row[columnMapping["assetType"]];
        if (assetTypeValue && typeof assetTypeValue === "string") {
          holding.assetType = assetTypeValue.trim();
        }
      } else {
        holding.assetType = "Equity";
      }

      // If cost basis appears to be total (much larger than typical per-share price),
      // divide by quantity to get per-share cost
      if (holding.quantity > 0 && holding.costBasis > holding.quantity * 1000) {
        // Likely total cost basis, convert to per-share
        holding.costBasis = holding.costBasis / holding.quantity;
      }

      // Add to results
      if (holding.errors!.length > 0) {
        result.errors.push({
          row: rowNumber,
          message: `Row ${rowNumber}: ${holding.errors!.join("; ")}`,
        });
      } else {
        result.holdings.push(holding);
      }
    });

    // Merge duplicate tickers in the CSV itself
    const tickerMap = new Map<string, ParsedHolding>();
    result.holdings.forEach((holding) => {
      const existing = tickerMap.get(holding.ticker);
      if (existing) {
        // Merge: combine quantities and average cost basis
        const totalQuantity = existing.quantity + holding.quantity;
        const totalCost = existing.quantity * existing.costBasis + holding.quantity * holding.costBasis;
        existing.quantity = totalQuantity;
        existing.costBasis = totalQuantity > 0 ? totalCost / totalQuantity : 0;
        // Keep first occurrence's optional fields if missing in second
        if (!existing.name && holding.name) existing.name = holding.name;
        if (!existing.sector && holding.sector) existing.sector = holding.sector;
        if (!existing.industry && holding.industry) existing.industry = holding.industry;
        if (!existing.account && holding.account) existing.account = holding.account;
        if (!existing.currency && holding.currency) existing.currency = holding.currency;
        if (!existing.market && holding.market) existing.market = holding.market;
        if (!existing.region && holding.region) existing.region = holding.region;
        if (!existing.assetType && holding.assetType) existing.assetType = holding.assetType;
      } else {
        tickerMap.set(holding.ticker, { ...holding });
      }
    });

    result.holdings = Array.from(tickerMap.values());

    return result;
  } catch (error: any) {
    result.errors.push({
      row: 0,
      message: `Failed to parse CSV: ${error.message || "Unknown error"}`,
    });
    return result;
  }
}
