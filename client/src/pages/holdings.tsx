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
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import { SEO } from "@/components/seo";
import type { Holding } from "@shared/schema";

type SortOption = "alphabetical" | "value" | "sector";

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

// Helper function to get company logo URL via local proxy
function getCompanyLogoUrl(ticker: string, name: string): string {
  const encodedName = encodeURIComponent(name);
  return `/api/logo?ticker=${ticker}&name=${encodedName}`;
}

function HoldingCard({ holding }: { holding: Holding }) {
  const isPositive = holding.growthRate30d >= 0;
  const gainLoss = holding.currentValue - holding.costBasis;
  const gainLossPercent = ((gainLoss / holding.costBasis) * 100);

  const logoUrl = getCompanyLogoUrl(holding.ticker, holding.name);
  const [logoError, setLogoError] = useState(false);

  return (
    <Card className="hover-elevate" data-testid={`card-holding-${holding.ticker}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 gap-2">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
            {!logoError ? (
              <img
                src={logoUrl}
                alt={`${holding.name} logo`}
                className="h-full w-full object-contain p-1.5"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-primary font-mono font-bold text-sm">
                {holding.ticker.slice(0, 2)}
              </span>
            )}
          </div>
          <div>
            <Badge variant="secondary" className="font-mono font-semibold mb-1" data-testid={`badge-ticker-${holding.ticker}`}>
              {holding.ticker}
            </Badge>
            <p className="text-sm text-muted-foreground truncate max-w-[200px]" data-testid={`text-name-${holding.ticker}`}>
              {holding.name}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs shrink-0" data-testid={`badge-industry-${holding.ticker}`}>
          {holding.industry}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Current Value
            </p>
            <p className="text-lg font-semibold tabular-nums" data-testid={`text-value-${holding.ticker}`}>
              {formatCurrency(holding.currentValue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Cost Basis
            </p>
            <p className="text-lg font-semibold tabular-nums" data-testid={`text-cost-${holding.ticker}`}>
              {formatCurrency(holding.costBasis)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Gain/Loss</p>
            <p 
              className={`text-sm font-medium tabular-nums ${gainLoss >= 0 ? "text-chart-1" : "text-destructive"}`}
              data-testid={`text-gainloss-${holding.ticker}`}
            >
              {formatCurrency(gainLoss)} ({formatPercent(gainLossPercent)})
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">30D Change</p>
            <div 
              className={`flex items-center justify-end gap-1 ${isPositive ? "text-chart-1" : "text-destructive"}`}
              data-testid={`text-change-${holding.ticker}`}
            >
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="font-medium tabular-nums">
                {formatPercent(holding.growthRate30d)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Shares</span>
          <span className="font-medium tabular-nums" data-testid={`text-shares-${holding.ticker}`}>
            {holding.quantity}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Price/Share</span>
          <span className="font-medium tabular-nums" data-testid={`text-price-${holding.ticker}`}>
            {formatCurrency(holding.currentPrice)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function HoldingCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 gap-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
          <div>
            <div className="h-5 w-16 bg-muted animate-pulse rounded mb-1" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="h-5 w-20 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-12 bg-muted animate-pulse rounded" />
          <div className="h-12 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-12 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}

// Export HoldingsTab as a reusable component for use in Assets page
export function HoldingsTab() {
  const { data: holdings, isLoading } = useQuery<Holding[]>({
    queryKey: ["/api/holdings"],
  });

  const [sortOption, setSortOption] = useState<SortOption>("alphabetical");

  const sortedHoldings = useMemo(() => {
    if (!holdings) return [];

    const holdingsCopy = [...holdings];

    switch (sortOption) {
      case "alphabetical":
        return holdingsCopy.sort((a, b) => a.ticker.localeCompare(b.ticker));
      case "value":
        return holdingsCopy.sort((a, b) => b.currentValue - a.currentValue);
      case "sector":
        return holdingsCopy.sort((a, b) => {
          const sectorCompare = a.sector.localeCompare(b.sector);
          return sectorCompare !== 0
            ? sectorCompare
            : a.ticker.localeCompare(b.ticker);
        });
      default:
        return holdingsCopy;
    }
  }, [holdings, sortOption]);

  // Group holdings by sector when sorted by sector
  const groupedBySector = useMemo(() => {
    if (sortOption !== "sector" || !sortedHoldings) return null;

    const grouped = new Map<string, Holding[]>();
    sortedHoldings.forEach((holding) => {
      const sector = holding.sector;
      if (!grouped.has(sector)) {
        grouped.set(sector, []);
      }
      grouped.get(sector)!.push(holding);
    });

    return Array.from(grouped.entries())
      .map(([sector, holdings]) => ({ sector, holdings }))
      .sort((a, b) => a.sector.localeCompare(b.sector));
  }, [sortedHoldings, sortOption]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Holdings
          </h2>
          <p className="text-sm text-muted-foreground">
            Detailed view of your investment positions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-sm text-muted-foreground whitespace-nowrap">
            Sort by:
          </label>
          <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
            <SelectTrigger id="sort-select" className="w-[200px]">
              <SelectValue placeholder="Select sort option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabetical">Alphabetical (A-Z)</SelectItem>
              <SelectItem value="value">Current Value (High to Low)</SelectItem>
              <SelectItem value="sector">Sector</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="holdings-loading">
          {[...Array(6)].map((_, i) => (
            <HoldingCardSkeleton key={i} />
          ))}
        </div>
      ) : sortedHoldings && sortedHoldings.length > 0 ? (
        sortOption === "sector" && groupedBySector ? (
          <div className="space-y-6" data-testid="holdings-grouped">
            {groupedBySector.map((group) => (
              <div key={group.sector}>
                <h2 className="text-lg font-semibold mb-4 text-foreground">
                  {group.sector}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {group.holdings.map((holding) => (
                    <HoldingCard key={holding.id} holding={holding} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="holdings-grid">
            {sortedHoldings.map((holding) => (
              <HoldingCard key={holding.id} holding={holding} />
            ))}
          </div>
        )
      ) : (
        <Card data-testid="holdings-empty">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Holdings Yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Your portfolio is currently empty. Connect your investment account or use demo mode to see your holdings.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Default export wraps HoldingsTab with page-level elements for /holdings route
export default function Holdings() {
  return (
    <div className="p-6 space-y-6" data-testid="page-holdings">
      <SEO 
        title="Holdings" 
        description="View detailed information about your investment positions including current value, cost basis, and performance." 
      />
      
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Holdings
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Detailed view of your investment positions
        </p>
      </div>

      <HoldingsTab />
    </div>
  );
}
