import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { SEO } from "@/components/seo";
import { Gauge, AlertCircle, Info, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { RiskMetricsCard } from "@/components/risk-metrics-card";
import type { FearGreedIndex } from "@shared/schema";

/**
 * Get color based on Fear & Greed Index score
 */
function getScoreColor(score: number): string {
  if (score <= 25) return "text-destructive"; // Extreme Fear - red
  if (score <= 45) return "text-orange-500"; // Fear - orange
  if (score <= 55) return "text-yellow-500"; // Neutral - yellow
  if (score <= 75) return "text-green-500"; // Greed - green
  return "text-emerald-600"; // Extreme Greed - dark green
}

/**
 * Get background color for progress bar based on score
 */
function getProgressColor(score: number): string {
  if (score <= 25) return "bg-destructive"; // Extreme Fear - red
  if (score <= 45) return "bg-orange-500"; // Fear - orange
  if (score <= 55) return "bg-yellow-500"; // Neutral - yellow
  if (score <= 75) return "bg-green-500"; // Greed - green
  return "bg-emerald-600"; // Extreme Greed - dark green
}

/**
 * Get badge variant based on rating
 */
function getBadgeVariant(rating: string): "default" | "secondary" | "destructive" | "outline" {
  if (rating === "Extreme Fear" || rating === "Fear") return "destructive";
  if (rating === "Neutral") return "secondary";
  return "default";
}

type VIXTimeframe = "1M" | "3M" | "6M" | "1Y" | "5Y" | "MAX";

interface VIXData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  timestamp: string;
  historical: Array<{ date: string; value: number }>;
}

