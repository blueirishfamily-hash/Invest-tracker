import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PortfolioMetricsCards } from "@/components/portfolio-metrics";
import { HoldingsTable } from "@/components/holdings-table";
import { BenchmarkChart } from "@/components/benchmark-chart";
import { BudgetPieChart } from "@/components/budget-pie-chart";
import { GoalProgression } from "@/components/goal-progression";
import { RecentTransactions } from "@/components/recent-transactions";
import { SEO } from "@/components/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Home, Bitcoin, Gem, Briefcase, DollarSign } from "lucide-react";
import { Link } from "wouter";
import type { Holding, PortfolioMetrics, BenchmarkData, NetWorthSummary } from "@shared/schema";

type Timeframe = "1D" | "5D" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "5Y" | "MAX";
type CardSize = "small" | "medium" | "large";

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [cardSizes, setCardSizes] = useState<Record<string, CardSize>>({
    netWorth: "large",
    portfolioMetrics: "medium",
    benchmark: "medium",
    holdings: "medium",
    goalProgression: "medium",
    budgetOverview: "medium",
    recentTransactions: "medium",
  });
  const { data: holdings, isLoading: holdingsLoading } = useQuery<Holding[]>({
    queryKey: ["/api/holdings"],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<PortfolioMetrics>({
    queryKey: ["/api/portfolio/metrics"],
  });

  const { data: benchmark, isLoading: benchmarkLoading } = useQuery<BenchmarkData>({
    queryKey: ["/api/benchmark", timeframe],
    queryFn: async () => {
      const url = `/api/benchmark?timeframe=${timeframe}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch benchmark data");
      }
      return response.json();
    },
  });

  const { data: benchmarkChart, isLoading: benchmarkChartLoading } = useQuery<{
    portfolio: Array<{ date: string; value: number }>;
    spy: Array<{ date: string; value: number }>;
  }>({
    queryKey: ["/api/benchmark/chart", timeframe],
    queryFn: async () => {
      const url = `/api/benchmark/chart?timeframe=${timeframe}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch benchmark chart data");
      }
      return response.json();
    },
  });


  const { data: netWorth, isLoading: netWorthLoading } = useQuery<NetWorthSummary>({
    queryKey: ["/api/net-worth"],
  });

  // Format currency helper
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const renderSizeSelect = (cardId: string) => (
    <Select
      value={cardSizes[cardId]}
      onValueChange={(value) =>
        setCardSizes((prev) => ({ ...prev, [cardId]: value as CardSize }))
      }
    >
      <SelectTrigger className="h-7 w-[120px] text-xs">
        <SelectValue placeholder="Size" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="small">Small</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="large">Large</SelectItem>
      </SelectContent>
    </Select>
  );

  const cardSpanClasses: Record<string, Record<CardSize, string>> = {
    portfolioMetrics: {
      small: "lg:col-span-4",
      medium: "lg:col-span-6",
      large: "lg:col-span-8",
    },
    benchmark: {
      small: "lg:col-span-8",
      medium: "lg:col-span-6",
      large: "lg:col-span-12",
    },
    holdings: {
      small: "lg:col-span-6",
      medium: "lg:col-span-6",
      large: "lg:col-span-12",
    },
    goalProgression: {
      small: "lg:col-span-4",
      medium: "lg:col-span-6",
      large: "lg:col-span-6",
    },
    budgetOverview: {
      small: "lg:col-span-4",
      medium: "lg:col-span-6",
      large: "lg:col-span-8",
    },
    recentTransactions: {
      small: "lg:col-span-4",
      medium: "lg:col-span-6",
      large: "lg:col-span-4",
    },
  };

  const cardHeightClasses: Record<string, Record<CardSize, string>> = {
    portfolioMetrics: {
      small: "min-h-[180px]",
      medium: "min-h-[220px]",
      large: "min-h-[260px]",
    },
    benchmark: {
      small: "min-h-[260px]",
      medium: "min-h-[320px]",
      large: "min-h-[380px]",
    },
    holdings: {
      small: "min-h-[260px]",
      medium: "min-h-[320px]",
      large: "min-h-[400px]",
    },
    goalProgression: {
      small: "min-h-[220px]",
      medium: "min-h-[260px]",
      large: "min-h-[300px]",
    },
    budgetOverview: {
      small: "min-h-[220px]",
      medium: "min-h-[280px]",
      large: "min-h-[340px]",
    },
    recentTransactions: {
      small: "min-h-[220px]",
      medium: "min-h-[260px]",
      large: "min-h-[300px]",
    },
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-dashboard">
      <SEO 
        title="Dashboard" 
        description="Track your investment portfolio performance with real-time metrics, benchmarking, and industry analysis." 
      />
      
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Portfolio Dashboard
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Track your investment performance and market insights
        </p>
      </div>

      {/* Net Worth Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Net Worth
              </CardTitle>
              <CardDescription>Total value across all asset classes</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/assets" className="text-sm text-primary hover:underline">
                Manage Assets →
              </Link>
              {renderSizeSelect("netWorth")}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {netWorthLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-48" />
              <div className="grid grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            </div>
          ) : netWorth ? (
            <div>
              <div className="mb-4">
                <div
                  className={`font-bold ${
                    cardSizes.netWorth === "small"
                      ? "text-2xl"
                      : cardSizes.netWorth === "large"
                        ? "text-4xl"
                        : "text-3xl"
                  }`}
                >
                  {formatCurrency(netWorth.netEquity)}
                </div>
                <div className={`text-muted-foreground ${cardSizes.netWorth === "small" ? "text-xs" : "text-sm"}`}>
                  Assets: {formatCurrency(netWorth.totalNetWorth)} | Liabilities: {formatCurrency(netWorth.totalLiabilities)}
                </div>
              </div>
              {cardSizes.netWorth !== "small" && (() => {
                const categories = [
                  { label: "Stocks & ETFs", value: netWorth.stocksAndETFs, icon: TrendingUp, color: "text-blue-500", bgColor: "bg-blue-500" },
                  { label: "Real Estate", value: netWorth.realEstate, icon: Home, color: "text-green-500", bgColor: "bg-green-500" },
                  { label: "Crypto", value: netWorth.crypto, icon: Bitcoin, color: "text-orange-500", bgColor: "bg-orange-500" },
                  { label: "Collectibles", value: netWorth.collectibles, icon: Gem, color: "text-purple-500", bgColor: "bg-purple-500" },
                  { label: "Alt Investments", value: netWorth.alternativeInvestments, icon: Briefcase, color: "text-cyan-500", bgColor: "bg-cyan-500" },
                ];
                const visibleCategories =
                  cardSizes.netWorth === "medium" ? categories.slice(0, 3) : categories;
                return (
                  <div
                    className={`grid gap-3 ${
                      cardSizes.netWorth === "large"
                        ? "grid-cols-2 md:grid-cols-5"
                        : "grid-cols-2 sm:grid-cols-3"
                    }`}
                  >
                    {visibleCategories.map((cat) => {
                      const percentage = netWorth.totalNetWorth > 0 
                        ? (cat.value / netWorth.totalNetWorth) * 100 
                        : 0;
                      return (
                        <div key={cat.label} className="p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-1.5 mb-1">
                            <cat.icon className={`h-3.5 w-3.5 ${cat.color}`} />
                            <span className="text-xs text-muted-foreground truncate">{cat.label}</span>
                          </div>
                          <div className={`font-semibold ${cardSizes.netWorth === "medium" ? "text-xs" : "text-sm"}`}>
                            {formatCurrency(cat.value)}
                          </div>
                          <Progress value={percentage} className={`mt-1 ${cardSizes.netWorth === "medium" ? "h-0.5" : "h-1"}`} />
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`col-span-1 ${cardSpanClasses.portfolioMetrics[cardSizes.portfolioMetrics]} ${cardHeightClasses.portfolioMetrics[cardSizes.portfolioMetrics]}`}>
          <PortfolioMetricsCards
            metrics={metrics}
            holdings={holdings}
            isLoading={metricsLoading}
            size={cardSizes.portfolioMetrics}
            sizeSelector={renderSizeSelect("portfolioMetrics")}
            cardClassName="h-full"
          />
        </div>
        <div className={`col-span-1 ${cardSpanClasses.benchmark[cardSizes.benchmark]} ${cardHeightClasses.benchmark[cardSizes.benchmark]}`}>
          <BenchmarkChart 
            data={benchmark} 
            chartData={benchmarkChart}
            isLoading={benchmarkLoading || benchmarkChartLoading} 
            timeframe={timeframe} 
            size={cardSizes.benchmark}
            sizeSelector={renderSizeSelect("benchmark")}
            cardClassName="h-full"
          />
        </div>
        <div className={`col-span-1 ${cardSpanClasses.holdings[cardSizes.holdings]} ${cardHeightClasses.holdings[cardSizes.holdings]}`}>
          <HoldingsTable
            holdings={holdings}
            isLoading={holdingsLoading}
            timeframe={timeframe}
            size={cardSizes.holdings}
            sizeSelector={renderSizeSelect("holdings")}
            cardClassName="h-full"
          />
        </div>
        <div className={`col-span-1 ${cardSpanClasses.goalProgression[cardSizes.goalProgression]} ${cardHeightClasses.goalProgression[cardSizes.goalProgression]}`}>
          <GoalProgression
            size={cardSizes.goalProgression}
            sizeSelector={renderSizeSelect("goalProgression")}
            cardClassName="h-full"
          />
        </div>
        <div className={`col-span-1 ${cardSpanClasses.budgetOverview[cardSizes.budgetOverview]} ${cardHeightClasses.budgetOverview[cardSizes.budgetOverview]}`}>
          <BudgetPieChart
            size={cardSizes.budgetOverview}
            sizeSelector={renderSizeSelect("budgetOverview")}
            cardClassName="h-full"
          />
        </div>
        <div className={`col-span-1 ${cardSpanClasses.recentTransactions[cardSizes.recentTransactions]} ${cardHeightClasses.recentTransactions[cardSizes.recentTransactions]}`}>
          <RecentTransactions
            size={cardSizes.recentTransactions}
            sizeSelector={renderSizeSelect("recentTransactions")}
            cardClassName="h-full"
          />
        </div>
      </div>
    </div>
  );
}
