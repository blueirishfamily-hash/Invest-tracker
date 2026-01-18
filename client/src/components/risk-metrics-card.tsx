import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Activity, TrendingDown, TrendingUp, Shield, AlertTriangle, Info, Target } from "lucide-react";
import type { PortfolioRiskMetrics } from "@shared/schema";

/**
 * Get color based on risk level
 */
function getRiskColor(level: string): string {
  switch (level) {
    case "Low": return "text-green-500";
    case "Medium": return "text-yellow-500";
    case "High": return "text-orange-500";
    case "Very High": return "text-red-500";
    default: return "text-muted-foreground";
  }
}

/**
 * Get badge variant based on risk level
 */
function getRiskBadgeVariant(level: string): "default" | "secondary" | "destructive" | "outline" {
  switch (level) {
    case "Low": return "default";
    case "Medium": return "secondary";
    case "High": return "destructive";
    case "Very High": return "destructive";
    default: return "outline";
  }
}

/**
 * Circular gauge component for visualizing metrics
 */
function MetricGauge({ 
  value, 
  maxValue, 
  label, 
  unit = "",
  color = "hsl(var(--primary))",
  size = 120,
}: { 
  value: number; 
  maxValue: number; 
  label: string; 
  unit?: string;
  color?: string;
  size?: number;
}) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold">{value.toFixed(2)}</span>
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
      </div>
      <span className="mt-2 text-sm font-medium text-center">{label}</span>
    </div>
  );
}

/**
 * Risk metric card with comparison to benchmark
 */
function RiskMetricRow({
  icon: Icon,
  title,
  value,
  unit,
  benchmark,
  benchmarkLabel,
  interpretation,
  level,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: number;
  unit: string;
  benchmark?: number;
  benchmarkLabel?: string;
  interpretation?: string;
  level?: string;
}) {
  const isBetter = benchmark !== undefined && value < benchmark;
  
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{title}</span>
        </div>
        {level && (
          <Badge variant={getRiskBadgeVariant(level)}>{level}</Badge>
        )}
      </div>
      
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold">{value.toFixed(2)}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
        {benchmark !== undefined && (
          <div className="flex items-center gap-1 ml-2">
            {isBetter ? (
              <TrendingDown className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingUp className="h-4 w-4 text-orange-500" />
            )}
            <span className="text-sm text-muted-foreground">
              vs {benchmark.toFixed(2)} {benchmarkLabel}
            </span>
          </div>
        )}
      </div>
      
      {interpretation && (
        <p className="text-sm text-muted-foreground">{interpretation}</p>
      )}
    </div>
  );
}

/**
 * VaR (Value at Risk) display card
 */
function VaRCard({
  var95,
  var99,
  var95Percent,
  var99Percent,
}: {
  var95: number;
  var99: number;
  var95Percent: number;
  var99Percent: number;
}) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("en-US", { 
      style: "currency", 
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        <span className="font-medium">Value at Risk (VaR)</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-muted-foreground mb-1">95% Confidence</div>
          <div className="text-xl font-bold text-orange-500">{formatCurrency(var95)}</div>
          <div className="text-sm text-muted-foreground">{var95Percent.toFixed(2)}% of portfolio</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">99% Confidence</div>
          <div className="text-xl font-bold text-red-500">{formatCurrency(var99)}</div>
          <div className="text-sm text-muted-foreground">{var99Percent.toFixed(2)}% of portfolio</div>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground mt-4">
        Maximum expected daily loss at given confidence levels
      </p>
    </div>
  );
}

/**
 * Main Risk Metrics Card Component
 */
