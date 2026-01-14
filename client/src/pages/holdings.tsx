import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import { SEO } from "@/components/seo";
import type { Holding } from "@shared/schema";

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

function HoldingCard({ holding }: { holding: Holding }) {
  const isPositive = holding.growthRate30d >= 0;
  const gainLoss = holding.currentValue - holding.costBasis;
  const gainLossPercent = ((gainLoss / holding.costBasis) * 100);

  return (
    <Card className="hover-elevate" data-testid={`card-holding-${holding.ticker}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-mono font-bold text-sm">
            {holding.ticker.slice(0, 2)}
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
        <Badge variant="outline" className="text-xs shrink-0" data-testid={`badge-sector-${holding.ticker}`}>
          {holding.sector}
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

export default function Holdings() {
  const { data: holdings, isLoading } = useQuery<Holding[]>({
    queryKey: ["/api/holdings"],
  });

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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="holdings-loading">
          {[...Array(6)].map((_, i) => (
            <HoldingCardSkeleton key={i} />
          ))}
        </div>
      ) : holdings && holdings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="holdings-grid">
          {holdings.map((holding) => (
            <HoldingCard key={holding.id} holding={holding} />
          ))}
        </div>
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
