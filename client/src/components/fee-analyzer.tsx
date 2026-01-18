import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import { DollarSign, TrendingDown, AlertCircle, Lightbulb, PiggyBank, Info, ArrowRight } from "lucide-react";
import type { FeeAnalysis, HoldingFee, FeeAlternative, FeeProjection } from "@shared/schema";

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

const formatCurrencyDetailed = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

/**
 * Fee Summary Card
 */
function FeeSummaryCard({ analysis }: { analysis: FeeAnalysis }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Annual Fees</span>
          </div>
          <div className="text-2xl font-bold text-orange-500">
            {formatCurrency(analysis.totalAnnualFees)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {analysis.weightedAverageExpenseRatio.toFixed(3)}% weighted avg
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">10-Year Impact</span>
          </div>
          <div className="text-2xl font-bold text-red-500">
            {formatCurrency(analysis.tenYearFeeCost)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Lost to fees over 10 years
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Potential Savings</span>
          </div>
          <div className="text-2xl font-bold text-green-500">
            {formatCurrency(analysis.potentialAnnualSavings)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Per year with alternatives
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Holdings Breakdown</span>
          </div>
          <div className="text-2xl font-bold">
            {analysis.fundsCount} / {analysis.stocksCount}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Funds vs Individual Stocks
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Holdings Fee Table
 */
function HoldingsFeeTable({ holdings }: { holdings: HoldingFee[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Holdings Expense Ratios</CardTitle>
        <CardDescription>Fee breakdown by holding</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticker</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Expense Ratio</TableHead>
              <TableHead className="text-right">Annual Fee</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((holding) => (
              <TableRow key={holding.ticker}>
                <TableCell className="font-medium">{holding.ticker}</TableCell>
                <TableCell className="max-w-48 truncate">{holding.name}</TableCell>
                <TableCell>
                  {holding.fundType === "Stock" ? (
                    <Badge variant="outline">Stock</Badge>
                  ) : (
                    <Badge variant={holding.expenseRatio && holding.expenseRatio > 0.5 ? "destructive" : "secondary"}>
                      {holding.fundType}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(holding.holdingValue)}</TableCell>
                <TableCell className="text-right">
                  {holding.expenseRatio !== null ? (
                    <span className={holding.expenseRatio > 0.5 ? "text-orange-500 font-medium" : ""}>
                      {holding.expenseRatio.toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {holding.annualFee > 0 ? (
                    <span className="text-orange-500">{formatCurrencyDetailed(holding.annualFee)}</span>
                  ) : (
                    <span className="text-green-500">$0.00</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/**
 * Fee Projection Chart
 */
function FeeProjectionChart({ projections }: { projections: FeeProjection[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Long-Term Fee Impact</CardTitle>
        <CardDescription>Portfolio growth with and without fees (7% expected return)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projections} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorWithoutFees" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorWithFees" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="year"
                tickFormatter={(year) => `Year ${year}`}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === "portfolioWithoutFees" ? "Without Fees" : 
                  name === "portfolioWithFees" ? "With Fees" : "Fees Lost"
                ]}
                labelFormatter={(year) => `Year ${year}`}
              />
              <Legend
                formatter={(value) => 
                  value === "portfolioWithoutFees" ? "Without Fees" : 
                  value === "portfolioWithFees" ? "With Fees" : "Cumulative Fees Lost"
                }
              />
              <Area
                type="monotone"
                dataKey="portfolioWithoutFees"
                stroke="#22c55e"
                fillOpacity={1}
                fill="url(#colorWithoutFees)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="portfolioWithFees"
                stroke="#f97316"
                fillOpacity={1}
                fill="url(#colorWithFees)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Fee loss summary */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          {projections.filter(p => [10, 20, 30].includes(p.year)).map((projection) => (
            <div key={projection.year} className="text-center">
              <div className="text-sm text-muted-foreground">Year {projection.year}</div>
              <div className="text-lg font-bold text-red-500">
                -{formatCurrency(projection.cumulativeFeesLost)}
              </div>
              <div className="text-xs text-muted-foreground">lost to fees</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Lower Cost Alternatives
 */
function AlternativesCard({ alternatives }: { alternatives: FeeAlternative[] }) {
  if (alternatives.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Lower-Cost Alternatives
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <span>Your portfolio is already optimized for low fees!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Lower-Cost Alternatives
        </CardTitle>
        <CardDescription>Consider these funds to reduce your fees</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alternatives.map((alt, index) => (
            <div key={index} className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">{alt.currentTicker}</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="default" className="font-mono">{alt.alternativeTicker}</Badge>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-500">
                    Save {formatCurrency(alt.annualSavings)}/year
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-muted-foreground">Switch to </span>
                  <span className="font-medium">{alt.alternativeName}</span>
                </div>
                <div className="text-muted-foreground">
                  {alt.currentExpenseRatio.toFixed(2)}% → {alt.alternativeExpenseRatio.toFixed(2)}%
                </div>
              </div>
              
              <div className="mt-2 text-xs text-muted-foreground">
                10-year savings: <span className="text-green-500 font-medium">{formatCurrency(alt.tenYearSavings)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main Fee Analyzer Component
 */
export function FeeAnalyzer() {
  const { data: analysis, isLoading, error } = useQuery<FeeAnalysis>({
    queryKey: ["/api/portfolio/fee-analysis"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
            <p>Unable to analyze portfolio fees</p>
            <p className="text-sm">Add holdings to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <FeeSummaryCard analysis={analysis} />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="alternatives">Alternatives</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <FeeProjectionChart projections={analysis.projections} />
        </TabsContent>

        <TabsContent value="holdings">
          <HoldingsFeeTable holdings={analysis.holdings} />
        </TabsContent>

        <TabsContent value="alternatives">
          <AlternativesCard alternatives={analysis.alternatives} />
        </TabsContent>
      </Tabs>

      {/* Warning for high fees */}
      {analysis.weightedAverageExpenseRatio > 0.5 && (
        <Card className="border-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-orange-500 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-orange-500">High Fee Warning</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Your portfolio's weighted average expense ratio of {analysis.weightedAverageExpenseRatio.toFixed(2)}% 
                  is above the recommended 0.50%. Consider switching to lower-cost index funds to save 
                  {formatCurrency(analysis.tenYearFeeCost)} over the next 10 years.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
