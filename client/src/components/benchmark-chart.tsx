import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { BenchmarkData } from "@shared/schema";

type Timeframe = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "MAX" | string;

interface CategoryPerformanceData {
  category: string;
  data: Array<{ date: string; value: number }>;
}

interface BenchmarkChartProps {
  data?: BenchmarkData | undefined;
  chartData?: {
    portfolio: Array<{ date: string; value: number }>;
    spy: Array<{ date: string; value: number }>;
  };
  categoryData?: CategoryPerformanceData[];
  isLoading: boolean;
  timeframe: Timeframe;
  title?: string;
  isExpanded?: boolean;
  onExpandClick?: () => void;
  noCard?: boolean; // If true, don't render Card wrapper
  returnType?: "TWR" | "MWR";
}

function ChartSkeleton() {
  return (
    <div className="h-[200px] flex items-center justify-center">
      <div className="w-full h-full bg-muted animate-pulse rounded" />
    </div>
  );
}

// Helper function to check if a date is a weekend
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

// Helper function to generate daily variations indexed to start at 0
function generateDailyVariations(numPoints: number, targetGrowth: number, seed: number = 0): number[] {
  // Use seed for consistent randomness (based on targetGrowth)
  let rng = seed;
  const dailyChanges: number[] = [];
  
  // Start at base price (for calculation purposes)
  const startPrice = 100;
  const targetEndPrice = startPrice * (1 + targetGrowth / 100);
  
  // Generate daily changes with realistic volatility
  // Adjust volatility based on timeframe (longer = less daily volatility visible)
  // Use percentage-based volatility scaled to growth
  const baseVolatility = numPoints > 260 ? 0.005 : 0.015;
  const volatility = Math.abs(targetGrowth) > 0 ? (baseVolatility * Math.abs(targetGrowth) / 100) : baseVolatility;
  
  for (let i = 0; i < numPoints; i++) {
    // Simple seeded random number generator
    rng = (rng * 9301 + 49297) % 233280;
    const random = rng / 233280;
    
    // Generate daily change with normal-like distribution
    // Scale by target growth to maintain proportional volatility
    const dailyChange = (random - 0.5) * 2 * volatility;
    dailyChanges.push(dailyChange);
  }
  
  // Apply daily changes cumulatively starting from startPrice
  let cumulative = [startPrice];
  for (let i = 0; i < numPoints; i++) {
    cumulative.push(cumulative[cumulative.length - 1] * (1 + dailyChanges[i]));
  }
  
  // Scale to match exact target
  const actualEnd = cumulative[cumulative.length - 1];
  const scaleFactor = actualEnd !== 0 ? targetEndPrice / actualEnd : 1;
  const scaledCumulative = cumulative.map(val => val * scaleFactor);
  
  // Convert to percentage change from start (indexed to 0)
  return scaledCumulative.map(price => ((price - startPrice) / startPrice) * 100);
}

