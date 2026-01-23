import { useMemo, useState } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CryptoAsset } from "@shared/schema";

interface CandlestickData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  name: string;
}

interface CryptoCandlestickChartProps {
  assets: CryptoAsset[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

// Generate candlestick data based on portfolio performance
function generateCandlestickData(
  currentValue: number,
  timeframe: string
): CandlestickData[] {
  const data: CandlestickData[] = [];
  const now = new Date();
  let daysBack = 30;
  let points = 30;

  switch (timeframe) {
    case "7d":
      daysBack = 7;
      points = 7;
      break;
    case "30d":
      daysBack = 30;
      points = 30;
      break;
    case "90d":
      daysBack = 90;
      points = 30;
      break;
    case "1y":
      daysBack = 365;
      points = 52;
      break;
    default:
      daysBack = 30;
      points = 30;
  }

  const volatility = 0.03;
  let baseValue = currentValue * (1 - (volatility * daysBack / 365));

  for (let i = points; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - (daysBack * i / points));
    
    const dailyChange = (Math.random() - 0.5) * volatility * 2;
    const open = baseValue;
    const close = open * (1 + dailyChange);
    const high = Math.max(open, close) * (1 + Math.abs(Math.random() * volatility * 0.5));
    const low = Math.min(open, close) * (1 - Math.abs(Math.random() * volatility * 0.5));
    
    const progress = (points - i) / points;
    const trendedClose = close * (1 - progress) + currentValue * progress;
    const trendedHigh = high * (1 - progress) + currentValue * 1.02 * progress;
    const trendedLow = low * (1 - progress) + currentValue * 0.98 * progress;
    
    baseValue = trendedClose;

    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      open: Math.max(0, open),
      high: Math.max(0, trendedHigh),
      low: Math.max(0, trendedLow),
      close: Math.max(0, trendedClose),
      name: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    });
  }

  return data;
}

export function CryptoCandlestickChart({ assets }: CryptoCandlestickChartProps) {
  const [timeframe, setTimeframe] = useState("30d");

  const totalValue = useMemo(() => {
    return assets.reduce((sum, a) => sum + a.currentValue, 0);
  }, [assets]);

  const candlestickData = useMemo(() => {
    return generateCandlestickData(totalValue, timeframe);
  }, [totalValue, timeframe]);

  if (assets.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No portfolio data available
      </div>
    );
  }

  const minValue = Math.min(...candlestickData.map(d => d.low));
  const maxValue = Math.max(...candlestickData.map(d => d.high));
  const padding = (maxValue - minValue) * 0.1;

  // Transform data for candlestick rendering - use close as the main value
  const chartData = candlestickData.map((entry) => ({
    ...entry,
    value: entry.close,
    isPositive: entry.close >= entry.open,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold tabular-nums">{formatCurrency(totalValue)}</div>
          <div className="text-sm text-muted-foreground">Portfolio Performance</div>
        </div>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 Days</SelectItem>
            <SelectItem value="30d">30 Days</SelectItem>
            <SelectItem value="90d">90 Days</SelectItem>
            <SelectItem value="1y">1 Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ChartContainer config={{}} className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
          >
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
                const data = payload[0].payload as any;
                const change = data.close - data.open;
                const changePercent = data.open > 0 ? (change / data.open) * 100 : 0;
                return (
                  <div className="bg-card border rounded-lg p-3 shadow-lg">
                    <div className="text-sm font-medium mb-2">{data.date}</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Open:</span>
                        <span className="font-medium">{formatCurrency(data.open)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">High:</span>
                        <span className="font-medium text-chart-1">{formatCurrency(data.high)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Low:</span>
                        <span className="font-medium text-destructive">{formatCurrency(data.low)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Close:</span>
                        <span className="font-medium">{formatCurrency(data.close)}</span>
                      </div>
                      <div className="flex justify-between gap-4 pt-1 border-t">
                        <span className="text-muted-foreground">Change:</span>
                        <span className={`font-medium ${
                          change >= 0 ? "text-chart-1" : "text-destructive"
                        }`}>
                          {change >= 0 ? "+" : ""}
                          {formatCurrency(change)} ({changePercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            {/* Candlestick rendering using Line with custom dots for wicks and bars */}
            <Line
              type="monotone"
              dataKey="value"
              stroke="transparent"
              strokeWidth={0}
              dot={(props: any) => {
                const { payload, cx, cy } = props;
                const { open, high, low, close, isPositive } = payload;
                const color = isPositive ? "hsl(var(--chart-1))" : "hsl(var(--destructive))";
                
                // Calculate positions relative to cy (which is the close position)
                const range = maxValue + padding - (minValue - padding);
                const chartHeight = 300; // Approximate chart height
                const yHigh = cy - ((high - close) / range) * chartHeight;
                const yLow = cy + ((close - low) / range) * chartHeight;
                const yOpen = cy - ((open - close) / range) * chartHeight;
                
                const yTop = Math.min(cy, yOpen);
                const yBottom = Math.max(cy, yOpen);
                const bodyHeight = Math.max(2, Math.abs(yOpen - cy));
                const barWidth = 8;

                return (
                  <g key={props.key}>
                    {/* Wick (high-low line) */}
                    <line
                      x1={cx}
                      y1={yHigh}
                      x2={cx}
                      y2={yLow}
                      stroke={color}
                      strokeWidth={1.5}
                    />
                    {/* Body (open-close rectangle) */}
                    <rect
                      x={cx - barWidth / 2}
                      y={yTop}
                      width={barWidth}
                      height={bodyHeight}
                      fill={color}
                      stroke={color}
                      strokeWidth={1}
                    />
                  </g>
                );
              }}
              activeDot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
