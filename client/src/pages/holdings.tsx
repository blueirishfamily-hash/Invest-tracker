import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import { Treemap, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { SEO } from "@/components/seo";
import type { Holding } from "@shared/schema";

type SortOption = "alphabetical" | "value" | "sector";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

// Helper function to get company logo URL via local proxy
function getCompanyLogoUrl(ticker: string, name: string): string {
  const encodedName = encodeURIComponent(name);
  return `/api/logo?ticker=${ticker}&name=${encodedName}`;
}

function HoldingCard({ holding }: { holding: Holding }) {
  const isPositive = holding.growthRate30d >= 0;
  const gainLoss = holding.currentValue - holding.costBasis;
  const gainLossPercent = ((gainLoss / holding.costBasis) * 100);

  const logoUrl = getCompanyLogoUrl(holding.ticker, holding.name);
  const [logoError, setLogoError] = useState(false);

  return (
    <Card className="hover-elevate" data-testid={`card-holding-${holding.ticker}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 gap-2">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
            {!logoError ? (
              <img
                src={logoUrl}
                alt={`${holding.name} logo`}
                className="h-full w-full object-contain p-1.5"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-primary font-mono font-bold text-sm">
                {holding.ticker.slice(0, 2)}
              </span>
            )}
          </div>
          <div>
            <Badge variant="secondary" className="font-mono font-semibold mb-1" data-testid={`badge-ticker-${holding.ticker}`}>
              {holding.ticker}
            </Badge>
            <p className="text-sm text-muted-foreground truncate max-w-[200px]" data-testid={`text-name-${holding.ticker}`}>
              {holding.name}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs shrink-0" data-testid={`badge-industry-${holding.ticker}`}>
          {holding.industry}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Current Value
            </p>
            <p className="text-lg font-semibold tabular-nums" data-testid={`text-value-${holding.ticker}`}>
              {formatCurrency(holding.currentValue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Cost Basis
            </p>
            <p className="text-lg font-semibold tabular-nums" data-testid={`text-cost-${holding.ticker}`}>
              {formatCurrency(holding.costBasis)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Gain/Loss</p>
            <p 
              className={`text-sm font-medium tabular-nums ${gainLoss >= 0 ? "text-chart-1" : "text-destructive"}`}
              data-testid={`text-gainloss-${holding.ticker}`}
            >
              {formatCurrency(gainLoss)} ({formatPercent(gainLossPercent)})
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">30D Change</p>
            <div 
              className={`flex items-center justify-end gap-1 ${isPositive ? "text-chart-1" : "text-destructive"}`}
              data-testid={`text-change-${holding.ticker}`}
            >
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="font-medium tabular-nums">
                {formatPercent(holding.growthRate30d)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Shares</span>
          <span className="font-medium tabular-nums" data-testid={`text-shares-${holding.ticker}`}>
            {holding.quantity}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Price/Share</span>
          <span className="font-medium tabular-nums" data-testid={`text-price-${holding.ticker}`}>
            {formatCurrency(holding.currentPrice)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function HoldingCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 gap-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
          <div>
            <div className="h-5 w-16 bg-muted animate-pulse rounded mb-1" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="h-5 w-20 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-12 bg-muted animate-pulse rounded" />
          <div className="h-12 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-12 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}

export default function Holdings() {
  const { data: holdings, isLoading } = useQuery<Holding[]>({
    queryKey: ["/api/holdings"],
  });

  const [sortOption, setSortOption] = useState<SortOption>("alphabetical");
  const [viewType, setViewType] = useState<"cards" | "wholeView">("cards");
  const [metric, setMetric] = useState<"performance" | "returns" | "percentage">("percentage");

  const sortedHoldings = useMemo(() => {
    if (!holdings) return [];

    const holdingsCopy = [...holdings];

    switch (sortOption) {
      case "alphabetical":
        return holdingsCopy.sort((a, b) => a.ticker.localeCompare(b.ticker));
      case "value":
        return holdingsCopy.sort((a, b) => b.currentValue - a.currentValue);
      case "sector":
        return holdingsCopy.sort((a, b) => {
          const sectorCompare = a.sector.localeCompare(b.sector);
          return sectorCompare !== 0
            ? sectorCompare
            : a.ticker.localeCompare(b.ticker);
        });
      default:
        return holdingsCopy;
    }
  }, [holdings, sortOption]);

  // Group holdings by sector when sorted by sector
  const groupedBySector = useMemo(() => {
    if (sortOption !== "sector" || !sortedHoldings) return null;

    const grouped = new Map<string, Holding[]>();
    sortedHoldings.forEach((holding) => {
      const sector = holding.sector;
      if (!grouped.has(sector)) {
        grouped.set(sector, []);
      }
      grouped.get(sector)!.push(holding);
    });

    return Array.from(grouped.entries())
      .map(([sector, holdings]) => ({ sector, holdings }))
      .sort((a, b) => a.sector.localeCompare(b.sector));
  }, [sortedHoldings, sortOption]);

  // Generate distinct colors for holdings (percentage mode)
  const generateDistinctColors = (count: number): string[] => {
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      const hue = (i * 360) / count; // Distribute evenly around hue circle
      colors.push(`hsl(${hue}, 65%, 55%)`);
    }
    return colors;
  };

  const getFallbackColor = (name: string): string => {
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `hsl(${hash % 360}, 65%, 55%)`;
  };

  // Calculate color intensity for returns/performance mode
  const getColorIntensity = (value: number, maxValue: number, isPositive: boolean): string => {
    if (maxValue === 0) {
      return isPositive ? "hsl(142, 65%, 55%)" : "hsl(0, 65%, 55%)";
    }
    const intensity = Math.abs(value) / maxValue; // 0 to 1
    // Darker colors for stronger values (lower lightness)
    // Stronger = 35-45% lightness, Weaker = 55-65% lightness
    const lightness = isPositive 
      ? 45 - (intensity * 20) // 25-45% for green (darker = stronger)
      : 45 - (intensity * 20); // Same for red (darker = stronger)
    
    const saturation = 65;
    return isPositive 
      ? `hsl(142, ${saturation}%, ${Math.max(25, Math.min(45, lightness))}%)`
      : `hsl(0, ${saturation}%, ${Math.max(25, Math.min(45, lightness))}%)`;
  };

  // Calculate treemap data based on selected metric
  const treemapData = useMemo(() => {
    if (!holdings || holdings.length === 0) return [];

    const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);

    const data = holdings.map((holding) => {
      let value: number;
      let actualValue: number;

      switch (metric) {
        case "performance":
          value = Math.abs(holding.growthRate30d);
          actualValue = holding.growthRate30d;
          break;
        case "returns":
          value = Math.abs(holding.currentValue - holding.costBasis);
          actualValue = holding.currentValue - holding.costBasis;
          break;
        case "percentage":
        default:
          value = totalPortfolioValue > 0 ? (holding.currentValue / totalPortfolioValue) * 100 : 0;
          actualValue = value;
          break;
      }

      return {
        name: holding.ticker,
        fullName: holding.name,
        value: Math.max(value, 0.01), // Minimum value to ensure visibility
        actualValue: Number(actualValue), // Ensure it's always a number
        holding,
      };
    });

    return data.filter(item => item.value > 0);
  }, [holdings, metric]);

  // Generate distinct colors for percentage mode
  const distinctColors = useMemo(() => {
    if (!treemapData || treemapData.length === 0) return [];
    return generateDistinctColors(treemapData.length);
  }, [treemapData]);

  // Calculate max absolute value for intensity-based coloring (performance/returns)
  const maxAbsValue = useMemo(() => {
    if (!treemapData || treemapData.length === 0) return 0;
    return Math.max(...treemapData.map(d => Math.abs(d.actualValue)));
  }, [treemapData]);

  const treemapLookup = useMemo(() => {
    const map = new Map<string, { holding: Holding; actualValue: number; color: string }>();
    treemapData.forEach((entry, index) => {
      const isPositive = entry.actualValue >= 0;
      const color = (metric === "performance" || metric === "returns")
        ? getColorIntensity(entry.actualValue, maxAbsValue, isPositive)
        : distinctColors[index] || getFallbackColor(entry.name);
      map.set(entry.name, { holding: entry.holding, actualValue: entry.actualValue, color });
    });
    return map;
  }, [treemapData, metric, distinctColors, maxAbsValue]);

  return (
    <div className="p-6 space-y-6" data-testid="page-holdings">
      <SEO 
        title="Holdings" 
        description="View detailed information about your investment positions including current value, cost basis, and performance." 
      />
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
            Holdings
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Detailed view of your investment positions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-sm text-muted-foreground whitespace-nowrap">
            Sort by:
          </label>
          <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
            <SelectTrigger id="sort-select" className="w-[200px]">
              <SelectValue placeholder="Select sort option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabetical">Alphabetical (A-Z)</SelectItem>
              <SelectItem value="value">Current Value (High to Low)</SelectItem>
              <SelectItem value="sector">Sector</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={viewType} onValueChange={(value) => setViewType(value as "cards" | "wholeView")}>
        <TabsList>
          <TabsTrigger value="cards">Cards View</TabsTrigger>
          <TabsTrigger value="wholeView">Whole View</TabsTrigger>
        </TabsList>

        <TabsContent value="cards">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="holdings-loading">
              {[...Array(6)].map((_, i) => (
                <HoldingCardSkeleton key={i} />
              ))}
            </div>
          ) : sortedHoldings && sortedHoldings.length > 0 ? (
            sortOption === "sector" && groupedBySector ? (
              <div className="space-y-6" data-testid="holdings-grouped">
                {groupedBySector.map((group) => (
                  <div key={group.sector}>
                    <h2 className="text-lg font-semibold mb-4 text-foreground">
                      {group.sector}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {group.holdings.map((holding) => (
                        <HoldingCard key={holding.id} holding={holding} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="holdings-grid">
                {sortedHoldings.map((holding) => (
                  <HoldingCard key={holding.id} holding={holding} />
                ))}
              </div>
            )
          ) : (
            <Card data-testid="holdings-empty">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Holdings Yet</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Your portfolio is currently empty. Connect your investment account or use demo mode to see your holdings.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="wholeView">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="h-[600px] flex items-center justify-center">
                  <div className="w-full h-full bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ) : holdings && holdings.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Portfolio Overview</CardTitle>
                  <div className="flex items-center gap-3">
                    <Label className="text-sm font-medium">Metric:</Label>
                    <ToggleGroup
                      type="single"
                      value={metric}
                      onValueChange={(value) => {
                        if (value === "performance" || value === "returns" || value === "percentage") {
                          setMetric(value);
                        }
                      }}
                      className="border rounded-md"
                    >
                      <ToggleGroupItem value="performance" aria-label="Performance" size="sm">
                        Performance
                      </ToggleGroupItem>
                      <ToggleGroupItem value="returns" aria-label="Returns" size="sm">
                        Returns
                      </ToggleGroupItem>
                      <ToggleGroupItem value="percentage" aria-label="Percentage of Portfolio" size="sm">
                        % of Portfolio
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Debug logging
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Treemap Debug:', {
                      treemapDataLength: treemapData.length,
                      treemapData: treemapData,
                      metric,
                      maxAbsValue,
                      distinctColorsLength: distinctColors.length,
                      holdingsLength: holdings?.length || 0
                    });
                  }
                  return null;
                })()}
                {treemapData.length === 0 ? (
                  <div className="h-[600px] flex items-center justify-center text-muted-foreground">
                    No data available for treemap visualization
                  </div>
                ) : (
                <div className="h-[600px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={treemapData}
                      dataKey="value"
                      nameKey="name"
                      aspectRatio={4 / 3}
                      stroke="#fff"
                      fill="#8884d8"
                      content={(props: any) => {
                        if (!props) return null;

                        const { x, y, width, height, payload, name } = props;

                        if (
                          typeof x !== "number" ||
                          typeof y !== "number" ||
                          typeof width !== "number" ||
                          typeof height !== "number" ||
                          width <= 0 ||
                          height <= 0
                        ) {
                          return null;
                        }

                        const payloadData = payload?.data || payload?.payload || payload || {};
                        const entryName =
                          name ||
                          payloadData?.name ||
                          payloadData?.ticker ||
                          payloadData?.holding?.ticker ||
                          "";

                        const entryFromData = entryName ? treemapLookup.get(entryName) : null;
                        const resolvedEntryName = entryFromData ? entryName : "";
                        const actualValue = entryFromData?.actualValue ?? payloadData?.value ?? 0;
                        const holding = entryFromData?.holding || payloadData?.holding || {};
                        const fillColor = entryFromData?.color || getFallbackColor(entryName || "holding");

                        const showLabels = width >= 40 && height >= 20;

                        let valueText = "";
                        if (showLabels) {
                          if (metric === "percentage") {
                            const percentage = actualValue?.toFixed(1) || "0.0";
                            const marketValue = holding?.currentValue
                              ? formatCurrency(holding.currentValue)
                              : "$0";
                            valueText = `${percentage}% • ${marketValue}`;
                          } else if (metric === "performance") {
                            valueText =
                              actualValue >= 0
                                ? `+${actualValue.toFixed(1)}%`
                                : `${actualValue.toFixed(1)}%`;
                          } else {
                            valueText = formatCurrency(actualValue);
                          }
                        }

                        return (
                          <g>
                            <rect
                              x={x}
                              y={y}
                              width={width}
                              height={height}
                              fill={fillColor}
                              stroke="#fff"
                            />
                            {resolvedEntryName && (
                              <>
                                <text
                                  x={x + width / 2}
                                  y={y + height / 2 - (showLabels ? 8 : 0)}
                                  textAnchor="middle"
                                  fill="#000000"
                                  fontSize={showLabels ? 12 : Math.max(8, Math.min(width / 8, 10))}
                                  fontWeight="bold"
                                  dominantBaseline="middle"
                                  stroke="none"
                                >
                                  {resolvedEntryName}
                                </text>
                                {showLabels && valueText && (
                                  <text
                                    x={x + width / 2}
                                    y={y + height / 2 + 8}
                                    textAnchor="middle"
                                    fill="#000000"
                                    fontSize={10}
                                    stroke="none"
                                  >
                                    {valueText}
                                  </text>
                                )}
                              </>
                            )}
                          </g>
                        );
                      }}
                    >
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        formatter={(value: number, payload: any) => {
                          const data = payload?.payload || payload;
                          if (!data || !data.holding) return [value, ""];
                          
                          const holding = data.holding;
                          const actualValue = data.actualValue || 0;
                          
                          let formattedValue: string;
                          switch (metric) {
                            case "performance":
                              formattedValue = `${actualValue >= 0 ? "+" : ""}${actualValue.toFixed(2)}%`;
                              break;
                            case "returns":
                              formattedValue = `${formatCurrency(actualValue)} (${formatPercent((actualValue / holding.costBasis) * 100)})`;
                              break;
                            case "percentage":
                            default:
                              formattedValue = `${actualValue.toFixed(2)}%`;
                              break;
                          }
                          
                          return [formattedValue, holding.name || holding.ticker];
                        }}
                        labelFormatter={(label) => `Ticker: ${label || ""}`}
                      />
                    </Treemap>
                  </ResponsiveContainer>
                </div>
                )}
                {treemapData.length > 0 && metric === "percentage" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {treemapData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: distinctColors[index] }} />
                      <span className="text-sm text-muted-foreground">{entry.name}</span>
                    </div>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card data-testid="holdings-empty">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Holdings Yet</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Your portfolio is currently empty. Connect your investment account or use demo mode to see your holdings.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
