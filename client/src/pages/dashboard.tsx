import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PortfolioMetricsCards } from "@/components/portfolio-metrics";
import { HoldingsTable } from "@/components/holdings-table";
import { BenchmarkChart } from "@/components/benchmark-chart";
import { IndustryChart } from "@/components/industry-chart";
import { BubbleWatchCompact } from "@/components/bubble-watch";
import { TopStocks } from "@/components/top-stocks";
import { SEO } from "@/components/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, Home, Bitcoin, Gem, Briefcase, DollarSign } from "lucide-react";
import { Link } from "wouter";
import type { Holding, PortfolioMetrics, BenchmarkData, IndustryAnalysis, BubbleWarning, NetWorthSummary } from "@shared/schema";

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

  const { data: industries, isLoading: industriesLoading } = useQuery<IndustryAnalysis[]>({
    queryKey: ["/api/industry-analysis"],
  });

  const { data: bubbleWarnings, isLoading: bubbleLoading } = useQuery<BubbleWarning[]>({
    queryKey: ["/api/bubble-watch"],
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

      <BubbleWatchCompact warnings={bubbleWarnings} isLoading={bubbleLoading} />

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

      <PortfolioMetricsCards metrics={metrics} isLoading={metricsLoading} />

      <TopStocks timeframe={timeframe} />

      <div className="flex items-center justify-end gap-2 mb-2">
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <BenchmarkChart 
          data={benchmark} 
          chartData={benchmarkChart}
          isLoading={benchmarkLoading || benchmarkChartLoading} 
          timeframe={timeframe} 
        />
        <IndustryChart data={industries} isLoading={industriesLoading} />
      </div>

      <HoldingsTable holdings={holdings} isLoading={holdingsLoading} timeframe={timeframe} />
    </div>
  );
}
