import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { SEO } from "@/components/seo";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  LineChart,
  Line,
  BarChart,
  Bar,
} from "recharts";
import { 
  Target, 
  TrendingUp, 
  TrendingDown,
  Calculator, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Info,
  DollarSign,
  Percent,
  Clock,
  Receipt,
  Wallet,
  ArrowRightLeft,
  Milestone,
  AlertTriangle,
} from "lucide-react";
import type { 
  MonteCarloInput, 
  MonteCarloResult, 
  PlanningDefaults,
  TaxLossHarvesting,
  RothConversionInput,
  RothConversionResult,
  CashFlowInput,
  CashFlowProjection,
} from "@shared/schema";

/**
 * Format currency
 */
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

/**
 * Format large numbers compactly
 */
const formatCompact = (value: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);

/**
 * Success Rate Gauge
 */
function SuccessGauge({ rate, target }: { rate: number; target: number }) {
  const isSuccess = rate >= 80;
  const isMarginal = rate >= 50 && rate < 80;
  
  const color = isSuccess ? "#22c55e" : isMarginal ? "#eab308" : "#ef4444";
  const percentage = rate;
  const strokeWidth = 12;
  const size = 200;
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
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-1">
            {isSuccess ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500" />
            )}
          </div>
          <div className="text-4xl font-bold" style={{ color }}>
            {rate.toFixed(1)}%
          </div>
          <div className="text-sm text-muted-foreground">Success Rate</div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-4 text-center max-w-xs">
        {isSuccess
          ? `You have a ${rate.toFixed(0)}% chance of reaching ${formatCurrency(target)}`
          : isMarginal
          ? `Consider increasing savings or adjusting your target`
          : `Your current plan has a low probability of success`}
      </p>
    </div>
  );
}

/**
 * Fan Chart showing simulation percentiles
 */
function FanChart({ 
  data, 
  targetAmount 
}: { 
  data: Array<{ year: number; p10: number; p25: number; p50: number; p75: number; p90: number }>;
  targetAmount: number;
}) {
  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="p10p90" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="p25p75" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="year"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickFormatter={(year) => `Year ${year}`}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickFormatter={(value) => formatCompact(value)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === "p10" ? "10th Percentile" :
              name === "p25" ? "25th Percentile" :
              name === "p50" ? "Median" :
              name === "p75" ? "75th Percentile" :
              "90th Percentile"
            ]}
            labelFormatter={(year) => `Year ${year}`}
          />
          
          {/* Target line */}
          <ReferenceLine
            y={targetAmount}
            stroke="hsl(var(--destructive))"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: `Target: ${formatCompact(targetAmount)}`,
              position: "right",
              fill: "hsl(var(--destructive))",
              fontSize: 12,
            }}
          />
          
          {/* 10-90 percentile band */}
          <Area
            type="monotone"
            dataKey="p90"
            stackId="1"
            stroke="none"
            fill="url(#p10p90)"
          />
          <Area
            type="monotone"
            dataKey="p10"
            stackId="2"
            stroke="none"
            fill="hsl(var(--background))"
          />
          
          {/* 25-75 percentile band */}
          <Area
            type="monotone"
            dataKey="p75"
            stackId="3"
            stroke="none"
            fill="url(#p25p75)"
          />
          <Area
            type="monotone"
            dataKey="p25"
            stackId="4"
            stroke="none"
            fill="hsl(var(--background))"
          />
          
          {/* Median line */}
          <Area
            type="monotone"
            dataKey="p50"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            fill="none"
          />
          
          <Legend
            formatter={(value) => 
              value === "p50" ? "Median" :
              value === "p75" ? "25th-75th" :
              value === "p90" ? "10th-90th" : value
            }
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Percentile Table
 */
