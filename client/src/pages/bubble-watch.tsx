import { useQuery } from "@tanstack/react-query";
import { BubbleWatchAlerts } from "@/components/bubble-watch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, TrendingUp, PieChart, Info } from "lucide-react";
import { SEO } from "@/components/seo";
import type { BubbleWarning, IndustryAnalysis, BenchmarkData } from "@shared/schema";

export default function BubbleWatchPage() {
  const { data: bubbleWarnings, isLoading: bubbleLoading } = useQuery<BubbleWarning[]>({
    queryKey: ["/api/bubble-watch"],
  });

  const { data: industries, isLoading: industriesLoading } = useQuery<IndustryAnalysis[]>({
    queryKey: ["/api/industry-analysis"],
  });

  const { data: benchmark, isLoading: benchmarkLoading } = useQuery<BenchmarkData>({
    queryKey: ["/api/benchmark"],
  });

  const isLoading = bubbleLoading || industriesLoading || benchmarkLoading;

  return (
    <div className="p-6 space-y-6" data-testid="page-bubble-watch">
      <SEO 
        title="Bubble Watch" 
        description="Monitor sectors for signs of overheating and potential market bubbles based on concentration and velocity metrics." 
      />
      
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2" data-testid="text-page-title">
          <AlertTriangle className="h-6 w-6" />
          Bubble Watch
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Monitor sectors for signs of overheating and potential market bubbles
        </p>
      </div>

      <Card data-testid="card-how-it-works">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            How Bubble Detection Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-lg bg-muted/50" data-testid="explanation-concentration">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="h-5 w-5 text-warning" />
                <h4 className="font-medium">Concentration Check</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                A sector is flagged when it makes up more than 30% of your total portfolio value.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Threshold:</span>
                <Progress value={30} className="h-2 flex-1" />
                <span className="text-sm font-medium tabular-nums">30%</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50" data-testid="explanation-velocity">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-warning" />
                <h4 className="font-medium">Velocity Check</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                A sector is flagged when its 30-day growth rate exceeds 1.5x the S&P 500 growth rate.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Multiplier:</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-warning w-[60%]" />
                </div>
                <span className="text-sm font-medium">1.5x SPY</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20" data-testid="text-alert-explanation">
            <AlertTriangle className="h-4 w-4 inline mr-2 text-warning" />
            An alert is triggered when <strong>both</strong> conditions are met, indicating a sector may be overheating.
          </p>
        </CardContent>
      </Card>

      <BubbleWatchAlerts warnings={bubbleWarnings} isLoading={bubbleLoading} />

      <Card data-testid="card-risk-assessment">
        <CardHeader>
          <CardTitle>All Sector Risk Assessment</CardTitle>
          <CardDescription>
            Current concentration and growth metrics for each sector
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : industries && bubbleWarnings ? (
            <div className="space-y-4">
              {industries.map((industry, index) => {
                const warning = bubbleWarnings.find((w) => w.industry === industry.industry);
                const isOverheating = warning?.isOverheating || false;
                const concentrationRisk = industry.percentage > 30;
                const spyGrowth = benchmark?.spyGrowth || 0;
                const velocityRisk = industry.averageGrowth > spyGrowth * 1.5;

                return (
                  <div
                    key={industry.industry}
                    className={`p-4 rounded-lg border ${
                      isOverheating
                        ? "border-warning bg-warning/5"
                        : "border-border bg-muted/30"
                    }`}
                    data-testid={`sector-risk-${index}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {isOverheating ? (
                          <AlertTriangle className="h-5 w-5 text-warning" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-positive" />
                        )}
                        <h4 className="font-medium" data-testid={`text-sector-name-${index}`}>
                          {industry.industry}
                        </h4>
                      </div>
                      <span
                        className={`text-sm font-medium px-2 py-1 rounded ${
                          isOverheating
                            ? "bg-warning/20 text-warning"
                            : "bg-positive/20 text-positive"
                        }`}
                        data-testid={`badge-risk-status-${index}`}
                      >
                        {isOverheating ? "At Risk" : "Healthy"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Concentration</span>
                          <span
                            className={`text-xs font-medium tabular-nums ${
                              concentrationRisk ? "text-warning" : ""
                            }`}
                            data-testid={`text-concentration-${index}`}
                          >
                            {industry.percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full ${
                              concentrationRisk ? "bg-warning" : "bg-positive"
                            }`}
                            style={{ width: `${Math.min(industry.percentage, 100)}%` }}
                          />
                          <div
                            className="absolute inset-y-0 w-0.5 bg-foreground/30"
                            style={{ left: "30%" }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Growth vs SPY</span>
                          <span
                            className={`text-xs font-medium tabular-nums ${
                              velocityRisk ? "text-warning" : ""
                            }`}
                            data-testid={`text-velocity-${index}`}
                          >
                            {spyGrowth > 0
                              ? `${(industry.averageGrowth / spyGrowth).toFixed(1)}x`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full ${
                              velocityRisk ? "bg-warning" : "bg-positive"
                            }`}
                            style={{
                              width: `${Math.min(
                                spyGrowth > 0 ? (industry.averageGrowth / spyGrowth / 3) * 100 : 0,
                                100
                              )}%`,
                            }}
                          />
                          <div
                            className="absolute inset-y-0 w-0.5 bg-foreground/30"
                            style={{ left: "50%" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No sector data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
