import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, TrendingUp, Percent, PieChart } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { BubbleWarning } from "@shared/schema";

interface BubbleWatchProps {
  warnings: BubbleWarning[] | undefined;
  isLoading: boolean;
}

function BubbleWatchSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
      ))}
    </div>
  );
}

export function BubbleWatchAlerts({ warnings, isLoading }: BubbleWatchProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Bubble Watch Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BubbleWatchSkeleton />
        </CardContent>
      </Card>
    );
  }

  const activeWarnings = warnings?.filter((w) => w.isOverheating) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Bubble Watch Alerts
        </CardTitle>
        <CardDescription>
          Monitoring sectors for overheating based on concentration ({">"}30%) and velocity ({">"}1.5x SPY growth)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeWarnings.length === 0 ? (
          <Alert className="border-chart-1 bg-chart-1/10">
            <CheckCircle className="h-4 w-4 text-chart-1" />
            <AlertTitle className="text-chart-1">All Clear</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              No sectors are currently showing signs of overheating. Your portfolio appears balanced.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {activeWarnings.map((warning, index) => (
              <Alert
                key={warning.industry}
                variant="destructive"
                className="border-chart-4 bg-chart-4/10"
                data-testid={`alert-bubble-${index}`}
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-chart-4 font-semibold">
                  {warning.industry} Sector Alert
                </AlertTitle>
                <AlertDescription>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <PieChart className="h-4 w-4" />
                        Portfolio Concentration
                      </span>
                      <span className="font-medium tabular-nums">
                        {warning.concentration.toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(warning.concentration, 100)}
                      className="h-2"
                    />

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="rounded-lg bg-muted/50 p-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          Sector Growth (30D)
                        </div>
                        <div className="text-lg font-semibold text-chart-4 tabular-nums">
                          +{warning.growthRate.toFixed(2)}%
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Percent className="h-3 w-3" />
                          SPY Growth (30D)
                        </div>
                        <div className="text-lg font-semibold tabular-nums">
                          +{warning.spyGrowthRate.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground pt-2">
                      This sector is growing {(warning.growthRate / warning.spyGrowthRate).toFixed(1)}x 
                      faster than the S&P 500 and represents over 30% of your portfolio.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BubbleWatchCompact({ warnings, isLoading }: BubbleWatchProps) {
  if (isLoading) {
    return null;
  }

  const activeWarnings = warnings?.filter((w) => w.isOverheating) || [];

  if (activeWarnings.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="border-chart-4 bg-chart-4/10">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="text-chart-4">Bubble Watch Alert</AlertTitle>
      <AlertDescription className="text-muted-foreground">
        {activeWarnings.length} sector{activeWarnings.length > 1 ? "s" : ""} showing signs of overheating:{" "}
        <span className="font-medium">
          {activeWarnings.map((w) => w.industry).join(", ")}
        </span>
      </AlertDescription>
    </Alert>
  );
}
