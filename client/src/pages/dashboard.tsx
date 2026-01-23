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
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Home, Bitcoin, Gem, Briefcase, DollarSign } from "lucide-react";
import { Link } from "wouter";
import type { Holding, PortfolioMetrics, BenchmarkData, NetWorthSummary } from "@shared/schema";

type Timeframe = "1D" | "5D" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "5Y" | "MAX";

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
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
            <Link href="/assets" className="text-sm text-primary hover:underline">
              Manage Assets →
            </Link>
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
                <div className="text-3xl font-bold">{formatCurrency(netWorth.netEquity)}</div>
                <div className="text-sm text-muted-foreground">
                  Assets: {formatCurrency(netWorth.totalNetWorth)} | Liabilities: {formatCurrency(netWorth.totalLiabilities)}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: "Stocks & ETFs", value: netWorth.stocksAndETFs, icon: TrendingUp, color: "text-blue-500", bgColor: "bg-blue-500" },
                  { label: "Real Estate", value: netWorth.realEstate, icon: Home, color: "text-green-500", bgColor: "bg-green-500" },
                  { label: "Crypto", value: netWorth.crypto, icon: Bitcoin, color: "text-orange-500", bgColor: "bg-orange-500" },
                  { label: "Collectibles", value: netWorth.collectibles, icon: Gem, color: "text-purple-500", bgColor: "bg-purple-500" },
                  { label: "Alt Investments", value: netWorth.alternativeInvestments, icon: Briefcase, color: "text-cyan-500", bgColor: "bg-cyan-500" },
                ].map((cat) => {
                  const percentage = netWorth.totalNetWorth > 0 
                    ? (cat.value / netWorth.totalNetWorth) * 100 
                    : 0;
                  return (
                    <div key={cat.label} className="p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <cat.icon className={`h-3.5 w-3.5 ${cat.color}`} />
                        <span className="text-xs text-muted-foreground truncate">{cat.label}</span>
                      </div>
                      <div className="font-semibold text-sm">{formatCurrency(cat.value)}</div>
                      <Progress value={percentage} className="h-1 mt-1" />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-6">
          <PortfolioMetricsCards metrics={metrics} holdings={holdings} isLoading={metricsLoading} />
          <BenchmarkChart 
            data={benchmark} 
            chartData={benchmarkChart}
            isLoading={benchmarkLoading || benchmarkChartLoading} 
            timeframe={timeframe} 
          />
          <HoldingsTable holdings={holdings} isLoading={holdingsLoading} timeframe={timeframe} />
        </div>
        <div className="space-y-6">
          <GoalProgression />
          <div className="flex gap-6">
            <div className="w-1/2">
              <BudgetPieChart />
            </div>
            <div className="w-1/2">
              <RecentTransactions />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
