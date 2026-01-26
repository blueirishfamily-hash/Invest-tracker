import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";

type Timeframe = "1D" | "5D" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "5Y" | "MAX";

interface HoldingPerformance {
  ticker: string;
  name: string;
  quantity: number;
  startPrice: number;
  currentPrice: number;
  currentValue: number;
  percentChange: number;
  valueChange: number;
}

interface TopStocksProps {
  timeframe: Timeframe;
}

// Helper function to get company logo URL via local proxy
function getCompanyLogoUrl(ticker: string, name: string): string {
  const encodedName = encodeURIComponent(name);
  return `/api/logo?ticker=${ticker}&name=${encodedName}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function StockItem({
  stock,
  metricType,
  isPositive,
}: {
  stock: HoldingPerformance;
  metricType: "percent" | "value";
  isPositive: boolean;
}) {
  const [logoError, setLogoError] = useState(false);
  const logoUrl = getCompanyLogoUrl(stock.ticker, stock.name);
  const changeValue = metricType === "percent" ? stock.percentChange : stock.valueChange;
  const displayValue = metricType === "percent" ? formatPercent(changeValue) : formatCurrency(changeValue);

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 overflow-hidden shrink-0">
          {!logoError ? (
            <img
              src={logoUrl}
              alt={`${stock.name} logo`}
              className="h-full w-full object-contain p-1.5"
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className="text-primary font-mono font-bold text-sm">
              {stock.ticker.slice(0, 2)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Badge variant="secondary" className="font-mono font-semibold mb-1">
            {stock.ticker}
          </Badge>
          <p className="text-sm text-muted-foreground truncate">{stock.name}</p>
        </div>
      </div>
      <div className={`flex items-center gap-2 ${isPositive ? "text-positive" : "text-destructive"}`}>
        {isPositive ? (
          <TrendingUp className="h-4 w-4 shrink-0" />
        ) : (
          <TrendingDown className="h-4 w-4 shrink-0" />
        )}
        <span className="font-semibold tabular-nums text-right">
          {displayValue}
        </span>
      </div>
    </div>
  );
}

export function TopStocks({ timeframe }: TopStocksProps) {
  const [metricType, setMetricType] = useState<"percent" | "value">("percent");

  const { data: performanceData, isLoading, error } = useQuery<HoldingPerformance[]>({
    queryKey: ["/api/holdings/performance", timeframe],
    queryFn: async () => {
      const response = await fetch(`/api/holdings/performance?timeframe=${timeframe}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch holdings performance");
      }
      return response.json();
    },
  });

  // Sort and filter top gainers and losers
  const { topGainers, topLosers } = useMemo(() => {
    if (!performanceData || performanceData.length === 0) {
      return { topGainers: [], topLosers: [] };
    }

    // Sort by selected metric
    const sorted = [...performanceData].sort((a, b) => {
      const aValue = metricType === "percent" ? a.percentChange : a.valueChange;
      const bValue = metricType === "percent" ? b.percentChange : b.valueChange;
      return bValue - aValue; // Descending
    });

    // Get top 5 gainers (positive values)
    const gainers = sorted.filter((item) => {
      const value = metricType === "percent" ? item.percentChange : item.valueChange;
      return value > 0;
    }).slice(0, 5);

    // Get top 5 losers (negative values) - sorted ascending (most negative first)
    const losers = sorted
      .filter((item) => {
        const value = metricType === "percent" ? item.percentChange : item.valueChange;
        return value < 0;
      })
      .sort((a, b) => {
        const aValue = metricType === "percent" ? a.percentChange : a.valueChange;
        const bValue = metricType === "percent" ? b.percentChange : b.valueChange;
        return aValue - bValue; // Ascending (most negative first)
      })
      .slice(0, 5);

    return { topGainers: gainers, topLosers: losers };
  }, [performanceData, metricType]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted animate-pulse rounded w-1/3" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Unable to load top stocks performance data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!performanceData || performanceData.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Top Gainers & Losers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">No holdings data available</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Top Gainers & Losers</h2>
          <p className="text-sm text-muted-foreground">Top performing stocks for the selected timeframe</p>
        </div>
        {/* Metric Type Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="metric-select" className="text-sm text-muted-foreground whitespace-nowrap">
            Sort by:
          </label>
          <Select
            value={metricType}
            onValueChange={(value) => setMetricType(value as "percent" | "value")}
          >
            <SelectTrigger id="metric-select" className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Percent Change</SelectItem>
              <SelectItem value="value">Value Change</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top Gainers and Losers Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Gainers Card */}
        <Card className="border-positive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-positive">
              <TrendingUp className="h-5 w-5" />
              Top 5 Gainers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topGainers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No gainers found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {topGainers.map((stock) => (
                  <StockItem
                    key={stock.ticker}
                    stock={stock}
                    metricType={metricType}
                    isPositive={true}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Losers Card */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TrendingDown className="h-5 w-5" />
              Top 5 Losers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topLosers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <TrendingDown className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No losers found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {topLosers.map((stock) => (
                  <StockItem
                    key={stock.ticker}
                    stock={stock}
                    metricType={metricType}
                    isPositive={false}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
