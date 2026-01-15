import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { SEO } from "@/components/seo";
import { StockChart } from "@/components/stock-chart";
import type { StockData, IndexData } from "@shared/schema";

type Timeframe = "1D" | "5D" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "5Y" | "MAX";

export default function Research() {
  const [searchQuery, setSearchQuery] = useState("");
  const [ticker, setTicker] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [selectedIndices, setSelectedIndices] = useState<string[]>([]);

  const { data: stockData, isLoading: stockLoading, error: stockError } = useQuery<StockData>({
    queryKey: ["/api/research/stock", ticker, timeframe],
    queryFn: async () => {
      if (!ticker) return null;
      const url = `/api/research/stock?query=${encodeURIComponent(ticker)}&timeframe=${timeframe}`;
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorText = await response.text();
        throw new Error(errorText || "Failed to fetch stock data");
      }
      return response.json();
    },
    enabled: !!ticker,
  });

  const { data: indexData, isLoading: indexLoading } = useQuery<IndexData[]>({
    queryKey: ["/api/research/indices", timeframe, selectedIndices.join(",")],
    queryFn: async () => {
      if (selectedIndices.length === 0) return [];
      const indicesParam = selectedIndices.join(",");
      const url = `/api/research/indices?timeframe=${timeframe}&indices=${encodeURIComponent(indicesParam)}`;
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to fetch index data");
      }
      return response.json();
    },
    enabled: selectedIndices.length > 0,
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setTicker(searchQuery.trim().toUpperCase());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const toggleIndex = (indexSymbol: string) => {
    setSelectedIndices((prev) =>
      prev.includes(indexSymbol)
        ? prev.filter((s) => s !== indexSymbol)
        : [...prev, indexSymbol]
    );
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-research">
      <SEO
        title="Research"
        description="Research stocks by ticker symbol or company name. Compare performance against major indices."
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Stock Research
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Search for stocks and compare performance with major indices
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter ticker symbol or company name (e.g., AAPL, Apple)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={!searchQuery.trim()}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {stockData && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl">
                  {stockData.ticker} - {stockData.name}
                </CardTitle>
                {stockData.sector && stockData.industry && (
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{stockData.sector}</Badge>
                    <Badge variant="outline">{stockData.industry}</Badge>
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Current Price</p>
                <p className="text-2xl font-bold tabular-nums">
                  ${stockData.currentPrice.toFixed(2)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="timeframe-select" className="text-sm text-muted-foreground whitespace-nowrap">
                  Timeframe:
                </label>
                <Select value={timeframe} onValueChange={(value) => setTimeframe(value as Timeframe)}>
                  <SelectTrigger id="timeframe-select" className="w-[150px]">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1D">1 Day</SelectItem>
                    <SelectItem value="5D">5 Days</SelectItem>
                    <SelectItem value="1M">1 Month</SelectItem>
                    <SelectItem value="3M">3 Months</SelectItem>
                    <SelectItem value="6M">6 Months</SelectItem>
                    <SelectItem value="YTD">YTD</SelectItem>
                    <SelectItem value="1Y">1 Year</SelectItem>
                    <SelectItem value="5Y">5 Years</SelectItem>
                    <SelectItem value="MAX">Max</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm text-muted-foreground">Compare with:</label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="spy"
                      checked={selectedIndices.includes("SPY")}
                      onCheckedChange={() => toggleIndex("SPY")}
                    />
                    <label
                      htmlFor="spy"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      S&P 500
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="dji"
                      checked={selectedIndices.includes("DJI")}
                      onCheckedChange={() => toggleIndex("DJI")}
                    />
                    <label
                      htmlFor="dji"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      DOW Jones
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ixic"
                      checked={selectedIndices.includes("IXIC")}
                      onCheckedChange={() => toggleIndex("IXIC")}
                    />
                    <label
                      htmlFor="ixic"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Nasdaq
                    </label>
                  </div>
                </div>
              </div>
            </div>
            {stockData && (
              <StockChart
                stockData={stockData}
                indexData={indexData || []}
                timeframe={timeframe}
                isLoading={stockLoading || indexLoading}
              />
            )}
          </CardContent>
        </Card>
      )}

      {!ticker && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Search for a Stock</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Enter a ticker symbol (e.g., AAPL, MSFT) or company name to view stock performance and compare with major indices.
            </p>
          </CardContent>
        </Card>
      )}

      {ticker && !stockLoading && !stockData && !stockError && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Stock Not Found</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Could not find stock data for "{ticker}". Please check the ticker symbol and try again. Available tickers: AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, JPM, JNJ
            </p>
          </CardContent>
        </Card>
      )}

      {stockError && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Error Loading Stock Data</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {stockError instanceof Error ? stockError.message : "An error occurred while fetching stock data."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
