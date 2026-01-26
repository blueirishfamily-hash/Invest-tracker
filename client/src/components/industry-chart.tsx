import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import type { SectorAnalysis, BreakdownAnalysis } from "@shared/schema";

interface IndustryChartProps {
  data: SectorAnalysis[] | BreakdownAnalysis[] | undefined;
  isLoading: boolean;
  selectedSector: string | null;
  onSectorSelect: (sector: string | null) => void;
  breakdownType?: "sector" | "account" | "currency" | "region" | "assetType";
  isExpanded?: boolean;
  onExpandClick?: () => void;
  timeframe?: string;
}

// Sector/category differentiation palette (intentionally colorful; exempt from base theme).
// Avoids theme `--chart-*` tokens so it won’t collapse into grayscale.
// Also avoids the app’s semantic trend colors (green/red) to reduce confusion.
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

/**
 * Generate lighter/darker shades of a color for company segments
 */
function getColorShades(baseColor: string, count: number): string[] {
  // Simple approach: return base color variations
  // For better implementation, you could parse HSL and adjust lightness
  return Array.from({ length: count }, (_, i) => {
    // Use different colors from palette
    return COLORS[(i + 1) % COLORS.length];
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function ChartSkeleton() {
  return (
    <div className="h-[350px] flex items-center justify-center">
      <div className="w-64 h-64 rounded-full bg-muted animate-pulse" />
    </div>
  );
}

// Helper function to get breakdown type title
function getBreakdownTypeTitle(type?: "sector" | "account" | "currency" | "region" | "assetType"): string {
  switch (type) {
    case "account":
      return "Account Distribution";
    case "currency":
      return "Currency Distribution";
    case "region":
      return "Region Distribution";
    case "assetType":
      return "Asset Type Distribution";
    default:
      return "Sector Distribution";
  }
}

// Helper function to get category name from breakdown data
function getCategoryName(item: SectorAnalysis | BreakdownAnalysis): string {
  if ("sector" in item) {
    return item.sector;
  }
  return item.category;
}

// Helper function to get items from breakdown data
function getItems(item: SectorAnalysis | BreakdownAnalysis): Array<{ ticker: string; name: string; value: number; percentage: number; growth: number }> {
  if ("companies" in item) {
    return item.companies.map(c => ({ ...c, percentage: c.percentage }));
  }
  return item.items;
}

export function IndustryChart({ data, isLoading, selectedSector, onSectorSelect, breakdownType = "sector", isExpanded, onExpandClick, timeframe = "1M" }: IndustryChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const title = getBreakdownTypeTitle(breakdownType);

  // Fetch historical distribution data when expanded
  const { data: historicalDistribution, isLoading: historicalLoading } = useQuery<Array<{
    date: string;
    categories: Record<string, number>;
  }>>({
    queryKey: ["/api/analysis/historical-distribution", breakdownType, timeframe],
    enabled: isExpanded === true && !!breakdownType,
    queryFn: async () => {
      const params = new URLSearchParams({
        type: breakdownType || "sector",
        timeframe: timeframe,
      });
      const response = await fetch(`/api/analysis/historical-distribution?${params}`);
      if (!response.ok) throw new Error("Failed to fetch historical distribution");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            No {breakdownType} data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find selected category data
  const selectedSectorData = selectedSector
    ? data.find((item) => getCategoryName(item) === selectedSector)
    : null;

  // Determine what to show: categories or items
  const showCompanies = selectedSector !== null && selectedSectorData !== null;

  // Prepare chart data
  let chartData: Array<{
    name: string;
    totalValue: number;
    percentage: number;
    color: string;
  }> = [];

  if (showCompanies && selectedSectorData) {
    // Show items within selected category
    const categoryColor = COLORS[data.findIndex((item) => getCategoryName(item) === selectedSector) % COLORS.length];
    const items = getItems(selectedSectorData);
    const itemColors = getColorShades(categoryColor, items.length);
    
    chartData = items.map((item, index) => ({
      name: item.name || item.ticker,
      totalValue: item.value,
      percentage: item.percentage,
      color: itemColors[index],
    }));
  } else {
    // Show categories
    chartData = data.map((item, index) => ({
      name: getCategoryName(item),
      totalValue: item.totalValue,
      percentage: item.percentage,
      color: COLORS[index % COLORS.length],
    }));
  }

  // Handle category click
  const handleSectorClick = (entry: any) => {
    if (!showCompanies) {
      // Clicking on a category - drill down to items
      onSectorSelect(entry.name);
    }
  };

  // Handle back button
  const handleBack = () => {
    onSectorSelect(null);
  };

  const backButtonText = breakdownType === "sector" ? "Back to Sectors" : `Back to ${title.replace(" Distribution", "")}`;
  const categoryLabel = breakdownType === "sector" ? "Sector" : breakdownType === "account" ? "Account" : breakdownType === "currency" ? "Currency" : breakdownType === "region" ? "Region" : "Asset Type";

  return (
    <Card className={onExpandClick ? "cursor-pointer" : ""} onClick={onExpandClick}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {showCompanies ? `${categoryLabel === "Account" ? "Holdings in" : categoryLabel === "Currency" ? "Holdings in" : categoryLabel === "Region" ? "Holdings in" : categoryLabel === "Asset Type" ? "Holdings in" : "Companies in"} ${selectedSector}` : title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {showCompanies && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBack();
                }}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {backButtonText}
              </Button>
            )}
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
        <div className="h-[350px]">
          {isExpanded ? (
            historicalLoading ? (
              <ChartSkeleton />
            ) : historicalDistribution && historicalDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={historicalDistribution.map(item => ({
                    date: item.date,
                    ...item.categories,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(value) => `${value}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="square"
                    formatter={(value) => (
                      <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>
                    )}
                  />
                  {historicalDistribution.length > 0 && Object.keys(historicalDistribution[0].categories).map((category, index) => (
                    <Bar
                      key={category}
                      dataKey={category}
                      stackId="a"
                      fill={COLORS[index % COLORS.length]}
                      name={category}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No historical distribution data available
              </div>
            )
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="totalValue"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  innerRadius={60}
                  paddingAngle={2}
                  onClick={handleSectorClick}
                  activeIndex={hoveredIndex ?? undefined}
                  activeShape={(props: any) => {
                    // Only show expanded shape on hover, not on click
                    if (hoveredIndex === null || showCompanies) {
                      return <Sector {...props} stroke="none" strokeWidth={0} />;
                    }
                    // Return expanded shape for hover
                    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                    return (
                      <Sector
                        cx={cx}
                        cy={cy}
                        innerRadius={innerRadius}
                        outerRadius={outerRadius + 10}
                        startAngle={startAngle}
                        endAngle={endAngle}
                        fill={fill}
                        stroke="none"
                        strokeWidth={0}
                      />
                    );
                  }}
                  onMouseEnter={(_, index) => {
                    if (!showCompanies) {
                      setHoveredIndex(index);
                    }
                  }}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{ cursor: showCompanies ? "default" : "pointer" }}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number, name: string, props: any) => [
                    formatCurrency(value),
                    `${name} (${props.payload.percentage.toFixed(1)}%)`,
                  ]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => (
                    <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        {!showCompanies && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Click on a {categoryLabel.toLowerCase()} to view holdings within that {categoryLabel.toLowerCase()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function IndustryTable({ data, isLoading, selectedSector, onSectorSelect, breakdownType = "sector" }: IndustryChartProps) {
  const title = getBreakdownTypeTitle(breakdownType);
  const categoryLabel =
    breakdownType === "sector"
      ? "Sector"
      : breakdownType === "account"
        ? "Account"
        : breakdownType === "currency"
          ? "Currency"
          : breakdownType === "region"
            ? "Region"
            : breakdownType === "assetType"
              ? "Asset Type"
              : "Sector";

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title.replace(" Distribution", " Breakdown")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Find selected category data
  const selectedSectorData = selectedSector
    ? data.find((item) => getCategoryName(item) === selectedSector)
    : null;

  const showCompanies = selectedSector !== null && selectedSectorData !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {showCompanies ? `${categoryLabel} Breakdown: ${selectedSector}` : `${categoryLabel} Breakdown`}
        </CardTitle>
        {showCompanies && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSectorSelect(null)}
            className="mt-2 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to All {categoryLabel}s
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{showCompanies ? "Holding" : categoryLabel}</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">{showCompanies ? "Ticker" : "Holdings"}</TableHead>
              <TableHead className="text-right">Weight</TableHead>
              <TableHead className="text-right">Growth</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showCompanies && selectedSectorData ? (
              <>
                {/* Category header row */}
                <TableRow
                  key={getCategoryName(selectedSectorData)}
                  className="font-semibold bg-muted/50 cursor-pointer hover:bg-muted"
                  onClick={() => onSectorSelect(null)}
                >
                  <TableCell className="font-medium">{getCategoryName(selectedSectorData)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(selectedSectorData.totalValue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {selectedSectorData.holdingsCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {selectedSectorData.percentage.toFixed(1)}% of portfolio
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${
                      selectedSectorData.averageGrowth >= 0 ? "text-positive" : "text-destructive"
                    }`}
                  >
                    {selectedSectorData.averageGrowth >= 0 ? "+" : ""}
                    {selectedSectorData.averageGrowth.toFixed(2)}%
                  </TableCell>
                </TableRow>
                {/* Item rows - indented */}
                {getItems(selectedSectorData).map((company, index) => (
                  <TableRow
                    key={company.ticker}
                    className="cursor-default"
                    data-testid={`row-company-${index}`}
                  >
                    <TableCell className="pl-8 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">└─</span>
                        <span>{company.name || company.ticker}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(company.value)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {company.ticker}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {company.percentage.toFixed(1)}% of {getCategoryName(selectedSectorData)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        company.growth >= 0 ? "text-positive" : "text-destructive"
                      }`}
                    >
                      {company.growth >= 0 ? "+" : ""}
                      {company.growth.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ) : (
              // Show all categories
              data.map((item, index) => (
                <TableRow
                  key={getCategoryName(item)}
                  data-testid={`row-${breakdownType}-${index}`}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSectorSelect(getCategoryName(item))}
                >
                  <TableCell className="font-medium">{getCategoryName(item)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(item.totalValue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.holdingsCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.percentage.toFixed(1)}%
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${
                      item.averageGrowth >= 0 ? "text-positive" : "text-destructive"
                    }`}
                  >
                    {item.averageGrowth >= 0 ? "+" : ""}
                    {item.averageGrowth.toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!showCompanies && (
          <p className="text-xs text-muted-foreground mt-4">
            Click on a {categoryLabel.toLowerCase()} row to view holdings within that {categoryLabel.toLowerCase()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
