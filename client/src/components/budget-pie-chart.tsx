import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, Legend } from "recharts";

interface ExpenseCategory {
  categoryId: string;
  categoryName: string;
  total: number;
  color?: string;
  parentId?: string;
}

interface CashFlowData {
  totalBalance: number;
  expectedIncome: number;
  expensesTotal?: number;
  billsTotal: number;
  subsTotal: number;
  safeToSpend: number;
  expensesByCategory?: ExpenseCategory[];
  savingsTotal?: number;
  loanPaymentsTotal?: number;
  plannedSpendingTotal?: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);

export function BudgetPieChart({
  size = "medium",
  sizeSelector,
  cardClassName,
}: {
  size?: "small" | "medium" | "large";
  sizeSelector?: ReactNode;
  cardClassName?: string;
}) {
  const { data, isLoading } = useQuery<CashFlowData>({
    queryKey: ["/api/cash-flow/snapshot"],
  });

  if (isLoading) {
    return (
      <Card className={cardClassName}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Budget Overview</CardTitle>
              <CardDescription>Current month budget breakdown</CardDescription>
            </div>
            {sizeSelector}
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className={`${size === "small" ? "h-[150px]" : size === "large" ? "h-[220px]" : "h-[175px]"} w-full`} />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={cardClassName}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Budget Overview</CardTitle>
              <CardDescription>Current month budget breakdown</CardDescription>
            </div>
            {sizeSelector}
          </div>
        </CardHeader>
        <CardContent>
          <div className={`${size === "small" ? "h-[150px]" : size === "large" ? "h-[220px]" : "h-[175px]"} flex items-center justify-center text-muted-foreground`}>
            No budget data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const expenses = data.expensesTotal || 0;
  const plannedSpending = data.plannedSpendingTotal || 0;
  const savings = data.savingsTotal || 0;
  const safeToSpend = data.safeToSpend || 0;
  const expectedIncome = data.expectedIncome || 0;

  // Pie chart shows 4 aggregated slices:
  // 1. Expenses (all actual expenses)
  // 2. Planned Spending (bills + subscriptions + loan payments)
  // 3. Savings (monthly contributions from goals)
  // 4. Safe to Spend
  // Income is the total area (100%) but not displayed as a slice
  const chartData = [
    ...(expenses > 0 ? [{
      name: "Expenses",
      value: expenses,
      fill: "hsl(var(--destructive))",
    }] : []),
    ...(plannedSpending > 0 ? [{
      name: "Planned Spending",
      value: plannedSpending,
      fill: "hsl(280, 70%, 60%)", // Purple
    }] : []),
    ...(savings > 0 ? [{
      name: "Savings",
      value: savings,
      fill: "hsl(220, 70%, 60%)", // Blue
    }] : []),
    ...(safeToSpend > 0 ? [{
      name: "Safe to Spend",
      value: safeToSpend,
      fill: "hsl(var(--chart-3))", // Green
    }] : []),
  ].filter((item) => item.value > 0);

  // Filter to only show top-level categories (no parentId) and get top 5
  const topCategories = (data.expensesByCategory || [])
    .filter((cat) => !cat.parentId) // Only top-level categories
    .slice(0, size === "small" ? 3 : size === "large" ? 6 : 5);

  if (chartData.length === 0) {
    return (
      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle>Budget Overview</CardTitle>
          <CardDescription>Current month budget breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[175px] flex items-center justify-center text-muted-foreground">
            No budget data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const Stat = ({ label, value }: { label: string; value: number }) => (
    <div className="rounded-lg bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold tabular-nums">{formatCurrency(value)}</div>
    </div>
  );

  return (
    <Card className={cardClassName}>
      <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Budget Overview</CardTitle>
              <CardDescription>Current month budget breakdown</CardDescription>
            </div>
            {sizeSelector}
          </div>
      </CardHeader>
      <CardContent>
        {size === "small" ? (
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Expenses" value={expenses} />
            <Stat label="Safe to Spend" value={safeToSpend} />
            <Stat label="Savings" value={savings} />
            <Stat label="Planned" value={plannedSpending} />
          </div>
        ) : (
          <div className="space-y-4">
            {size === "large" && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat label="Income" value={expectedIncome} />
                <Stat label="Expenses" value={expenses} />
                <Stat label="Planned" value={plannedSpending} />
                <Stat label="Safe to Spend" value={safeToSpend} />
              </div>
            )}
            <div className="flex gap-6">
              <ChartContainer
                config={{
                  income: { label: "Income", color: "hsl(var(--chart-1))" },
                  available: { label: "Safe to Spend", color: "hsl(var(--chart-3))" },
                }}
                className={`${size === "large" ? "h-[220px]" : "h-[175px]"} flex-1`}
              >
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => {
                      const pct = (percent * 100).toFixed(0);
                      return percent > 0.05 ? `${name}: ${pct}%` : "";
                    }}
                    outerRadius={size === "large" ? 70 : 60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ChartContainer>
              {topCategories.length > 0 && (
                <div className={`${size === "large" ? "w-56" : "w-48"} border rounded-lg p-4`}>
                  <h3 className={`font-semibold mb-3 ${size === "large" ? "text-sm" : "text-sm"}`}>Top Expense Categories</h3>
                  <div className="space-y-2">
                    {topCategories.map((cat) => (
                      <div key={cat.categoryId} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {cat.color && (
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          )}
                          <span className="text-muted-foreground truncate">{cat.categoryName}</span>
                        </div>
                        <span className="font-medium tabular-nums">{formatCurrency(cat.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
