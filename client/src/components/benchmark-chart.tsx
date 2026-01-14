import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { BenchmarkData } from "@shared/schema";

interface BenchmarkChartProps {
  data: BenchmarkData | undefined;
  isLoading: boolean;
}

function ChartSkeleton() {
  return (
    <div className="h-[300px] flex items-center justify-center">
      <div className="w-full h-full bg-muted animate-pulse rounded" />
    </div>
  );
}

export function BenchmarkChart({ data, isLoading }: BenchmarkChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio vs S&P 500 Benchmark</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio vs S&P 500 Benchmark</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No benchmark data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    {
      name: "Your Portfolio",
      growth: data.portfolioGrowth,
      fill: "hsl(var(--chart-1))",
    },
    {
      name: "S&P 500 (SPY)",
      growth: data.spyGrowth,
      fill: "hsl(var(--chart-4))",
    },
  ];

  const outperforming = data.portfolioGrowth > data.spyGrowth;
  const difference = data.portfolioGrowth - data.spyGrowth;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle>Portfolio vs S&P 500 Benchmark</CardTitle>
          <div className={`text-sm font-medium ${outperforming ? "text-chart-1" : "text-chart-4"}`}>
            {outperforming ? "Outperforming" : "Underperforming"} by {Math.abs(difference).toFixed(2)}%
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="name"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [`${value.toFixed(2)}%`, "30-Day Growth"]}
              />
              <Bar dataKey="growth" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Portfolio 30D</div>
            <div className={`text-xl font-bold tabular-nums ${data.portfolioGrowth >= 0 ? "text-chart-1" : "text-destructive"}`}>
              {data.portfolioGrowth >= 0 ? "+" : ""}{data.portfolioGrowth.toFixed(2)}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">SPY 30D</div>
            <div className={`text-xl font-bold tabular-nums ${data.spyGrowth >= 0 ? "text-chart-4" : "text-destructive"}`}>
              {data.spyGrowth >= 0 ? "+" : ""}{data.spyGrowth.toFixed(2)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
