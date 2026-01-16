import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { StockData, IndexData } from "@shared/schema";

type Timeframe = "1D" | "5D" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "5Y" | "MAX";

interface StockChartProps {
  stockData: StockData | undefined;
  indexData: IndexData[];
  timeframe: Timeframe;
  isLoading: boolean;
}

function ChartSkeleton() {
  return (
    <div className="h-[400px] flex items-center justify-center">
      <div className="w-full h-full bg-muted animate-pulse rounded" />
    </div>
  );
}

export function StockChart({ stockData, indexData, timeframe, isLoading }: StockChartProps) {
  if (isLoading || !stockData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  // Combine stock data with index data for chart
  const chartData = stockData.historicalData.map((point, idx) => {
    const dataPoint: Record<string, string | number> = {
      date: point.date,
      stock: point.price,
    };

    // Add index data for each selected index
    indexData.forEach((index) => {
      const indexPoint = index.historicalData[idx];
      if (indexPoint) {
        dataPoint[index.symbol] = indexPoint.price;
      }
    });

    return dataPoint;
  });

  // Determine chart colors - distinct colors for better differentiation
  const colors = {
    stock: "#3b82f6",      // Blue - for searched stock
    SPY: "#10b981",        // Green - S&P 500
    DJI: "#f59e0b",        // Orange - DOW Jones
    IXIC: "#8b5cf6",       // Purple - Nasdaq
  };

  const indexNames: Record<string, string> = {
    SPY: "S&P 500",
    DJI: "DOW Jones",
    IXIC: "Nasdaq",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickFormatter={(value) => `${value >= 0 ? "+" : ""}${value.toFixed(0)}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number, name: string) => [
                  `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`,
                  name === "stock" ? stockData.ticker : indexNames[name] || name,
                ]}
              />
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="stock"
                stroke={colors.stock}
                strokeWidth={2}
                dot={false}
                name={stockData.ticker}
              />
              {indexData.map((index) => (
                <Line
                  key={index.symbol}
                  type="monotone"
                  dataKey={index.symbol}
                  stroke={colors[index.symbol as keyof typeof colors] || colors.SPY}
                  strokeWidth={2}
                  dot={false}
                  name={indexNames[index.symbol] || index.name}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
