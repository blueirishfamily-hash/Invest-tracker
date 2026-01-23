import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import type { SinkingFund } from "@shared/schema";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);

export function GoalProgression() {
  const { data: funds, isLoading } = useQuery<SinkingFund[]>({
    queryKey: ["/api/sinking-funds"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Goal Progression</CardTitle>
          <CardDescription>Track your savings goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!funds || funds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Goal Progression</CardTitle>
          <CardDescription>Track your savings goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No active goals</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter to active funds and limit to top 4
  const activeFunds = funds
    .filter((fund) => fund.status === "active")
    .slice(0, 4);

  if (activeFunds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Goal Progression</CardTitle>
          <CardDescription>Track your savings goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No active goals</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Goal Progression</CardTitle>
        <CardDescription>Track your savings goals</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeFunds.map((fund) => {
            const progress = fund.targetAmount > 0 
              ? Math.min((fund.currentAmount / fund.targetAmount) * 100, 100) 
              : 0;
            return (
              <div key={fund.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{fund.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatCurrency(fund.currentAmount)} / {formatCurrency(fund.targetAmount)}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{progress.toFixed(0)}% complete</span>
                  {fund.monthlyContribution > 0 && (
                    <span>${fund.monthlyContribution.toFixed(0)}/mo</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
