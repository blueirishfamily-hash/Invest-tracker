import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PortfolioMetricsCards } from "@/components/portfolio-metrics";
import { HoldingsTable } from "@/components/holdings-table";
import { BenchmarkChart } from "@/components/benchmark-chart";
import { IndustryChart } from "@/components/industry-chart";
import { BubbleWatchCompact } from "@/components/bubble-watch";
import { SEO } from "@/components/seo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Holding, PortfolioMetrics, BenchmarkData, IndustryAnalysis, BubbleWarning } from "@shared/schema";

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

      <PortfolioMetricsCards metrics={metrics} isLoading={metricsLoading} />

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
