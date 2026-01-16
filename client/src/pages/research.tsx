import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, TrendingUp, TrendingDown, ExternalLink, DollarSign, BarChart3, TrendingUp as TrendingUpIcon, FileText } from "lucide-react";
import { SEO } from "@/components/seo";
import { StockChart } from "@/components/stock-chart";
import type { StockData, IndexData } from "@shared/schema";

interface FinancialData {
  overview: {
    currentPrice: number;
    marketCap: number;
    peRatio: number;
    volume: number;
    averageVolume: number;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
    dividendYield?: number;
    beta?: number;
  };
  earnings: {
    epsTTM: number;
    epsQuarterly: Array<{ quarter: string; eps: number; date: string }>;
    earningsHistory: Array<{ date: string; actual: number; estimate: number }>;
    earningsEstimates: { nextQuarter?: number; nextYear?: number };
  };
  revenue: {
    revenueTTM: number;
    revenueQuarterly: Array<{ quarter: string; revenue: number; date: string }>;
    revenueGrowth: { yoy?: number; qoq?: number };
  };
  growth: {
    revenueGrowthYoy: number;
    revenueGrowthQoq: number;
    earningsGrowthYoy: number;
    earningsGrowthQoq: number;
    profitMargin: number;
    profitMarginTTM: number;
  };
  financials: {
    balanceSheet: {
      totalAssets: number;
      totalLiabilities: number;
      totalEquity: number;
      cash: number;
      debt: number;
    };
    cashFlow: {
      operatingCashFlow: number;
      freeCashFlow: number;
      cashFlowTTM: number;
    };
    ratios: {
      roe: number;
      roa: number;
      debtToEquity: number;
      currentRatio: number;
      quickRatio: number;
    };
  };
}