// Helper function to generate time-series index data from single values
function generateTimeSeriesData(
  portfolioGrowth: number,
  spyGrowth: number,
  timeframe: Timeframe
): Array<{ date: string; portfolio: number; spy: number }> {
  const dataPoints: Array<{ date: string; portfolio: number; spy: number }> = [];
  const now = new Date();
  
  // Generate data points based on timeframe
  let daysBack = 30;
  
  switch (timeframe) {
    case "1D":
      daysBack = 1;
      break;
    case "5D":
      daysBack = 5;
      break;
    case "1M":
      daysBack = 30;
      break;
    case "3M":
      daysBack = 90;
      break;
    case "6M":
      daysBack = 180;
      break;
    case "YTD":
      const yearStart = new Date(now.getFullYear(), 0, 1);
      daysBack = Math.ceil((now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
      break;
    case "1Y":
      daysBack = 365;
      break;
    case "5Y":
      daysBack = 365 * 5;
      break;
    case "MAX":
      daysBack = 365 * 5; // 5 years max
      break;
  }
  
  // Determine sampling interval based on timeframe
  // For shorter timeframes, show daily; for longer, sample weekly/monthly
  let samplingInterval = 1; // days
  if (daysBack > 365) {
    samplingInterval = 7; // Weekly for 1Y+
  } else if (daysBack > 180) {
    samplingInterval = 2; // Every 2 days for 6M
  } else if (daysBack > 90) {
    samplingInterval = 1; // Daily for 3M
  }
  
  // Generate date range with sampling
  const tradingDates: Date[] = [];
  let currentDate = new Date(now);
  currentDate.setDate(currentDate.getDate() - daysBack);
  
  // Generate dates with appropriate sampling
  while (currentDate <= now) {
    // For shorter timeframes, prefer weekdays; for longer, include all days
    if (daysBack <= 90 || !isWeekend(currentDate)) {
      tradingDates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + samplingInterval);
  }
  
  // If we still need more points for very short timeframes, fill in weekends
  if (daysBack <= 7 && tradingDates.length < daysBack) {
    currentDate = new Date(now);
    currentDate.setDate(currentDate.getDate() - daysBack);
    const allDates: Date[] = [];
    while (currentDate <= now) {
      allDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    tradingDates.length = 0;
    tradingDates.push(...allDates);
  }
  
  const numPoints = tradingDates.length;
  
  // Generate daily variations for portfolio and SPY
  // Use different seeds to get different patterns
  const portfolioSeries = generateDailyVariations(numPoints, portfolioGrowth, Math.abs(portfolioGrowth * 1000));
  const spySeries = generateDailyVariations(numPoints, spyGrowth, Math.abs(spyGrowth * 1000) + 12345);

  // Combine dates with index values
  for (let i = 0; i < numPoints && i < portfolioSeries.length; i++) {
    const date = tradingDates[i];
    dataPoints.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      portfolio: Math.round(portfolioSeries[i] * 100) / 100, // Already indexed to 0
      spy: Math.round(spySeries[i] * 100) / 100, // Already indexed to 0
    });
  }
  
  return dataPoints;
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

export function BenchmarkChart({ data, chartData, categoryData, isLoading, timeframe, title, isExpanded, onExpandClick, noCard = false, returnType = "TWR" }: BenchmarkChartProps) {
  // If categoryData is provided or noCard is true, don't use S&P 500 default title
  // Use provided title or empty string (when noCard=true, title should be empty to avoid showing header)
  const chartTitle = (categoryData || noCard) ? (title || "") : (title || "Portfolio vs S&P 500 Benchmark");

  if (isLoading) {
    const content = (
      <>
        {!noCard && (
          <CardHeader>
            <CardTitle>{chartTitle}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </>
    );
    return noCard ? <>{content}</> : <Card>{content}</Card>;
  }

  // If category data is provided, use that instead of benchmark data
  if (categoryData && categoryData.length > 0) {
    // Merge all category data by date
    const dateMap = new Map<string, Record<string, number>>();
    
    for (const category of categoryData) {
      for (const point of category.data) {
        if (!dateMap.has(point.date)) {
          dateMap.set(point.date, {});
        }
        dateMap.get(point.date)![category.category] = point.value;
      }
    }

    // Convert to array and sort by date
    const mergedData = Array.from(dateMap.entries())
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate performance for each category
    const categoryPerformance = categoryData.map(cat => {
      if (cat.data.length === 0) return { category: cat.category, performance: 0 };
      const start = cat.data[0].value;
      const end = cat.data[cat.data.length - 1].value;
      // Data is already indexed to 100, so performance is end - 100
      return { category: cat.category, performance: end - 100 };
    });

    const chartContent = (
      <>
        {!noCard && (
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{chartTitle}</span>
              {onExpandClick && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExpandClick();
                  }}
                >
                  {isExpanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={mergedData}
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
                  tickFormatter={(value) => `${value >= 0 ? "+" : ""}${(value - 100).toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number, name: string) => {
                    const percent = ((value as number) - 100).toFixed(2);
                    return [`${percent >= 0 ? "+" : ""}${percent}%`, name];
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: "20px" }}
                  iconType="line"
                />
                {categoryData.map((cat, index) => (
                  <Line
                    key={cat.category}
                    type="monotone"
                    dataKey={cat.category}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    name={cat.category}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
            {categoryPerformance.map((perf, index) => (
              <div key={perf.category} className="p-3 rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground truncate">{perf.category}</div>
                <div className={`text-xl font-bold tabular-nums ${perf.performance >= 0 ? "text-chart-1" : "text-destructive"}`}>
                  {perf.performance >= 0 ? "+" : ""}{perf.performance.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </>
    );
    
    return noCard ? <>{chartContent}</> : (
      <Card className={onExpandClick ? "cursor-pointer" : ""} onClick={onExpandClick}>
        {chartContent}
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={onExpandClick ? "cursor-pointer" : ""} onClick={onExpandClick}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{chartTitle}</span>
            {onExpandClick && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onExpandClick();
                }}
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No benchmark data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use real chart data if available, otherwise generate from growth rates
  // Both should already be indexed to 0
  const displayChartData = chartData 
    ? chartData.portfolio.map((p, i) => ({
        date: p.date,
        portfolio: p.value,
        spy: chartData.spy[i]?.value || 0,
      }))
    : generateTimeSeriesData(data.portfolioGrowth, data.spyGrowth, timeframe);
  
  // Calculate performance for the selected timeframe from chart data (indexed to 0)
  // Since data is already indexed to 0, the end value IS the performance percentage
  const portfolioStart = displayChartData.length > 0 ? displayChartData[0].portfolio : 0;
  const portfolioEnd = displayChartData.length > 0 ? displayChartData[displayChartData.length - 1].portfolio : data.portfolioGrowth;
  const spyStart = displayChartData.length > 0 ? displayChartData[0].spy : 0;
  const spyEnd = displayChartData.length > 0 ? displayChartData[displayChartData.length - 1].spy : data.spyGrowth;
  const portfolioPerformance = portfolioEnd - portfolioStart;
  const spyPerformance = spyEnd - spyStart;
  
  const outperforming = portfolioPerformance > spyPerformance;
  const difference = portfolioPerformance - spyPerformance;

  // Helper to format timeframe label for display
  const timeframeLabel: Record<Timeframe, string> = {
    "1D": "1D",
    "5D": "5D",
    "1M": "1M",
    "3M": "3M",
    "6M": "6M",
    "YTD": "YTD",
    "1Y": "1Y",
    "5Y": "5Y",
    "MAX": "Max",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle>Portfolio vs S&P 500</CardTitle>
          <div className={`text-sm font-medium ${outperforming ? "text-chart-1" : "text-chart-4"}`}>
            {outperforming ? "Outperforming" : "Underperforming"} by {Math.abs(difference).toFixed(2)}%
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={displayChartData}
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
                domain={[
                  (dataMin) => {
                    const allValues = displayChartData.flatMap(d => [d.portfolio, d.spy]);
                    const min = Math.min(...allValues, 0);
                    return min < 0 ? min * 1.1 : 0;
                  },
                  (dataMax) => {
                    const allValues = displayChartData.flatMap(d => [d.portfolio, d.spy]);
                    const max = Math.max(...allValues, 0);
                    return max > 0 ? max * 1.1 : 'auto';
                  },
                ]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number, name: string) => [`${value >= 0 ? "+" : ""}${value.toFixed(2)}%`, name === "portfolio" ? "Portfolio" : "S&P 500"]}
              />
              <Legend 
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="portfolio"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={false}
                name="Portfolio"
              />
              <Line
                type="monotone"
                dataKey="spy"
                stroke="hsl(var(--chart-4))"
                strokeWidth={2}
                dot={false}
                name="S&P 500"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Portfolio {timeframeLabel[timeframe]}</div>
            <div className={`text-xl font-bold tabular-nums ${portfolioPerformance >= 0 ? "text-chart-1" : "text-destructive"}`}>
              {portfolioPerformance >= 0 ? "+" : ""}{portfolioPerformance.toFixed(2)}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">SPY {timeframeLabel[timeframe]}</div>
            <div className={`text-xl font-bold tabular-nums ${spyPerformance >= 0 ? "text-chart-4" : "text-destructive"}`}>
              {spyPerformance >= 0 ? "+" : ""}{spyPerformance.toFixed(2)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
