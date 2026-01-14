import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { IndustryAnalysis } from "@shared/schema";

interface IndustryChartProps {
  data: IndustryAnalysis[] | undefined;
  isLoading: boolean;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(142 50% 45%)",
  "hsl(200 60% 50%)",
  "hsl(280 50% 50%)",
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function ChartSkeleton() {
  return (
    <div className="h-[350px] flex items-center justify-center">
      <div className="w-64 h-64 rounded-full bg-muted animate-pulse" />
    </div>
  );
}

export function IndustryChart({ data, isLoading }: IndustryChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Industry Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Industry Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            No industry data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Industry Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="totalValue"
                nameKey="industry"
                cx="50%"
                cy="50%"
                outerRadius={120}
                innerRadius={60}
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name,
                ]}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function IndustryTable({ data, isLoading }: IndustryChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Industry Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Industry Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Industry</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Holdings</TableHead>
              <TableHead className="text-right">Weight</TableHead>
              <TableHead className="text-right">Avg Growth</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((industry, index) => (
              <TableRow key={industry.industry} data-testid={`row-industry-${index}`}>
                <TableCell className="font-medium">{industry.industry}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(industry.totalValue)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {industry.holdingsCount}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {industry.percentage.toFixed(1)}%
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${
                    industry.averageGrowth >= 0 ? "text-chart-1" : "text-destructive"
                  }`}
                >
                  {industry.averageGrowth >= 0 ? "+" : ""}
                  {industry.averageGrowth.toFixed(2)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
