import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import type { PortfolioMetrics, Holding } from "@shared/schema";

type CardSize = "small" | "medium" | "large";

interface PortfolioMetricsCardsProps {
  metrics: PortfolioMetrics | undefined;
  holdings: Holding[] | undefined;
  isLoading: boolean;
  size?: CardSize;
  sizeSelector?: ReactNode;
  cardClassName?: string;
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

export function PortfolioMetricsCards({ metrics, holdings, isLoading, size = "medium", sizeSelector, cardClassName }: PortfolioMetricsCardsProps) {
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
      <Card className={cardClassName}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
          <CardTitle className={`font-medium text-muted-foreground ${size === "small" ? "text-xs" : "text-sm"}`}>
            Total Portfolio Value
          </CardTitle>
          <div className="flex items-center gap-2">
            {sizeSelector}
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={`font-bold tabular-nums ${
              size === "small" ? "text-xl" : size === "large" ? "text-3xl" : "text-2xl"
            }`}
            data-testid="text-total-value"
          >
            {formatCurrency(metrics.totalValue)}
          </div>
          <div className={`flex items-center gap-2 ${size === "small" ? "mt-1" : "mt-2"}`}>
            <div className={`font-medium tabular-nums ${size === "small" ? "text-xs" : "text-sm"} ${isPositiveChange ? "text-positive" : "text-destructive"}`}>
              {isPositiveChange ? "+" : ""}{formatCurrency(dailyChange)}
            </div>
            {size !== "small" && (
              <div className={`tabular-nums ${size === "small" ? "text-[10px]" : "text-xs"} ${isPositiveChange ? "text-positive" : "text-destructive"}`}>
                ({isPositiveChange ? "+" : ""}{dailyChangePercent.toFixed(2)}%)
              </div>
            )}
            {size === "large" && (
              <>
                {isPositiveChange ? (
                  <TrendingUp className="h-3 w-3 text-positive" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span className="text-xs text-muted-foreground">today</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