export function RiskMetricsCard() {
  const [timeframe, setTimeframe] = useState<"1Y" | "3Y" | "5Y">("1Y");
  
  const { data: metrics, isLoading, error } = useQuery<PortfolioRiskMetrics>({
    queryKey: ["/api/portfolio/risk-metrics", timeframe],
    queryFn: async () => {
      const response = await fetch(`/api/portfolio/risk-metrics?timeframe=${timeframe}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch risk metrics");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Portfolio Risk Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Portfolio Risk Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Info className="h-5 w-5 mr-2" />
            <span>Unable to calculate risk metrics. Add holdings to get started.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Portfolio Risk Metrics
            </CardTitle>
            <CardDescription>
              Risk analysis based on {metrics.dataPoints} days of data
            </CardDescription>
          </div>
          <Select value={timeframe} onValueChange={(v) => setTimeframe(v as "1Y" | "3Y" | "5Y")}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1Y">1 Year</SelectItem>
              <SelectItem value="3Y">3 Years</SelectItem>
              <SelectItem value="5Y">5 Years</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Gauges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
          <MetricGauge
            value={metrics.volatility}
            maxValue={50}
            label="Volatility"
            unit="%"
            color={metrics.volatilityLevel === "Low" ? "#22c55e" : 
                   metrics.volatilityLevel === "Medium" ? "#eab308" :
                   metrics.volatilityLevel === "High" ? "#f97316" : "#ef4444"}
          />
          <MetricGauge
            value={metrics.beta}
            maxValue={2}
            label="Beta"
            color={metrics.beta <= 1 ? "#22c55e" : "#f97316"}
          />
          <MetricGauge
            value={Math.max(0, metrics.sharpeRatio)}
            maxValue={3}
            label="Sharpe Ratio"
            color={metrics.sharpeRatio >= 1 ? "#22c55e" : 
                   metrics.sharpeRatio >= 0.5 ? "#eab308" : "#ef4444"}
          />
          <MetricGauge
            value={metrics.maxDrawdown}
            maxValue={50}
            label="Max Drawdown"
            unit="%"
            color={metrics.maxDrawdown <= 10 ? "#22c55e" : 
                   metrics.maxDrawdown <= 20 ? "#eab308" : "#ef4444"}
          />
        </div>

        {/* Detailed Metrics */}
        <div className="grid gap-4 md:grid-cols-2">
          <RiskMetricRow
            icon={Activity}
            title="Volatility"
            value={metrics.volatility}
            unit="%"
            benchmark={metrics.spyVolatility}
            benchmarkLabel="S&P 500"
            level={metrics.volatilityLevel}
          />
          
          <RiskMetricRow
            icon={Target}
            title="Beta"
            value={metrics.beta}
            unit=""
            benchmark={1}
            benchmarkLabel="Market"
            interpretation={metrics.betaInterpretation}
          />
          
          <RiskMetricRow
            icon={Shield}
            title="Sharpe Ratio"
            value={metrics.sharpeRatio}
            unit=""
            benchmark={metrics.spySharpeRatio}
            benchmarkLabel="S&P 500"
            interpretation={metrics.sharpeInterpretation}
          />
          
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <span className="font-medium">Maximum Drawdown</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-red-500">-{metrics.maxDrawdown.toFixed(2)}%</span>
            </div>
            {metrics.maxDrawdownPeriod && (
              <p className="text-sm text-muted-foreground">
                Period: {metrics.maxDrawdownPeriod}
              </p>
            )}
          </div>
        </div>

        {/* VaR Section */}
        <VaRCard
          var95={metrics.var95}
          var99={metrics.var99}
          var95Percent={metrics.var95Percent}
          var99Percent={metrics.var99Percent}
        />

        {/* Benchmark Comparison Summary */}
        <div className="p-4 rounded-lg bg-muted/50">
          <h4 className="font-medium mb-3">S&P 500 Comparison</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Your Volatility</div>
              <div className="font-medium">{metrics.volatility.toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-muted-foreground">S&P 500 Volatility</div>
              <div className="font-medium">{metrics.spyVolatility.toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-muted-foreground">Difference</div>
              <div className={`font-medium ${metrics.volatility > metrics.spyVolatility ? "text-red-500" : "text-green-500"}`}>
                {metrics.volatility > metrics.spyVolatility ? "+" : ""}
                {(metrics.volatility - metrics.spyVolatility).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