export default function RiskIndicators() {
  const [vixTimeframe, setVixTimeframe] = useState<VIXTimeframe>("1Y");

  const { data: fearGreed, isLoading, error } = useQuery<FearGreedIndex>({
    queryKey: ["/api/fear-greed"],
    queryFn: async () => {
      const response = await fetch("/api/fear-greed", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch Fear & Greed Index");
      }
      return response.json();
    },
    refetchInterval: 30 * 60 * 1000, // Refetch every 30 minutes
  });

  const { data: vixData, isLoading: vixLoading, error: vixError } = useQuery<VIXData>({
    queryKey: ["/api/vix", vixTimeframe],
    queryFn: async () => {
      const response = await fetch(`/api/vix?timeframe=${vixTimeframe}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch VIX data");
      }
      return response.json();
    },
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
  });

  return (
    <div className="p-6 space-y-6" data-testid="page-risk-indicators">
      <SEO
        title="Risk Indicators"
        description="Monitor market sentiment with the CNN Fear & Greed Index and other risk indicators."
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Risk Indicators
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Monitor market sentiment and portfolio risk metrics to inform your investment decisions
        </p>
      </div>

      <Tabs defaultValue="portfolio" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="portfolio" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Portfolio Risk
          </TabsTrigger>
          <TabsTrigger value="fear-greed" className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Fear & Greed
          </TabsTrigger>
          <TabsTrigger value="vix" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            VIX
          </TabsTrigger>
        </TabsList>

        {/* Portfolio Risk Tab */}
        <TabsContent value="portfolio" className="space-y-6">
          <RiskMetricsCard />
          
          {/* Risk Metrics Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Understanding Portfolio Risk Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-muted-foreground">
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>
                    <span className="font-medium text-foreground">Volatility:</span> Measures price
                    fluctuation risk. Higher volatility means larger price swings.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Beta:</span> Measures sensitivity
                    to market movements. Beta of 1.0 moves with the market, greater than 1 is more volatile.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Sharpe Ratio:</span> Risk-adjusted
                    return measure. Higher is better (above 1 is good, above 2 is very good).
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Value at Risk (VaR):</span> Maximum
                    expected daily loss at given confidence levels.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Max Drawdown:</span> Largest historical
                    decline from peak to trough.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fear & Greed Tab */}
        <TabsContent value="fear-greed" className="space-y-6">
      {/* CNN Fear & Greed Index Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                CNN Fear & Greed Index
              </CardTitle>
              <CardDescription className="mt-1">
                A measure of market sentiment based on 7 indicators
              </CardDescription>
            </div>
            {fearGreed && (
              <Badge
                variant={getBadgeVariant(fearGreed.rating)}
                className="text-sm px-3 py-1"
              >
                {fearGreed.rating}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-32 bg-muted animate-pulse rounded-lg" />
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Unable to Load Data</h3>
              <p className="text-muted-foreground max-w-md">
                Failed to fetch Fear & Greed Index data. Please try again later.
              </p>
            </div>
          ) : fearGreed ? (
            <>
              {/* Score Display */}
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative">
                  {/* Circular Gauge Visualization */}
                  <div className="relative w-64 h-64 mx-auto">
                    <svg
                      className="transform -rotate-90 w-64 h-64"
                      viewBox="0 0 200 200"
                    >
                      {/* Background circle */}
                      <circle
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        stroke="hsl(var(--muted))"
                        strokeWidth="20"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        strokeWidth="20"
                        strokeDasharray={`${(fearGreed.score / 100) * 502.65} 502.65`}
                        strokeLinecap="round"
                        className={`transition-all duration-500 ${
                          fearGreed.score <= 25
                            ? "stroke-destructive"
                            : fearGreed.score <= 45
                            ? "stroke-orange-500"
                            : fearGreed.score <= 55
                            ? "stroke-yellow-500"
                            : fearGreed.score <= 75
                            ? "stroke-green-500"
                            : "stroke-emerald-600"
                        }`}
                      />
                    </svg>
                    {/* Score in center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div
                          className={`text-5xl font-bold tabular-nums ${getScoreColor(fearGreed.score)}`}
                        >
                          {fearGreed.score}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">out of 100</div>
                      </div>
                    </div>
                  </div>
                </div>

                  {/* Linear Progress Bar */}
                  <div className="w-full max-w-md mt-8 space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                      <span>Extreme Fear</span>
                      <span>Neutral</span>
                      <span>Extreme Greed</span>
                    </div>
                    <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${getProgressColor(fearGreed.score)}`}
                        style={{ width: `${fearGreed.score}%` }}
                      />
                    </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>25</span>
                    <span>45</span>
                    <span>55</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm font-medium mb-1">Current Rating</p>
                  <p className="text-lg font-semibold">{fearGreed.rating}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Last Updated</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(fearGreed.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
              <p className="text-muted-foreground max-w-md">
                Fear & Greed Index data is not currently available.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About the Fear & Greed Index
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The CNN Fear & Greed Index is a market sentiment indicator that measures investor
              emotions and psychology. It ranges from 0 to 100, where:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="font-medium text-foreground">0-25 (Extreme Fear):</span> Investors
                are very fearful, which may indicate a buying opportunity.
              </li>
              <li>
                <span className="font-medium text-foreground">26-45 (Fear):</span> Investors are
                cautious and fearful about the market.
              </li>
              <li>
                <span className="font-medium text-foreground">46-55 (Neutral):</span> Market
                sentiment is balanced between fear and greed.
              </li>
              <li>
                <span className="font-medium text-foreground">56-75 (Greed):</span> Investors are
                showing greed and may be overvaluing assets.
              </li>
              <li>
                <span className="font-medium text-foreground">76-100 (Extreme Greed):</span> Extreme
                greed may indicate the market is overbought and due for a correction.
              </li>
            </ul>
            <p className="text-xs italic pt-2">
              Data source: CNN Business Fear & Greed Index
            </p>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        {/* VIX Tab */}
        <TabsContent value="vix" className="space-y-6">
      {/* VIX Indicator Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                VIX (CBOE Volatility Index)
              </CardTitle>
              <CardDescription className="mt-1">
                Market's expectation of 30-day volatility
              </CardDescription>
            </div>
            {vixData && (
              <Badge
                variant={vixData.current >= 30 ? "destructive" : vixData.current >= 20 ? "outline" : "default"}
                className="text-sm px-3 py-1"
              >
                {vixData.current >= 30 ? "High Volatility" : vixData.current >= 20 ? "Elevated" : "Normal"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {vixLoading ? (
            <div className="space-y-4">
              <div className="h-32 bg-muted animate-pulse rounded-lg" />
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            </div>
          ) : vixError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Unable to Load Data</h3>
              <p className="text-muted-foreground max-w-md">
                Failed to fetch VIX data. Please try again later.
              </p>
            </div>
          ) : vixData ? (
            <>
              {/* VIX Current Value Display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Current VIX</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold tabular-nums ${
                      vixData.current >= 30
                        ? "text-destructive"
                        : vixData.current >= 20
                        ? "text-orange-500"
                        : "text-chart-1"
                    }`}>
                      {vixData.current.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Change</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold tabular-nums flex items-center gap-2 ${
                      vixData.change >= 0 ? "text-destructive" : "text-chart-1"
                    }`}>
                      {vixData.change >= 0 ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : (
                        <TrendingDown className="h-5 w-5" />
                      )}
                      {vixData.change >= 0 ? "+" : ""}
                      {vixData.change.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Change %</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold tabular-nums ${
                      vixData.changePercent >= 0 ? "text-destructive" : "text-chart-1"
                    }`}>
                      {vixData.changePercent >= 0 ? "+" : ""}
                      {vixData.changePercent.toFixed(2)}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* VIX Level Indicator */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Low (0-12)</span>
                  <span>Normal (13-19)</span>
                  <span>Elevated (20-29)</span>
                  <span>High (30+)</span>
                </div>
                <div className="relative h-4 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      vixData.current >= 30
                        ? "bg-destructive"
                        : vixData.current >= 20
                        ? "bg-orange-500"
                        : vixData.current >= 13
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min((vixData.current / 50) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>12</span>
                  <span>19</span>
                  <span>29</span>
                  <span>50+</span>
                </div>
              </div>

              {/* Historical Chart */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Historical Trend</CardTitle>
                  <Select value={vixTimeframe} onValueChange={(value) => setVixTimeframe(value as VIXTimeframe)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Select timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1M">1 Month</SelectItem>
                      <SelectItem value="3M">3 Months</SelectItem>
                      <SelectItem value="6M">6 Months</SelectItem>
                      <SelectItem value="1Y">1 Year</SelectItem>
                      <SelectItem value="5Y">5 Years</SelectItem>
                      <SelectItem value="MAX">Max</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={vixData.historical}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        interval="preserveStartEnd"
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        }}
                      />
                      <YAxis
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        domain={[0, 'auto']}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        formatter={(value: number) => [value.toFixed(2), "VIX"]}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: "20px" }}
                        iconType="line"
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                        dot={false}
                        name="VIX"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm font-medium mb-1">Previous Close</p>
                  <p className="text-lg font-semibold tabular-nums">{vixData.previous.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Last Updated</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(vixData.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
              <p className="text-muted-foreground max-w-md">
                VIX data is not currently available.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* VIX Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About VIX (CBOE Volatility Index)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The VIX, or CBOE Volatility Index, is a real-time market index that represents the
              market's expectation of 30-day forward-looking volatility. It is derived from the
              price inputs of S&P 500 index options and is often referred to as the "fear gauge"
              or "fear index."
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="font-medium text-foreground">0-12 (Low):</span> Market is calm,
                investors are complacent.
              </li>
              <li>
                <span className="font-medium text-foreground">13-19 (Normal):</span> Typical
                volatility range, market is stable.
              </li>
              <li>
                <span className="font-medium text-foreground">20-29 (Elevated):</span> Increased
                volatility, market uncertainty is rising.
              </li>
              <li>
                <span className="font-medium text-foreground">30+ (High):</span> High volatility,
                fear and uncertainty are elevated. Often indicates market stress or potential
                corrections.
              </li>
            </ul>
            <p>
              A rising VIX typically indicates increased fear and uncertainty in the market, while
              a falling VIX suggests complacency. The VIX is inversely correlated with the S&P 500
              - when stocks fall, VIX usually rises, and vice versa.
            </p>
            <p className="text-xs italic pt-2">
              Data source: CBOE Volatility Index (VIX)
            </p>
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
