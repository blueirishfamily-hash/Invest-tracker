import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Percent, BarChart3, Clock } from "lucide-react";
import type { PortfolioMetrics } from "@shared/schema";

interface PortfolioMetricsCardsProps {
  metrics: PortfolioMetrics | undefined;
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

export function PortfolioMetricsCards({ metrics, isLoading }: PortfolioMetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const isPositiveReturn = metrics.totalReturn >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <p className="text-xs text-muted-foreground mt-1">
            Current market value
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Cost Basis
          </CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums" data-testid="text-cost-basis">
            {formatCurrency(metrics.totalCostBasis)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Original investment
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Return
          </CardTitle>
          {isPositiveReturn ? (
            <TrendingUp className="h-4 w-4 text-chart-1" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold tabular-nums ${
              isPositiveReturn ? "text-chart-1" : "text-destructive"
            }`}
            data-testid="text-total-return"
          >
            {formatCurrency(metrics.totalReturn)}
          </div>
          <p className={`text-xs mt-1 ${isPositiveReturn ? "text-chart-1" : "text-destructive"}`}>
            {formatPercent(metrics.totalReturnPercent)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Time-Weighted Return
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold tabular-nums ${
              metrics.timeWeightedReturn >= 0 ? "text-chart-1" : "text-destructive"
            }`}
            data-testid="text-twr"
          >
            {formatPercent(metrics.timeWeightedReturn)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Performance metric
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
