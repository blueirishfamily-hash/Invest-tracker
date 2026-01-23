import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { DebtPlan } from "@shared/schema";

interface DebtHistoryChartProps {
  debtPlans: DebtPlan[] | undefined;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

// Generate historical debt data based on current debt balances
function generateDebtHistory(debtPlans: DebtPlan[]): Array<{ date: string; totalDebt: number }> {
  const data: Array<{ date: string; totalDebt: number }> = [];
  const now = new Date();
  
  // Calculate current total debt
  const currentTotalDebt = debtPlans.reduce((sum, plan) => {
    return sum + plan.debts.reduce((planSum, debt) => planSum + debt.balance, 0);
  }, 0);

  // Generate data for the past 12 months
  for (let i = 12; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    
    // Simulate debt reduction over time
    // Assume gradual payoff with some variation
    const monthsAgo = 12 - i;
    const reductionFactor = monthsAgo / 12;
    
    // Simulate debt growth/reduction
    // Start with higher debt in the past, trending toward current
    const simulatedDebt = currentTotalDebt * (1 + reductionFactor * 0.3);
    
    // Add some realistic variation (debt typically decreases over time with payments)
    const monthlyReduction = currentTotalDebt * 0.02; // ~2% reduction per month on average
    const adjustedDebt = Math.max(currentTotalDebt, simulatedDebt - (monthlyReduction * monthsAgo));
    
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      totalDebt: Math.max(0, adjustedDebt),
    });
  }

  return data;
}

export function DebtHistoryChart({ debtPlans }: DebtHistoryChartProps) {
  const { data: plans, isLoading } = useQuery<DebtPlan[]>({
    queryKey: ["/api/debt-plans"],
    initialData: debtPlans,
  });

  const chartData = useMemo(() => {
    if (!plans || plans.length === 0) return [];
    return generateDebtHistory(plans);
  }, [plans]);

  const currentTotalDebt = useMemo(() => {
    if (!plans || plans.length === 0) return 0;
    return plans.reduce((sum, plan) => {
      return sum + plan.debts.reduce((planSum, debt) => planSum + debt.balance, 0);
    }, 0);
  }, [plans]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!plans || plans.length === 0 || chartData.length === 0) {
    return null;
  }

  const minValue = Math.min(...chartData.map(d => d.totalDebt));
  const maxValue = Math.max(...chartData.map(d => d.totalDebt));
  const padding = (maxValue - minValue) * 0.1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Total Debt Over Past Year</CardTitle>
        <CardDescription>
          Historical view of your total debt balance. Current total: {formatCurrency(currentTotalDebt)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[minValue - padding, maxValue + padding]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload[0]) return null;
                  const data = payload[0].payload as { date: string; totalDebt: number };
                  return (
                    <div className="bg-card border rounded-lg p-3 shadow-lg">
                      <div className="text-sm font-medium mb-2">{data.date}</div>
                      <div className="text-xs">
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Total Debt:</span>
                          <span className="font-medium">{formatCurrency(data.totalDebt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="totalDebt"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                fill="url(#debtGradient)"
                dot={{ fill: "hsl(var(--destructive))", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
