import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import type { SectorAnalysis } from "@shared/schema";

interface IndustryChartProps {
  data: SectorAnalysis[] | undefined;
  isLoading: boolean;
  selectedSector: string | null;
  onSectorSelect: (sector: string | null) => void;
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

export function IndustryChart({ data, isLoading, selectedSector, onSectorSelect }: IndustryChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sector Distribution</CardTitle>
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
          <CardTitle>Sector Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            No sector data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find selected sector data
  const selectedSectorData = selectedSector
    ? data.find((sector) => sector.sector === selectedSector)
    : null;

  // Determine what to show: sectors or companies
  const showCompanies = selectedSector !== null && selectedSectorData !== null;

  // Prepare chart data
  let chartData: Array<{
    name: string;
    totalValue: number;
    percentage: number;
    color: string;
  }> = [];

  if (showCompanies && selectedSectorData) {
    // Show companies within selected sector
    const sectorColor = COLORS[data.findIndex((s) => s.sector === selectedSector) % COLORS.length];
    const companyColors = getColorShades(sectorColor, selectedSectorData.companies.length);
    
    chartData = selectedSectorData.companies.map((company, index) => ({
      name: company.name || company.ticker,
      totalValue: company.value,
      percentage: company.percentage,
      color: companyColors[index],
    }));
  } else {
    // Show sectors
    chartData = data.map((sector, index) => ({
      name: sector.sector,
      totalValue: sector.totalValue,
      percentage: sector.percentage,
      color: COLORS[index % COLORS.length],
    }));
  }

  // Handle sector click
  const handleSectorClick = (entry: any) => {
    if (!showCompanies) {
      // Clicking on a sector - drill down to companies
      onSectorSelect(entry.name);
    }
  };

  // Handle back button
  const handleBack = () => {
    onSectorSelect(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {showCompanies ? `Companies in ${selectedSector}` : "Sector Distribution"}
          </CardTitle>
          {showCompanies && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sectors
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
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
                activeIndex={hoveredIndex}
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
        </div>
        {!showCompanies && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Click on a sector to view companies within that sector
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function IndustryTable({ data, isLoading, selectedSector, onSectorSelect }: IndustryChartProps) {

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sector Breakdown</CardTitle>
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

  // Find selected sector data
  const selectedSectorData = selectedSector
    ? data.find((sector) => sector.sector === selectedSector)
    : null;

  const showCompanies = selectedSector !== null && selectedSectorData !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {showCompanies ? `Sector Breakdown: ${selectedSector}` : "Sector Breakdown"}
        </CardTitle>
        {showCompanies && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSectorSelect(null)}
            className="mt-2 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to All Sectors
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{showCompanies ? "Company" : "Sector"}</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">{showCompanies ? "Ticker" : "Holdings"}</TableHead>
              <TableHead className="text-right">Weight</TableHead>
              <TableHead className="text-right">Growth</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showCompanies && selectedSectorData ? (
              <>
                {/* Sector header row */}
                <TableRow
                  key={selectedSectorData.sector}
                  className="font-semibold bg-muted/50 cursor-pointer hover:bg-muted"
                  onClick={() => onSectorSelect(null)}
                >
                  <TableCell className="font-medium">{selectedSectorData.sector}</TableCell>
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
                      selectedSectorData.averageGrowth >= 0 ? "text-chart-1" : "text-destructive"
                    }`}
                  >
                    {selectedSectorData.averageGrowth >= 0 ? "+" : ""}
                    {selectedSectorData.averageGrowth.toFixed(2)}%
                  </TableCell>
                </TableRow>
                {/* Company rows - indented */}
                {selectedSectorData.companies.map((company, index) => (
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
                      {company.percentage.toFixed(1)}% of {selectedSectorData.sector}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        company.growth >= 0 ? "text-chart-1" : "text-destructive"
                      }`}
                    >
                      {company.growth >= 0 ? "+" : ""}
                      {company.growth.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ) : (
              // Show all sectors
              data.map((sector, index) => (
                <TableRow
                  key={sector.sector}
                  data-testid={`row-sector-${index}`}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSectorSelect(sector.sector)}
                >
                  <TableCell className="font-medium">{sector.sector}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(sector.totalValue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {sector.holdingsCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {sector.percentage.toFixed(1)}%
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${
                      sector.averageGrowth >= 0 ? "text-chart-1" : "text-destructive"
                    }`}
                  >
                    {sector.averageGrowth >= 0 ? "+" : ""}
                    {sector.averageGrowth.toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!showCompanies && (
          <p className="text-xs text-muted-foreground mt-4">
            Click on a sector row to view companies within that sector
          </p>
        )}
      </CardContent>
    </Card>
  );
}
