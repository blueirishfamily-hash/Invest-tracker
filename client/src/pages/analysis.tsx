import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IndustryChart, IndustryTable } from "@/components/industry-chart";
import { BenchmarkChart } from "@/components/benchmark-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Target, AlertCircle } from "lucide-react";
import { SEO } from "@/components/seo";
import type { SectorAnalysis, BenchmarkData, PortfolioMetrics } from "@shared/schema";

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function Analysis() {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const { data: sectors, isLoading: sectorsLoading } = useQuery<SectorAnalysis[]>({
    queryKey: ["/api/sector-analysis"],
  });

  const { data: benchmark, isLoading: benchmarkLoading } = useQuery<BenchmarkData>({
    queryKey: ["/api/benchmark"],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<PortfolioMetrics>({
    queryKey: ["/api/portfolio/metrics"],
  });

  const isLoading = sectorsLoading || benchmarkLoading || metricsLoading;

  const topPerformer = sectors?.reduce((prev, current) => 
    current.averageGrowth > prev.averageGrowth ? current : prev
  , sectors[0]);

  const bottomPerformer = sectors?.reduce((prev, current) => 
    current.averageGrowth < prev.averageGrowth ? current : prev
  , sectors[0]);

  const mostConcentrated = sectors?.reduce((prev, current) => 
    current.percentage > prev.percentage ? current : prev
  , sectors[0]);

  return (
    <div className="p-6 space-y-6" data-testid="page-analysis">
      <SEO 
        title="Analysis" 
        description="Deep dive into your portfolio performance with sector allocation, benchmark comparison, and performance insights." 
      />
      
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Portfolio Analysis
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Deep dive into your portfolio performance and sector allocation
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-top-performer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Performer
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-1" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-10 bg-muted animate-pulse rounded" />
            ) : topPerformer ? (
              <>
                <div className="text-lg font-semibold truncate" data-testid="text-top-performer-name">
                  {topPerformer.sector}
                </div>
                <p className="text-chart-1 text-sm font-medium tabular-nums" data-testid="text-top-performer-growth">
                  {formatPercent(topPerformer.averageGrowth)}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-bottom-performer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bottom Performer
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-10 bg-muted animate-pulse rounded" />
            ) : bottomPerformer ? (
              <>
                <div className="text-lg font-semibold truncate" data-testid="text-bottom-performer-name">
                  {bottomPerformer.sector}
                </div>
                <p 
                  className={`text-sm font-medium tabular-nums ${bottomPerformer.averageGrowth >= 0 ? "text-chart-1" : "text-destructive"}`}
                  data-testid="text-bottom-performer-growth"
                >
                  {formatPercent(bottomPerformer.averageGrowth)}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-largest-position">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Largest Position
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-10 bg-muted animate-pulse rounded" />
            ) : mostConcentrated ? (
              <>
                <div className="text-lg font-semibold truncate" data-testid="text-largest-position-name">
                  {mostConcentrated.sector}
                </div>
                <p className="text-muted-foreground text-sm tabular-nums" data-testid="text-largest-position-percent">
                  {mostConcentrated.percentage.toFixed(1)}% of portfolio
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-diversification">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Diversification
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-10 bg-muted animate-pulse rounded" />
            ) : sectors ? (
              <>
                <div className="text-lg font-semibold" data-testid="text-sector-count">
                  {sectors.length} Sectors
                </div>
                <p className="text-muted-foreground text-sm" data-testid="text-diversification-status">
                  {sectors.length >= 5 ? "Well diversified" : "Consider diversifying"}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <IndustryChart 
          data={sectors} 
          isLoading={sectorsLoading}
          selectedSector={selectedSector}
          onSectorSelect={setSelectedSector}
        />
        <BenchmarkChart data={benchmark} isLoading={benchmarkLoading} timeframe="1M" />
      </div>

      <IndustryTable 
        data={sectors} 
        isLoading={sectorsLoading}
        selectedSector={selectedSector}
        onSectorSelect={setSelectedSector}
      />

      <Card data-testid="card-insights">
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
          <CardDescription>Key observations about your portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {benchmark && metrics && (
                <div className="p-4 rounded-lg bg-muted/50" data-testid="insight-benchmark">
                  <h4 className="font-medium mb-1">Benchmark Comparison</h4>
                  <p className="text-sm text-muted-foreground">
                    {benchmark.portfolioGrowth > benchmark.spyGrowth ? (
                      <>
                        Your portfolio is <span className="text-chart-1 font-medium">outperforming</span> the S&P 500 by{" "}
                        <span className="font-medium tabular-nums">{(benchmark.portfolioGrowth - benchmark.spyGrowth).toFixed(2)}%</span> over the past 30 days.
                      </>
                    ) : (
                      <>
                        Your portfolio is <span className="text-chart-4 font-medium">underperforming</span> the S&P 500 by{" "}
                        <span className="font-medium tabular-nums">{(benchmark.spyGrowth - benchmark.portfolioGrowth).toFixed(2)}%</span> over the past 30 days.
                      </>
                    )}
                  </p>
                </div>
              )}

              {mostConcentrated && mostConcentrated.percentage > 30 && (
                <div className="p-4 rounded-lg bg-chart-4/10 border border-chart-4/20" data-testid="insight-concentration">
                  <h4 className="font-medium mb-1 text-chart-4">Concentration Risk</h4>
                  <p className="text-sm text-muted-foreground">
                    {mostConcentrated.sector} represents {mostConcentrated.percentage.toFixed(1)}% of your portfolio.
                    Consider rebalancing to reduce concentration risk.
                  </p>
                </div>
              )}

              {sectors && sectors.length < 4 && (
                <div className="p-4 rounded-lg bg-muted/50" data-testid="insight-diversification">
                  <h4 className="font-medium mb-1">Diversification Opportunity</h4>
                  <p className="text-sm text-muted-foreground">
                    Your portfolio spans only {sectors.length} sector{sectors.length !== 1 ? "s" : ""}. 
                    Adding exposure to more sectors could help reduce overall portfolio volatility.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