function PercentileTable({ 
  result, 
  targetAmount 
}: { 
  result: MonteCarloResult;
  targetAmount: number;
}) {
  const percentiles = [
    { label: "Worst Case (10th)", value: result.percentiles.p10, meetsTarget: result.percentiles.p10 >= targetAmount },
    { label: "Conservative (25th)", value: result.percentiles.p25, meetsTarget: result.percentiles.p25 >= targetAmount },
    { label: "Median (50th)", value: result.percentiles.p50, meetsTarget: result.percentiles.p50 >= targetAmount },
    { label: "Optimistic (75th)", value: result.percentiles.p75, meetsTarget: result.percentiles.p75 >= targetAmount },
    { label: "Best Case (90th)", value: result.percentiles.p90, meetsTarget: result.percentiles.p90 >= targetAmount },
  ];
  
  return (
    <div className="space-y-2">
      {percentiles.map((p) => (
        <div
          key={p.label}
          className={`flex items-center justify-between p-3 rounded-lg ${
            p.meetsTarget ? "bg-green-500/10" : "bg-red-500/10"
          }`}
        >
          <span className="text-sm font-medium">{p.label}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold">{formatCurrency(p.value)}</span>
            {p.meetsTarget ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Planning() {
  // Form state
  const [currentValue, setCurrentValue] = useState(100000);
  const [annualContribution, setAnnualContribution] = useState(20000);
  const [targetAmount, setTargetAmount] = useState(1000000);
  const [years, setYears] = useState(20);
  const [expectedReturn, setExpectedReturn] = useState(7);
  const [volatility, setVolatility] = useState(15);
  const [inflationRate, setInflationRate] = useState(3);
  const [numSimulations, setNumSimulations] = useState(1000);
  
  // Fetch defaults
  const { data: defaults, isLoading: defaultsLoading } = useQuery<PlanningDefaults>({
    queryKey: ["/api/planning/defaults"],
  });
  
  // Update form when defaults load
  useEffect(() => {
    if (defaults) {
      setCurrentValue(Math.round(defaults.currentPortfolioValue));
      if (defaults.estimatedVolatility) {
        setVolatility(Math.round(defaults.estimatedVolatility * 100));
      }
      if (defaults.suggestedTargetAmount > 0) {
        setTargetAmount(defaults.suggestedTargetAmount);
      }
    }
  }, [defaults]);
  
  // Simulation mutation
  const simulation = useMutation<MonteCarloResult, Error, MonteCarloInput>({
    mutationFn: async (input) => {
      const response = await fetch("/api/planning/monte-carlo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Simulation failed");
      }
      return response.json();
    },
  });
  
  const runSimulation = () => {
    simulation.mutate({
      currentPortfolioValue: currentValue,
      annualContribution,
      targetAmount,
      yearsToRetirement: years,
      expectedReturn: expectedReturn / 100,
      volatility: volatility / 100,
      inflationRate: inflationRate / 100,
      withdrawalRate: 0.04,
      numSimulations,
    });
  };
  
  // Run simulation on first load after defaults
  useEffect(() => {
    if (defaults && !simulation.data && !simulation.isPending) {
      runSimulation();
    }
  }, [defaults]);

  return (
    <div className="p-6 space-y-6" data-testid="page-planning">
      <SEO
        title="Financial Planning"
        description="Monte Carlo simulations to project your path to financial independence."
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Financial Planning
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Monte Carlo simulations, tax planning, and cash flow projections
        </p>
      </div>

      <Tabs defaultValue="monte-carlo" className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="monte-carlo" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Retirement
          </TabsTrigger>
          <TabsTrigger value="tax" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Tax Planning
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Cash Flow
          </TabsTrigger>
        </TabsList>

        {/* Monte Carlo Tab */}
        <TabsContent value="monte-carlo" className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Simulation Parameters
            </CardTitle>
            <CardDescription>
              Adjust the parameters below and run the simulation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {defaultsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : (
              <>
                {/* Current Portfolio Value */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Current Portfolio Value
                  </Label>
                  <Input
                    type="number"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(currentValue)}
                  </p>
                </div>

                {/* Annual Contribution */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Annual Contribution
                  </Label>
                  <Input
                    type="number"
                    value={annualContribution}
                    onChange={(e) => setAnnualContribution(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(annualContribution)} per year
                  </p>
                </div>

                {/* Target Amount */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Target Amount (FIRE Goal)
                  </Label>
                  <Input
                    type="number"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(targetAmount)} (supports {formatCurrency(targetAmount * 0.04)}/year at 4% withdrawal)
                  </p>
                </div>

                {/* Years */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Years to Retirement: {years}
                  </Label>
                  <Slider
                    value={[years]}
                    onValueChange={([v]) => setYears(v)}
                    min={5}
                    max={40}
                    step={1}
                  />
                </div>

                {/* Expected Return */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Expected Annual Return: {expectedReturn}%
                  </Label>
                  <Slider
                    value={[expectedReturn]}
                    onValueChange={([v]) => setExpectedReturn(v)}
                    min={1}
                    max={15}
                    step={0.5}
                  />
                </div>

                {/* Volatility */}
                <div className="space-y-2">
                  <Label>Portfolio Volatility: {volatility}%</Label>
                  <Slider
                    value={[volatility]}
                    onValueChange={([v]) => setVolatility(v)}
                    min={5}
                    max={40}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    S&P 500 historical volatility is ~15-20%
                  </p>
                </div>

                {/* Inflation Rate */}
                <div className="space-y-2">
                  <Label>Inflation Rate: {inflationRate}%</Label>
                  <Slider
                    value={[inflationRate]}
                    onValueChange={([v]) => setInflationRate(v)}
                    min={0}
                    max={8}
                    step={0.5}
                  />
                </div>

                {/* Number of Simulations */}
                <div className="space-y-2">
                  <Label>Simulations: {numSimulations.toLocaleString()}</Label>
                  <Slider
                    value={[numSimulations]}
                    onValueChange={([v]) => setNumSimulations(v)}
                    min={100}
                    max={5000}
                    step={100}
                  />
                </div>

                <Button
                  onClick={runSimulation}
                  disabled={simulation.isPending}
                  className="w-full"
                >
                  {simulation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Running Simulation...
                    </>
                  ) : (
                    <>
                      <Calculator className="h-4 w-4 mr-2" />
                      Run Simulation
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          {simulation.isPending ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center">
                  <RefreshCw className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Running {numSimulations.toLocaleString()} simulations...</p>
                </div>
              </CardContent>
            </Card>
          ) : simulation.error ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-destructive">
                  <XCircle className="h-12 w-12 mb-4" />
                  <p>{simulation.error.message}</p>
                </div>
              </CardContent>
            </Card>
          ) : simulation.data ? (
            <>
              {/* Success Rate */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Probability of Success</CardTitle>
                    <CardDescription>
                      Based on {simulation.data.simulationsRun.toLocaleString()} simulations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <SuccessGauge rate={simulation.data.successRate} target={targetAmount} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Final Portfolio Percentiles</CardTitle>
                    <CardDescription>
                      Projected values at year {years}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PercentileTable result={simulation.data} targetAmount={targetAmount} />
                  </CardContent>
                </Card>
              </div>

              {/* Fan Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Projection</CardTitle>
                  <CardDescription>
                    Showing 10th-90th percentile range across all simulations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FanChart data={simulation.data.yearlyPercentiles} targetAmount={targetAmount} />
                </CardContent>
              </Card>

              {/* Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Simulation Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">Mean Final Value</div>
                      <div className="text-xl font-bold">{formatCurrency(simulation.data.statistics.mean)}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">Median Final Value</div>
                      <div className="text-xl font-bold">{formatCurrency(simulation.data.statistics.median)}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">Worst Outcome</div>
                      <div className="text-xl font-bold text-red-500">{formatCurrency(simulation.data.statistics.min)}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">Best Outcome</div>
                      <div className="text-xl font-bold text-green-500">{formatCurrency(simulation.data.statistics.max)}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                    <Badge variant="outline">
                      {simulation.data.successCount.toLocaleString()} successes
                    </Badge>
                    <Badge variant="outline">
                      {simulation.data.failureCount.toLocaleString()} failures
                    </Badge>
                    <span className="ml-auto">
                      Calculated in {simulation.data.calculationTimeMs}ms
                    </span>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <Calculator className="h-12 w-12 mb-4 opacity-50" />
                  <p>Adjust parameters and click "Run Simulation" to see results</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
        </TabsContent>

        {/* Tax Planning Tab */}
        <TabsContent value="tax" className="space-y-6">
          <TaxPlanningTab />
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cashflow" className="space-y-6">
          <CashFlowTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Tax Planning Tab Component
 */
function TaxPlanningTab() {
  // Roth conversion form state
  const [conversionAmount, setConversionAmount] = useState(50000);
  const [currentAge, setCurrentAge] = useState(35);
  const [retirementAge, setRetirementAge] = useState(65);
  const [currentTaxBracket, setCurrentTaxBracket] = useState(24);
  const [retirementTaxBracket, setRetirementTaxBracket] = useState(22);
  const [rothExpectedReturn, setRothExpectedReturn] = useState(7);
  
  // Fetch tax-loss harvesting data
  const { data: taxData, isLoading: taxLoading } = useQuery<TaxLossHarvesting>({
    queryKey: ["/api/tax/loss-harvesting"],
  });
  
  // Roth conversion mutation
  const rothMutation = useMutation<RothConversionResult, Error, RothConversionInput>({
    mutationFn: async (input) => {
      const response = await fetch("/api/tax/roth-conversion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Calculation failed");
      }
      return response.json();
    },
  });
  
  const calculateRoth = () => {
    rothMutation.mutate({
      conversionAmount,
      currentAge,
      retirementAge,
      currentTaxBracket,
      expectedRetirementTaxBracket: retirementTaxBracket,
      expectedReturn: rothExpectedReturn / 100,
    });
  };
  
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Tax-Loss Harvesting */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Tax-Loss Harvesting Opportunities
          </CardTitle>
          <CardDescription>
            Identify positions with unrealized losses that can offset gains
          </CardDescription>
        </CardHeader>
        <CardContent>
          {taxLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32" />
            </div>
          ) : taxData ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-red-500/10">
                  <div className="text-sm text-muted-foreground">Total Unrealized Losses</div>
                  <div className="text-xl font-bold text-red-500">
                    {formatCurrency(taxData.totalUnrealizedLosses)}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-green-500/10">
                  <div className="text-sm text-muted-foreground">Potential Tax Savings</div>
                  <div className="text-xl font-bold text-green-500">
                    {formatCurrency(taxData.totalPotentialTaxSavings)}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/10">
                  <div className="text-sm text-muted-foreground">Total Unrealized Gains</div>
                  <div className="text-xl font-bold text-blue-500">
                    {formatCurrency(taxData.totalUnrealizedGains)}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-orange-500/10">
                  <div className="text-sm text-muted-foreground">Estimated Tax Liability</div>
                  <div className="text-xl font-bold text-orange-500">
                    {formatCurrency(taxData.estimatedTaxLiability)}
                  </div>
                </div>
              </div>
              
              {/* Holdings Table */}
              {taxData.holdings.filter(h => h.isLoss).length > 0 ? (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Harvest These Losses
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticker</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Cost Basis</TableHead>
                        <TableHead className="text-right">Current Value</TableHead>
                        <TableHead className="text-right">Loss</TableHead>
                        <TableHead className="text-right">Tax Savings</TableHead>
                        <TableHead>Period</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taxData.holdings.filter(h => h.isLoss).map((holding) => (
                        <TableRow key={holding.ticker}>
                          <TableCell className="font-mono font-medium">{holding.ticker}</TableCell>
                          <TableCell className="max-w-32 truncate">{holding.name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(holding.costBasis)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(holding.currentValue)}</TableCell>
                          <TableCell className="text-right text-red-500">
                            {formatCurrency(holding.unrealizedGainLoss)}
                          </TableCell>
                          <TableCell className="text-right text-green-500">
                            {formatCurrency(holding.potentialTaxSavings)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={holding.holdingPeriod === "short-term" ? "destructive" : "secondary"}>
                              {holding.holdingPeriod}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No tax-loss harvesting opportunities - all positions are in profit!</p>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                * Tax rates used: Short-term {taxData.shortTermRate}%, Long-term {taxData.longTermRate}%. 
                Remember the wash sale rule: avoid repurchasing the same or substantially identical securities within 30 days.
              </p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Add holdings to see tax-loss harvesting opportunities
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Roth Conversion Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Roth Conversion Calculator
          </CardTitle>
          <CardDescription>
            Compare Traditional IRA vs Roth IRA conversion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Conversion Amount</Label>
            <Input
              type="number"
              value={conversionAmount}
              onChange={(e) => setConversionAmount(Number(e.target.value))}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Age: {currentAge}</Label>
              <Slider
                value={[currentAge]}
                onValueChange={([v]) => setCurrentAge(v)}
                min={18}
                max={70}
              />
            </div>
            <div className="space-y-2">
              <Label>Retirement Age: {retirementAge}</Label>
              <Slider
                value={[retirementAge]}
                onValueChange={([v]) => setRetirementAge(v)}
                min={50}
                max={80}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Tax Bracket: {currentTaxBracket}%</Label>
              <Slider
                value={[currentTaxBracket]}
                onValueChange={([v]) => setCurrentTaxBracket(v)}
                min={10}
                max={37}
              />
            </div>
            <div className="space-y-2">
              <Label>Retirement Tax Bracket: {retirementTaxBracket}%</Label>
              <Slider
                value={[retirementTaxBracket]}
                onValueChange={([v]) => setRetirementTaxBracket(v)}
                min={10}
                max={37}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Expected Return: {rothExpectedReturn}%</Label>
            <Slider
              value={[rothExpectedReturn]}
              onValueChange={([v]) => setRothExpectedReturn(v)}
              min={1}
              max={12}
              step={0.5}
            />
          </div>
          
          <Button onClick={calculateRoth} disabled={rothMutation.isPending} className="w-full">
            {rothMutation.isPending ? "Calculating..." : "Calculate Conversion"}
          </Button>
        </CardContent>
      </Card>
      
      {/* Roth Results */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {rothMutation.data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground">Tax on Conversion</div>
                  <div className="text-lg font-bold text-red-500">
                    {formatCurrency(rothMutation.data.taxOnConversion)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground">Years to Retirement</div>
                  <div className="text-lg font-bold">{rothMutation.data.yearsToRetirement}</div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg border">
                <div className="text-sm font-medium mb-2">At Retirement</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Roth (Tax-Free)</div>
                    <div className="text-lg font-bold text-green-500">
                      {formatCurrency(rothMutation.data.futureValueIfConverted)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Traditional (After Tax)</div>
                    <div className="text-lg font-bold">
                      {formatCurrency(rothMutation.data.afterTaxTraditional)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={`p-4 rounded-lg ${rothMutation.data.rothAdvantage > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <div className="text-sm font-medium">
                  {rothMutation.data.rothAdvantage > 0 ? 'Roth Advantage' : 'Traditional Advantage'}
                </div>
                <div className={`text-2xl font-bold ${rothMutation.data.rothAdvantage > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(Math.abs(rothMutation.data.rothAdvantage))}
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {rothMutation.data.recommendation}
              </p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Enter parameters and click calculate</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Cash Flow Tab Component
 */
function CashFlowTab() {
  // Form state
  const [monthlyIncome, setMonthlyIncome] = useState(10000);
  const [monthlyExpenses, setMonthlyExpenses] = useState(6000);
  const [cfExpectedReturn, setCfExpectedReturn] = useState(7);
  const [cfInflation, setCfInflation] = useState(3);
  const [cfYears, setCfYears] = useState(30);
  
  // Fetch defaults
  const { data: cfDefaults } = useQuery<{ currentNetWorth: number }>({
    queryKey: ["/api/cashflow/defaults"],
  });
  
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
  
  // Projection mutation
  const projection = useMutation<CashFlowProjection, Error, CashFlowInput>({
    mutationFn: async (input) => {
      const response = await fetch("/api/cashflow/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Projection failed");
      }
      return response.json();
    },
  });
  
  const runProjection = () => {
    projection.mutate({
      currentNetWorth: cfDefaults?.currentNetWorth || 0,
      monthlyIncome,
      monthlyExpenses,
      monthlySavings,
      expectedReturn: cfExpectedReturn / 100,
      inflationRate: cfInflation / 100,
      yearsToProject: cfYears,
    });
  };
  
  // Auto-run on mount
  useEffect(() => {
    if (cfDefaults && !projection.data && !projection.isPending) {
      runProjection();
    }
  }, [cfDefaults]);
  
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Cash Flow Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Monthly Income</Label>
            <Input
              type="number"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(Number(e.target.value))}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Monthly Expenses</Label>
            <Input
              type="number"
              value={monthlyExpenses}
              onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
            />
          </div>
          
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Monthly Savings</span>
              <span className={`font-bold ${monthlySavings >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(monthlySavings)}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-muted-foreground">Savings Rate</span>
              <span className={`font-medium ${savingsRate >= 20 ? 'text-green-500' : savingsRate >= 10 ? 'text-yellow-500' : 'text-red-500'}`}>
                {savingsRate.toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Expected Return: {cfExpectedReturn}%</Label>
            <Slider
              value={[cfExpectedReturn]}
              onValueChange={([v]) => setCfExpectedReturn(v)}
              min={1}
              max={12}
              step={0.5}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Inflation Rate: {cfInflation}%</Label>
            <Slider
              value={[cfInflation]}
              onValueChange={([v]) => setCfInflation(v)}
              min={0}
              max={8}
              step={0.5}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Years to Project: {cfYears}</Label>
            <Slider
              value={[cfYears]}
              onValueChange={([v]) => setCfYears(v)}
              min={5}
              max={50}
            />
          </div>
          
          <Button onClick={runProjection} disabled={projection.isPending} className="w-full">
            {projection.isPending ? "Projecting..." : "Project Cash Flow"}
          </Button>
        </CardContent>
      </Card>
      
      {/* Results */}
      <div className="lg:col-span-2 space-y-6">
        {projection.data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Current Net Worth</div>
                  <div className="text-xl font-bold">
                    {formatCurrency(cfDefaults?.currentNetWorth || 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Final Net Worth</div>
                  <div className="text-xl font-bold text-green-500">
                    {formatCurrency(projection.data.finalNetWorth)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total Contributions</div>
                  <div className="text-xl font-bold">
                    {formatCurrency(projection.data.totalContributions)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Investment Gains</div>
                  <div className="text-xl font-bold text-blue-500">
                    {formatCurrency(projection.data.totalInvestmentGains)}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Net Worth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Net Worth Projection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={projection.data.yearlyData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="year"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <YAxis
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickFormatter={(v) => formatCompact(v)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                        formatter={(value: number) => [formatCurrency(value), "Net Worth"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="endingNetWorth"
                        stroke="#22c55e"
                        fill="url(#netWorthGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Milestones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Milestone className="h-5 w-5" />
                  Financial Milestones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projection.data.milestones.map((milestone) => (
                    <div key={milestone.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {milestone.isAchieved ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Target className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{milestone.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono">{formatCurrency(milestone.targetAmount)}</span>
                          {milestone.yearsAway !== null && !milestone.isAchieved && (
                            <span className="text-sm text-muted-foreground ml-2">
                              ({milestone.yearsAway} years)
                            </span>
                          )}
                        </div>
                      </div>
                      <Progress value={milestone.progressPercent} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Wallet className="h-12 w-12 mb-4 opacity-50" />
                <p>Enter your income and expenses to see projections</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
