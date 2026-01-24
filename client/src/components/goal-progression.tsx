import type { ReactNode } from "react";
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

export function GoalProgression({
  size = "medium",
  sizeSelector,
  cardClassName,
}: {
  size?: "small" | "medium" | "large";
  sizeSelector?: ReactNode;
  cardClassName?: string;
}) {
  const { data: funds, isLoading } = useQuery<SinkingFund[]>({
    queryKey: ["/api/sinking-funds"],
  });

  if (isLoading) {
    return (
      <Card className={cardClassName}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Goal Progression</CardTitle>
              <CardDescription>Track your savings goals</CardDescription>
            </div>
            {sizeSelector}
          </div>
        </CardHeader>
        <CardContent>
          <div className={`${size === "small" ? "space-y-2" : "space-y-3"}`}>
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
      <Card className={cardClassName}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Goal Progression</CardTitle>
              <CardDescription>Track your savings goals</CardDescription>
            </div>
            {sizeSelector}
          </div>
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
    .slice(0, size === "small" ? 2 : size === "large" ? 4 : 3);

  if (activeFunds.length === 0) {
    return (
      <Card className={cardClassName}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Goal Progression</CardTitle>
              <CardDescription>Track your savings goals</CardDescription>
            </div>
            {sizeSelector}
          </div>
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
    <Card className={cardClassName}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Goal Progression</CardTitle>
            <CardDescription>Track your savings goals</CardDescription>
          </div>
          {sizeSelector}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`${size === "small" ? "space-y-3" : size === "large" ? "space-y-5" : "space-y-4"}`}>
          {activeFunds.map((fund) => {
            const progress = fund.targetAmount > 0 
              ? Math.min((fund.currentAmount / fund.targetAmount) * 100, 100) 
              : 0;
            return (
              <div key={fund.id} className="space-y-2">
                <div className={`flex items-center justify-between ${size === "small" ? "text-xs" : "text-sm"}`}>
                  <span className="font-medium">{fund.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatCurrency(fund.currentAmount)} / {formatCurrency(fund.targetAmount)}
                  </span>
                </div>
                <Progress value={progress} className={size === "small" ? "h-1.5" : "h-2"} />
                <div className={`flex items-center justify-between text-muted-foreground ${size === "small" ? "text-[10px]" : "text-xs"}`}>
                  <span>{progress.toFixed(0)}% complete</span>
                  {size !== "small" && fund.monthlyContribution > 0 && (
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
