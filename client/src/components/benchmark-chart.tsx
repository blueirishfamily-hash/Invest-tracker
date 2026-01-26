import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
import { Area, AreaChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
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
  size?: "small" | "medium" | "large";
  sizeSelector?: ReactNode;
  cardClassName?: string;

  // Optional header KPIs for the default (portfolio performance) card
  totalValue?: number;
  dailyChange?: number;
  dailyChangePercent?: number;
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

// Sector/category differentiation palette (intentionally colorful; exempt from base theme).
// Avoids the app’s semantic trend colors (green/red) to reduce confusion.
const COLORS = [
  "hsl(210 90% 56%)", // blue
  "hsl(190 85% 50%)", // cyan
  "hsl(165 70% 45%)", // teal
  "hsl(45 90% 55%)",  // amber
  "hsl(25 90% 55%)",  // orange
  "hsl(275 80% 62%)", // violet
  "hsl(305 70% 60%)", // purple
  "hsl(330 75% 58%)", // pink
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRoundedK(value: number, step: number = 5000): string {
  if (!Number.isFinite(value)) return "0K";
  const rounded = Math.round(value / step) * step;
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  const k = Math.round(abs / 1000);
  return `${sign}${k}K`;
}

export function BenchmarkChart({
  data,
  chartData,
  categoryData,
  isLoading,
  timeframe,
  title,
  isExpanded,
  onExpandClick,
  noCard = false,
  returnType = "TWR",
  size = "medium",
  sizeSelector,
  cardClassName,
  totalValue,
  dailyChange,
  dailyChangePercent,
}: BenchmarkChartProps) {
  // If categoryData is provided or noCard is true, don't use S&P 500 default title
  // Use provided title or empty string (when noCard=true, title should be empty to avoid showing header)
  const chartTitle = (categoryData || noCard) ? (title || "") : (title || "Portfolio Performance");
  const chartHeightClass = size === "small" ? "h-[160px]" : size === "large" ? "h-[260px]" : "h-[200px]";
  const statCardPadding = size === "small" ? "p-2" : size === "large" ? "p-4" : "p-3";

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
    const categoryPerformance: Array<{ category: string; performance: number }> = categoryData.map(cat => {
      if (cat.data.length === 0) return { category: cat.category, performance: 0 };
      const start = cat.data[0].value;
      const end = cat.data[cat.data.length - 1].value;
      // Data is already indexed to 100, so performance is end - 100
      return { category: cat.category, performance: end - 100 };
    });
    const visibleCategoryPerformance =
      size === "small"
        ? categoryPerformance.slice(0, 2)
        : size === "medium"
          ? categoryPerformance.slice(0, 4)
          : categoryPerformance;

    const chartContent = (
      <>
        {!noCard && (
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="truncate">{chartTitle}</CardTitle>
              <div className="flex items-center gap-2">
                {sizeSelector}
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
              </div>
            </div>
          </CardHeader>
        )}
        <CardContent>
          <div className={chartHeightClass}>
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
                    const percentValue = (value as number) - 100;
                    const percent = percentValue.toFixed(2);
                    return [`${percentValue >= 0 ? "+" : ""}${percent}%`, name];
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
          <div className={`mt-4 grid gap-3 text-center ${size === "small" ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
            {visibleCategoryPerformance.map((perf, index) => (
              <div key={perf.category} className={`${statCardPadding} rounded-lg bg-muted/50`}>
                <div className={`${size === "small" ? "text-xs" : "text-sm"} text-muted-foreground truncate`}>{perf.category}</div>
                <div className={`${size === "small" ? "text-lg" : "text-xl"} font-bold tabular-nums ${perf.performance >= 0 ? "text-positive" : "text-destructive"}`}>
                  {perf.performance >= 0 ? "+" : ""}{perf.performance.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </>
    );
    
    return noCard ? <>{chartContent}</> : (
      <Card className={`${cardClassName ?? ""} ${onExpandClick ? "cursor-pointer" : ""}`} onClick={onExpandClick}>
        {chartContent}
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={`${cardClassName ?? ""} ${onExpandClick ? "cursor-pointer" : ""}`} onClick={onExpandClick}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="truncate">{chartTitle}</CardTitle>
            <div className="flex items-center gap-2">
              {sizeSelector}
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`${chartHeightClass} flex items-center justify-center text-muted-foreground`}>
            No benchmark data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use real chart data if available, otherwise generate from growth rates.
  // `percentSeries` is indexed to 0 (percent change).
  const percentSeries: Array<{ date: string; portfolio: number }> = chartData
    ? chartData.portfolio.map((p) => ({
        date: p.date,
        portfolio: p.value,
      }))
    : generateTimeSeriesData(data.portfolioGrowth, data.spyGrowth, timeframe).map((d) => ({
        date: d.date,
        portfolio: d.portfolio,
      }));

  // Convert the percent-index series into dollars using `totalValue` so the chart ends at the
  // current portfolio value.
  const showDollars = typeof totalValue === "number" && Number.isFinite(totalValue) && totalValue > 0;
  const displayChartData: Array<{ date: string; portfolio: number }> = showDollars
    ? (() => {
        const endPct = percentSeries.length > 0 ? percentSeries[percentSeries.length - 1].portfolio : 0;
        const denom = 1 + endPct / 100;
        const baseValue = denom !== 0 ? totalValue / denom : totalValue;
        return percentSeries.map((p) => ({
          date: p.date,
          portfolio: baseValue * (1 + p.portfolio / 100),
        }));
      })()
    : percentSeries;
  
  // Calculate performance for the selected timeframe from the percent series (indexed to 0).
  // Since data is already indexed to 0, the end value IS the performance percentage.
  const portfolioStart = percentSeries.length > 0 ? percentSeries[0].portfolio : 0;
  const portfolioEnd =
    percentSeries.length > 0 ? percentSeries[percentSeries.length - 1].portfolio : data.portfolioGrowth;
  const portfolioPerformance = portfolioEnd - portfolioStart;
  const isMonthlyTrendPositive = portfolioPerformance >= 0;
  const trendColor = isMonthlyTrendPositive ? "hsl(142 50% 45%)" : "hsl(var(--destructive))";

  const portfolioDollarStart = showDollars && displayChartData.length > 0 ? displayChartData[0].portfolio : null;
  const portfolioDollarEnd =
    showDollars && displayChartData.length > 0 ? displayChartData[displayChartData.length - 1].portfolio : null;
  const portfolioDollarChange =
    portfolioDollarStart !== null && portfolioDollarEnd !== null ? portfolioDollarEnd - portfolioDollarStart : null;

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
    <Card className={cardClassName}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">{chartTitle}</CardTitle>
            {typeof totalValue === "number" && typeof dailyChange === "number" && typeof dailyChangePercent === "number" && (
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <div className={`font-bold tabular-nums ${size === "small" ? "text-lg" : size === "large" ? "text-3xl" : "text-2xl"}`}>
                  {formatCurrency(totalValue)}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-sm font-semibold tabular-nums ${dailyChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {dailyChange >= 0 ? "+" : "-"}{formatCurrency(Math.abs(dailyChange))}
                  </div>
                  <div className={`text-xs tabular-nums ${dailyChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    ({dailyChangePercent >= 0 ? "+" : ""}{dailyChangePercent.toFixed(2)}%)
                  </div>
                  <span className="text-xs text-muted-foreground">today</span>
                </div>
                {size !== "small" && (
                  <div className="flex items-center gap-2">
                    <div className={`text-sm font-semibold tabular-nums ${portfolioPerformance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {portfolioPerformance >= 0 ? "+" : ""}{portfolioPerformance.toFixed(2)}%
                    </div>
                    {portfolioDollarChange !== null && (
                      <div className={`text-xs tabular-nums ${portfolioDollarChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        ({portfolioDollarChange >= 0 ? "+" : "-"}{formatCurrency(Math.abs(portfolioDollarChange))})
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">1M</span>
                  </div>
                )}
              </div>
            )}
          </div>
          {sizeSelector}
        </div>
      </CardHeader>
      <CardContent>
        {size === "small" ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 p-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">1M change</div>
              <div className={`text-lg font-bold tabular-nums ${portfolioPerformance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {portfolioPerformance >= 0 ? "+" : ""}{portfolioPerformance.toFixed(2)}%
              </div>
            </div>
            {portfolioDollarChange !== null && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">approx</div>
                <div className={`text-sm font-semibold tabular-nums ${portfolioDollarChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {portfolioDollarChange >= 0 ? "+" : "-"}{formatCurrency(Math.abs(portfolioDollarChange))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={chartHeightClass}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
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
                  tickFormatter={(value) =>
                    showDollars
                      ? formatRoundedK(value)
                      : `${value >= 0 ? "+" : ""}${value.toFixed(0)}%`
                  }
                  domain={[
                    (dataMin: number) => {
                      const allValues = displayChartData.map((d) => d.portfolio);
                      const min = Math.min(...allValues);
                      return min * 0.98;
                    },
                    (dataMax: number) => {
                      const allValues = displayChartData.map((d) => d.portfolio);
                      const max = Math.max(...allValues);
                      return max * 1.02;
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
                  formatter={(value: number) => [
                    showDollars ? formatRoundedK(value) : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`,
                    "Portfolio",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="portfolio"
                  stroke="none"
                  fill={trendColor}
                  fillOpacity={0.18}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="portfolio"
                  stroke={trendColor}
                  strokeWidth={2}
                  dot={false}
                  name="Portfolio"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {size === "large" && (
          <div className={`mt-4 grid grid-cols-1 gap-4 text-center`}>
            <div className={`${statCardPadding} rounded-lg bg-muted/50`}>
              <div className="text-sm text-muted-foreground">Portfolio {timeframeLabel[timeframe]}</div>
              <div className={`text-xl font-bold tabular-nums ${portfolioPerformance >= 0 ? "text-positive" : "text-destructive"}`}>
                {portfolioPerformance >= 0 ? "+" : ""}{portfolioPerformance.toFixed(2)}%
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
