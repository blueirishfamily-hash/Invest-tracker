import { useQuery } from "@tanstack/react-query";
import { PortfolioMetricsCards } from "@/components/portfolio-metrics";
import { HoldingsTable } from "@/components/holdings-table";
import { BenchmarkChart } from "@/components/benchmark-chart";
import { IndustryChart } from "@/components/industry-chart";
import { BubbleWatchCompact } from "@/components/bubble-watch";
import { SEO } from "@/components/seo";
import type { Holding, PortfolioMetrics, BenchmarkData, IndustryAnalysis, BubbleWarning } from "@shared/schema";

export default function Dashboard() {
  const { data: holdings, isLoading: holdingsLoading } = useQuery<Holding[]>({
    queryKey: ["/api/holdings"],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<PortfolioMetrics>({
    queryKey: ["/api/portfolio/metrics"],
  });

  const { data: benchmark, isLoading: benchmarkLoading } = useQuery<BenchmarkData>({
    queryKey: ["/api/benchmark"],
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <BenchmarkChart data={benchmark} isLoading={benchmarkLoading} />
        <IndustryChart data={industries} isLoading={industriesLoading} />
      </div>

      <HoldingsTable holdings={holdings} isLoading={holdingsLoading} />
    </div>
  );
}
