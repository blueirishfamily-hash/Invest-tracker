import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import type { PortfolioMetrics, Holding } from "@shared/schema";

interface PortfolioMetricsCardsProps {
  metrics: PortfolioMetrics | undefined;
  holdings: Holding[] | undefined;
  isLoading: boolean;
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

function MetricSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        <div className="h-4 w-4 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-32 bg-muted animate-pulse rounded mb-2" />
        <div className="h-3 w-16 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}

export function PortfolioMetricsCards({ metrics, holdings, isLoading }: PortfolioMetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <MetricSkeleton />
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  // Calculate daily change from holdings
  let dailyChange = 0;
  let dailyChangePercent = 0;
  
  if (holdings && holdings.length > 0) {
    // Calculate weighted average daily change from 30-day growth rates
    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    if (totalValue > 0) {
      const weightedDailyChange = holdings.reduce((sum, h) => {
        // Approximate daily change from 30-day growth rate
        const dailyGrowthRate = h.growthRate30d / 30;
        const dailyChangeForHolding = (h.currentValue * dailyGrowthRate) / 100;
        return sum + dailyChangeForHolding;
      }, 0);
      dailyChange = weightedDailyChange;
      dailyChangePercent = (dailyChange / totalValue) * 100;
    }
  }

  const isPositiveChange = dailyChange >= 0;

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Portfolio Value
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums" data-testid="text-total-value">
            {formatCurrency(metrics.totalValue)}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className={`text-sm font-medium tabular-nums ${isPositiveChange ? "text-chart-1" : "text-destructive"}`}>
              {isPositiveChange ? "+" : ""}{formatCurrency(dailyChange)}
            </div>
            <div className={`text-xs tabular-nums ${isPositiveChange ? "text-chart-1" : "text-destructive"}`}>
              ({isPositiveChange ? "+" : ""}{dailyChangePercent.toFixed(2)}%)
            </div>
            {isPositiveChange ? (
              <TrendingUp className="h-3 w-3 text-chart-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-destructive" />
            )}
            <span className="text-xs text-muted-foreground">today</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
