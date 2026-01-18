import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { IndustryChart, IndustryTable } from "@/components/industry-chart";
import { BenchmarkChart } from "@/components/benchmark-chart";
import { FeeAnalyzer } from "@/components/fee-analyzer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TrendingUp, TrendingDown, Target, AlertCircle, Maximize2, Minimize2, ChevronDown, ChevronUp, PieChart, DollarSign } from "lucide-react";
import { SEO } from "@/components/seo";
import type { SectorAnalysis, BreakdownAnalysis, PortfolioMetrics } from "@shared/schema";

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function Analysis() {
  const [selectedBreakdownType, setSelectedBreakdownType] = useState<"sector" | "account" | "currency" | "region" | "assetType">("sector");
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("1M");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [returnType, setReturnType] = useState<"TWR" | "MWR">("TWR");
  
  // Fetch data based on breakdown type
  const { data: sectors, isLoading: sectorsLoading } = useQuery<SectorAnalysis[]>({
    queryKey: ["/api/sector-analysis"],
    enabled: selectedBreakdownType === "sector",
  });

  const { data: breakdownData, isLoading: breakdownLoading } = useQuery<BreakdownAnalysis[]>({
    queryKey: [`/api/analysis/${selectedBreakdownType}`],
    enabled: selectedBreakdownType !== "sector",
  });

  // Use sector data or breakdown data based on selected type
  const currentData = selectedBreakdownType === "sector" ? sectors : breakdownData;
  const isLoadingBreakdown = selectedBreakdownType === "sector" ? sectorsLoading : breakdownLoading;

  // Fetch category performance data
  const { data: categoryPerformance, isLoading: categoryPerformanceLoading } = useQuery<Array<{
    category: string;
    data: Array<{ date: string; value: number }>;
  }>>({
    queryKey: ["/api/analysis/category-performance", selectedBreakdownType, selectedCategories, selectedTimeframe, returnType],
    enabled: selectedCategories.length > 0,
    queryFn: async () => {
      const params = new URLSearchParams({
        type: selectedBreakdownType,
        categories: selectedCategories.join(","),
        timeframe: selectedTimeframe,
        returnType: returnType,
      });
      const response = await fetch(`/api/analysis/category-performance?${params}`);
      if (!response.ok) throw new Error("Failed to fetch category performance");
      return response.json();
    },
  });

  const [expandedView, setExpandedView] = useState<"distribution" | "performance" | null>(null);
  const [categorySelectionExpanded, setCategorySelectionExpanded] = useState(true);

  // Update selected categories when breakdown data changes - select all by default
  useEffect(() => {
    if (currentData && currentData.length > 0 && selectedCategories.length === 0) {
      // Auto-select all categories by default
      const allCategories = currentData
        .map(item => "sector" in item ? item.sector : item.category);
      setSelectedCategories(allCategories);
    }
  }, [currentData, selectedCategories.length]);

  const { data: metrics, isLoading: metricsLoading } = useQuery<PortfolioMetrics>({
    queryKey: ["/api/portfolio/metrics"],
  });

  const isLoading = isLoadingBreakdown || metricsLoading;

  // Helper function to get category name from data
  const getCategoryName = (item: SectorAnalysis | BreakdownAnalysis): string => {
    if ("sector" in item) return item.sector;
    return item.category;
  };

  const topPerformer = currentData && currentData.length > 0 ? currentData.reduce((prev, current) => 
    current.averageGrowth > prev.averageGrowth ? current : prev
  , currentData[0]) : null;

  const bottomPerformer = currentData && currentData.length > 0 ? currentData.reduce((prev, current) => 
    current.averageGrowth < prev.averageGrowth ? current : prev
  , currentData[0]) : null;

  const mostConcentrated = currentData && currentData.length > 0 ? currentData.reduce((prev, current) => 
    current.percentage > prev.percentage ? current : prev
  , currentData[0]) : null;

  const categoryLabel = selectedBreakdownType === "sector" ? "Sector" : 
    selectedBreakdownType === "account" ? "Account" :
    selectedBreakdownType === "currency" ? "Currency" :
    selectedBreakdownType === "region" ? "Region" : "Asset Type";

  // Generate calendar year options (last 5 completed years, oldest to newest)
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  // If we're not in December yet, the current year is not complete
  const lastCompletedYear = currentMonth === 11 ? currentYear : currentYear - 1;
  const calendarYears = Array.from({ length: 5 }, (_, i) => lastCompletedYear - (4 - i));

  // Timeframe options
  const timeframeOptions = [
    { value: "1D", label: "1 Day" },
    { value: "1W", label: "1 Week" },
    { value: "1M", label: "1 Month" },
    { value: "3M", label: "3 Months" },
    { value: "6M", label: "6 Months" },
    { value: "1Y", label: "1 Year" },
    { value: "3Y", label: "3 Years" },
    { value: "5Y", label: "5 Years" },
    { value: "MAX", label: "Max" },
    ...calendarYears.map(year => ({ value: year.toString(), label: year.toString() })),
  ];

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-analysis">
      <SEO 
        title="Analysis" 
        description="Deep dive into your portfolio performance with sector allocation and performance insights." 
      />
      
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Portfolio Analysis
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Deep dive into your portfolio performance, allocation, and fees
        </p>
      </div>

      <Tabs defaultValue="breakdown" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="breakdown" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Breakdown
          </TabsTrigger>
          <TabsTrigger value="fees" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Fees
          </TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-top-performer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Performer
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-1" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-10 bg-muted animate-pulse rounded" />
            ) : topPerformer ? (
              <>
                <div className="text-lg font-semibold truncate" data-testid="text-top-performer-name">
                  {getCategoryName(topPerformer)}
                </div>
                <p className="text-chart-1 text-sm font-medium tabular-nums" data-testid="text-top-performer-growth">
                  {formatPercent(topPerformer.averageGrowth)}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-bottom-performer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bottom Performer
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-10 bg-muted animate-pulse rounded" />
            ) : bottomPerformer ? (
              <>
                <div className="text-lg font-semibold truncate" data-testid="text-bottom-performer-name">
                  {getCategoryName(bottomPerformer)}
                </div>
                <p 
                  className={`text-sm font-medium tabular-nums ${bottomPerformer.averageGrowth >= 0 ? "text-chart-1" : "text-destructive"}`}
                  data-testid="text-bottom-performer-growth"
                >
                  {formatPercent(bottomPerformer.averageGrowth)}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-largest-position">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Largest Position
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-10 bg-muted animate-pulse rounded" />
            ) : mostConcentrated ? (
              <>
                <div className="text-lg font-semibold truncate" data-testid="text-largest-position-name">
                  {getCategoryName(mostConcentrated)}
                </div>
                <p className="text-muted-foreground text-sm tabular-nums" data-testid="text-largest-position-percent">
                  {mostConcentrated.percentage.toFixed(1)}% of portfolio
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-diversification">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Diversification
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-10 bg-muted animate-pulse rounded" />
            ) : currentData ? (
              <>
                <div className="text-lg font-semibold" data-testid="text-sector-count">
                  {currentData.length} {categoryLabel}{currentData.length !== 1 ? "s" : ""}
                </div>
                <p className="text-muted-foreground text-sm" data-testid="text-diversification-status">
                  {currentData.length >= 5 ? "Well diversified" : "Consider diversifying"}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeframe Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {timeframeOptions.map(option => (
                <Button
                  key={option.value}
                  variant={selectedTimeframe === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTimeframe(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium">Return Type:</Label>
              <ToggleGroup
                type="single"
                value={returnType}
                onValueChange={(value) => {
                  if (value === "TWR" || value === "MWR") {
                    setReturnType(value);
                  }
                }}
                className="border rounded-md"
              >
                <ToggleGroupItem value="TWR" aria-label="Time-Weighted Return" size="sm">
                  TWR
                </ToggleGroupItem>
                <ToggleGroupItem value="MWR" aria-label="Money-Weighted Return" size="sm">
                  MWR
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Selection and Chart - Expandable */}
      <div className={`grid gap-6 ${expandedView === "distribution" ? "grid-cols-1" : expandedView === "performance" ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-2"}`}>
        <div 
          className={`transition-all ${expandedView === "distribution" ? "col-span-1" : expandedView === "performance" ? "hidden" : ""}`}
        >
          <IndustryChart 
            data={currentData as SectorAnalysis[] | BreakdownAnalysis[]} 
            isLoading={isLoadingBreakdown}
            selectedSector={selectedSector}
            onSectorSelect={setSelectedSector}
            breakdownType={selectedBreakdownType}
            isExpanded={expandedView === "distribution"}
            onExpandClick={() => setExpandedView(expandedView === "distribution" ? null : "distribution")}
            timeframe={selectedTimeframe}
          />
        </div>
        
        <div
          className={`transition-all ${expandedView === "performance" ? "col-span-1" : expandedView === "distribution" ? "hidden" : ""}`}
        >
          {currentData && currentData.length > 0 ? (
            <Card
              className={expandedView === "performance" ? "cursor-pointer" : ""}
              onClick={() => setExpandedView(expandedView === "performance" ? null : "performance")}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{categoryLabel} Performance</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedView(expandedView === "performance" ? null : "performance");
                    }}
                  >
                    {expandedView === "performance" ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                <CardDescription>Select categories to compare performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => setCategorySelectionExpanded(!categorySelectionExpanded)}
                  >
                    <span>Select {categoryLabel}s</span>
                    {categorySelectionExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  {categorySelectionExpanded && (
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                      {currentData.map((item) => {
                        const categoryName = "sector" in item ? item.sector : item.category;
                        return (
                          <div key={categoryName} className="flex items-center space-x-2">
                            <Checkbox
                              id={`category-${categoryName}`}
                              checked={selectedCategories.includes(categoryName)}
                              onCheckedChange={() => handleCategoryToggle(categoryName)}
                            />
                            <Label
                              htmlFor={`category-${categoryName}`}
                              className="text-sm font-normal cursor-pointer flex-1"
                            >
                              {categoryName} ({item.percentage.toFixed(1)}%)
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <BenchmarkChart 
                    categoryData={categoryPerformance}
                    isLoading={categoryPerformanceLoading}
                    timeframe={selectedTimeframe}
                    title=""
                    noCard={true}
                    returnType={returnType}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Breakdown Tabs - Above Table Only */}
      <Tabs value={selectedBreakdownType} onValueChange={(value) => {
        setSelectedBreakdownType(value as "sector" | "account" | "currency" | "region" | "assetType");
        setSelectedSector(null); // Reset selection when switching tabs
        setSelectedCategories([]); // Reset category selection to trigger auto-select all
        // Keep expanded view state when switching tabs
      }}>
        <TabsList className="mb-4">
          <TabsTrigger value="sector">Sector</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="currency">Currency</TabsTrigger>
          <TabsTrigger value="region">Region</TabsTrigger>
          <TabsTrigger value="assetType">Asset Type</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedBreakdownType}>
          <IndustryTable 
            data={currentData as SectorAnalysis[] | BreakdownAnalysis[]} 
            isLoading={isLoadingBreakdown}
            selectedSector={selectedSector}
            onSectorSelect={setSelectedSector}
            breakdownType={selectedBreakdownType}
          />
        </TabsContent>
      </Tabs>

      <Card data-testid="card-insights">
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
          <CardDescription>Key observations about your portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {mostConcentrated && mostConcentrated.percentage > 30 && (
                <div className="p-4 rounded-lg bg-chart-4/10 border border-chart-4/20" data-testid="insight-concentration">
                  <h4 className="font-medium mb-1 text-chart-4">Concentration Risk</h4>
                  <p className="text-sm text-muted-foreground">
                    {getCategoryName(mostConcentrated)} represents {mostConcentrated.percentage.toFixed(1)}% of your portfolio.
                    Consider rebalancing to reduce concentration risk.
                  </p>
                </div>
              )}

              {currentData && currentData.length < 4 && (
                <div className="p-4 rounded-lg bg-muted/50" data-testid="insight-diversification">
                  <h4 className="font-medium mb-1">Diversification Opportunity</h4>
                  <p className="text-sm text-muted-foreground">
                    Your portfolio spans only {currentData.length} {categoryLabel.toLowerCase()}{currentData.length !== 1 ? "s" : ""}. 
                    Adding exposure to more {categoryLabel.toLowerCase()}{categoryLabel.toLowerCase() !== "sectors" ? "s" : ""} could help reduce overall portfolio volatility.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="fees">
          <FeeAnalyzer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