function formatCurrency(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

type Timeframe = "1D" | "5D" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "5Y" | "MAX";

export default function Research() {
  const [searchQuery, setSearchQuery] = useState("");
  const [ticker, setTicker] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [selectedIndices, setSelectedIndices] = useState<string[]>([]);

  const { data: stockData, isLoading: stockLoading, error: stockError } = useQuery<StockData>({
    queryKey: ["/api/research/stock", ticker, timeframe],
    queryFn: async () => {
      if (!ticker) return null;
      const url = `/api/research/stock?query=${encodeURIComponent(ticker)}&timeframe=${timeframe}`;
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorText = await response.text();
        throw new Error(errorText || "Failed to fetch stock data");
      }
      return response.json();
    },
    enabled: !!ticker,
  });

  const { data: indexData, isLoading: indexLoading } = useQuery<IndexData[]>({
    queryKey: ["/api/research/indices", timeframe, selectedIndices.join(",")],
    queryFn: async () => {
      if (selectedIndices.length === 0) return [];
      const indicesParam = selectedIndices.join(",");
      const url = `/api/research/indices?timeframe=${timeframe}&indices=${encodeURIComponent(indicesParam)}`;
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to fetch index data");
      }
      return response.json();
    },
    enabled: selectedIndices.length > 0,
  });

  const { data: financialData, isLoading: financialLoading } = useQuery<FinancialData>({
    queryKey: ["/api/research/financials", ticker],
    queryFn: async () => {
      if (!ticker) return null;
      const url = `/api/research/financials?symbol=${encodeURIComponent(ticker)}`;
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorText = await response.text();
        throw new Error(errorText || "Failed to fetch financial data");
      }
      return response.json();
    },
    enabled: !!ticker,
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setTicker(searchQuery.trim().toUpperCase());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const toggleIndex = (indexSymbol: string) => {
    setSelectedIndices((prev) =>
      prev.includes(indexSymbol)
        ? prev.filter((s) => s !== indexSymbol)
        : [...prev, indexSymbol]
    );
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-research">
      <SEO
        title="Research"
        description="Research stocks by ticker symbol or company name. Compare performance against major indices."
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Stock Research
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Search for stocks and compare performance with major indices
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter ticker symbol or company name (e.g., AAPL, Apple)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={!searchQuery.trim()}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {stockData && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">
                    {stockData.ticker} - {stockData.name}
                  </CardTitle>
                  {stockData.sector && stockData.industry && (
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{stockData.sector}</Badge>
                      <Badge variant="outline">{stockData.industry}</Badge>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Current Price</p>
                  <p className="text-2xl font-bold tabular-nums">
                    ${stockData.currentPrice.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="timeframe-select" className="text-sm text-muted-foreground whitespace-nowrap">
                    Timeframe:
                  </label>
                  <Select value={timeframe} onValueChange={(value) => setTimeframe(value as Timeframe)}>
                    <SelectTrigger id="timeframe-select" className="w-[150px]">
                      <SelectValue placeholder="Select timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1D">1 Day</SelectItem>
                      <SelectItem value="5D">5 Days</SelectItem>
                      <SelectItem value="1M">1 Month</SelectItem>
                      <SelectItem value="3M">3 Months</SelectItem>
                      <SelectItem value="6M">6 Months</SelectItem>
                      <SelectItem value="YTD">YTD</SelectItem>
                      <SelectItem value="1Y">1 Year</SelectItem>
                      <SelectItem value="5Y">5 Years</SelectItem>
                      <SelectItem value="MAX">Max</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="text-sm text-muted-foreground">Compare with:</label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="spy"
                        checked={selectedIndices.includes("SPY")}
                        onCheckedChange={() => toggleIndex("SPY")}
                      />
                      <label
                        htmlFor="spy"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        S&P 500
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="dji"
                        checked={selectedIndices.includes("DJI")}
                        onCheckedChange={() => toggleIndex("DJI")}
                      />
                      <label
                        htmlFor="dji"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        DOW Jones
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ixic"
                        checked={selectedIndices.includes("IXIC")}
                        onCheckedChange={() => toggleIndex("IXIC")}
                      />
                      <label
                        htmlFor="ixic"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Nasdaq
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              {stockData && (
                <StockChart
                  stockData={stockData}
                  indexData={indexData || []}
                  timeframe={timeframe}
                  isLoading={stockLoading || indexLoading}
                />
              )}
            </CardContent>
          </Card>

          {/* Financial Data Tabs */}
          {financialData && (
            <Card>
              <CardHeader>
                <CardTitle>Financial Data</CardTitle>
                <CardDescription>Comprehensive financial information for {stockData.ticker}</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="earnings">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Earnings
                    </TabsTrigger>
                    <TabsTrigger value="growth">
                      <TrendingUpIcon className="h-4 w-4 mr-2" />
                      Growth
                    </TabsTrigger>
                    <TabsTrigger value="financials">
                      <FileText className="h-4 w-4 mr-2" />
                      Financials
                    </TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Market Cap</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold tabular-nums">
                            {formatCurrency(financialData.overview.marketCap)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>P/E Ratio</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold tabular-nums">
                            {financialData.overview.peRatio > 0 ? formatNumber(financialData.overview.peRatio) : "N/A"}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Volume</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold tabular-nums">
                            {formatCurrency(financialData.overview.volume)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>52W High</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold tabular-nums text-chart-1">
                            ${formatNumber(financialData.overview.fiftyTwoWeekHigh)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>52W Low</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold tabular-nums text-destructive">
                            ${formatNumber(financialData.overview.fiftyTwoWeekLow)}
                          </div>
                        </CardContent>
                      </Card>
                      {financialData.overview.dividendYield !== undefined && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardDescription>Dividend Yield</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold tabular-nums">
                              {formatPercent(financialData.overview.dividendYield)}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      {financialData.overview.beta !== undefined && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardDescription>Beta</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold tabular-nums">
                              {formatNumber(financialData.overview.beta)}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  {/* Earnings Tab */}
                  <TabsContent value="earnings" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader>
                          <CardDescription>EPS (TTM)</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold tabular-nums">
                            ${formatNumber(financialData.earnings.epsTTM)}
                          </div>
                        </CardContent>
                      </Card>
                      {financialData.earnings.earningsEstimates.nextQuarter !== undefined && (
                        <Card>
                          <CardHeader>
                            <CardDescription>Est. EPS (Next Q)</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold tabular-nums">
                              ${formatNumber(financialData.earnings.earningsEstimates.nextQuarter)}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      {financialData.earnings.earningsEstimates.nextYear !== undefined && (
                        <Card>
                          <CardHeader>
                            <CardDescription>Est. EPS (Next Y)</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold tabular-nums">
                              ${formatNumber(financialData.earnings.earningsEstimates.nextYear)}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Quarterly EPS</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Quarter</TableHead>
                              <TableHead className="text-right">EPS</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {financialData.earnings.epsQuarterly.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{item.quarter}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  ${formatNumber(item.eps)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    {financialData.earnings.earningsHistory.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Earnings History</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actual</TableHead>
                                <TableHead className="text-right">Estimate</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {financialData.earnings.earningsHistory.map((item, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>{item.date}</TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    ${formatNumber(item.actual)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    ${formatNumber(item.estimate)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Growth Tab */}
                  <TabsContent value="growth" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader>
                          <CardDescription>Revenue Growth (YoY)</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-2xl font-bold tabular-nums ${financialData.growth.revenueGrowthYoy >= 0 ? "text-chart-1" : "text-destructive"}`}>
                            {formatPercent(financialData.growth.revenueGrowthYoy)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardDescription>Revenue Growth (QoQ)</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-2xl font-bold tabular-nums ${financialData.growth.revenueGrowthQoq >= 0 ? "text-chart-1" : "text-destructive"}`}>
                            {formatPercent(financialData.growth.revenueGrowthQoq)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardDescription>Earnings Growth (YoY)</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-2xl font-bold tabular-nums ${financialData.growth.earningsGrowthYoy >= 0 ? "text-chart-1" : "text-destructive"}`}>
                            {formatPercent(financialData.growth.earningsGrowthYoy)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardDescription>Earnings Growth (QoQ)</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-2xl font-bold tabular-nums ${financialData.growth.earningsGrowthQoq >= 0 ? "text-chart-1" : "text-destructive"}`}>
                            {formatPercent(financialData.growth.earningsGrowthQoq)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardDescription>Profit Margin</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold tabular-nums">
                            {formatPercent(financialData.growth.profitMargin)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardDescription>Revenue (TTM)</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold tabular-nums">
                            {formatCurrency(financialData.revenue.revenueTTM)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Quarterly Revenue</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Quarter</TableHead>
                              <TableHead className="text-right">Revenue</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {financialData.revenue.revenueQuarterly.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{item.quarter}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatCurrency(item.revenue)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Financials Tab */}
                  <TabsContent value="financials" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Balance Sheet</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Assets</span>
                            <span className="font-semibold tabular-nums">{formatCurrency(financialData.financials.balanceSheet.totalAssets)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Liabilities</span>
                            <span className="font-semibold tabular-nums">{formatCurrency(financialData.financials.balanceSheet.totalLiabilities)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Equity</span>
                            <span className="font-semibold tabular-nums">{formatCurrency(financialData.financials.balanceSheet.totalEquity)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cash</span>
                            <span className="font-semibold tabular-nums">{formatCurrency(financialData.financials.balanceSheet.cash)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Debt</span>
                            <span className="font-semibold tabular-nums">{formatCurrency(financialData.financials.balanceSheet.debt)}</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Cash Flow</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Operating Cash Flow</span>
                            <span className="font-semibold tabular-nums">{formatCurrency(financialData.financials.cashFlow.operatingCashFlow)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Free Cash Flow</span>
                            <span className="font-semibold tabular-nums">{formatCurrency(financialData.financials.cashFlow.freeCashFlow)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cash Flow (TTM)</span>
                            <span className="font-semibold tabular-nums">{formatCurrency(financialData.financials.cashFlow.cashFlowTTM)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Financial Ratios</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">ROE</p>
                            <p className="text-xl font-bold tabular-nums">{formatPercent(financialData.financials.ratios.roe)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">ROA</p>
                            <p className="text-xl font-bold tabular-nums">{formatPercent(financialData.financials.ratios.roa)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Debt/Equity</p>
                            <p className="text-xl font-bold tabular-nums">{formatNumber(financialData.financials.ratios.debtToEquity)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Current Ratio</p>
                            <p className="text-xl font-bold tabular-nums">{formatNumber(financialData.financials.ratios.currentRatio)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Quick Ratio</p>
                            <p className="text-xl font-bold tabular-nums">{formatNumber(financialData.financials.ratios.quickRatio)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {ticker && financialLoading && (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center">
                  <p className="text-muted-foreground">Loading financial data...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!ticker && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Search for a Stock</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Enter a ticker symbol (e.g., AAPL, MSFT) or company name to view stock performance and compare with major indices.
            </p>
          </CardContent>
        </Card>
      )}

      {ticker && !stockLoading && !stockData && !stockError && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Stock Not Found</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Could not find stock data for "{ticker}". Please check the ticker symbol and try again. Available tickers: AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, JPM, JNJ
            </p>
          </CardContent>
        </Card>
      )}

      {stockError && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Error Loading Stock Data</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {stockError instanceof Error ? stockError.message : "An error occurred while fetching stock data."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
