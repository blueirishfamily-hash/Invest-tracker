import { useState } from "react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { Holding } from "@shared/schema";

// Helper function to get company logo URL via local proxy
function getCompanyLogoUrl(ticker: string, name: string): string {
  const encodedName = encodeURIComponent(name);
  return `/api/logo?ticker=${ticker}&name=${encodedName}`;
}

type Timeframe = "1D" | "5D" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "5Y" | "MAX";

const timeframeLabels: Record<Timeframe, string> = {
  "1D": "1D Change",
  "5D": "5D Change",
  "1M": "1M Change",
  "3M": "3M Change",
  "6M": "6M Change",
  "YTD": "YTD Change",
  "1Y": "1Y Change",
  "5Y": "5Y Change",
  "MAX": "Max Change",
};

interface HoldingsTableProps {
  holdings: Holding[] | undefined;
  isLoading: boolean;
  timeframe: Timeframe;
  size?: "small" | "medium" | "large";
  sizeSelector?: ReactNode;
  cardClassName?: string;
}

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

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-10 w-16 bg-muted animate-pulse rounded" />
          <div className="h-10 flex-1 bg-muted animate-pulse rounded" />
          <div className="h-10 w-20 bg-muted animate-pulse rounded" />
          <div className="h-10 w-24 bg-muted animate-pulse rounded" />
          <div className="h-10 w-24 bg-muted animate-pulse rounded" />
          <div className="h-10 w-20 bg-muted animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

export function HoldingsTable({ holdings, isLoading, timeframe, size = "medium", sizeSelector, cardClassName }: HoldingsTableProps) {
  const rowLimit = size === "small" ? 3 : size === "large" ? 8 : 5;
  const showName = size !== "small";
  const showQuantity = size === "large";
  const showPrice = size !== "small";
  const showSector = size === "large";

  if (isLoading) {
    return (
      <Card className={cardClassName}>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Portfolio Holdings</CardTitle>
          {sizeSelector}
        </CardHeader>
        <CardContent>
          <TableSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (!holdings || holdings.length === 0) {
    return (
      <Card className={cardClassName}>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Portfolio Holdings</CardTitle>
          {sizeSelector}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Holdings Yet</h3>
            <p className="text-muted-foreground max-w-sm">
              Connect your investment account or enter demo mode to view your portfolio.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedHoldings = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
  const displayHoldings = sortedHoldings.slice(0, rowLimit);

  return (
    <Card className={cardClassName}>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Portfolio Holdings</CardTitle>
        {sizeSelector}
      </CardHeader>
      <CardContent>
        {size === "small" ? (
          <div className="space-y-2">
            {displayHoldings.map((holding) => {
              const isPositive = holding.growthRate30d >= 0;
              const logoUrl = getCompanyLogoUrl(holding.ticker, holding.name);
              return (
                <div
                  key={holding.id}
                  className="flex items-center justify-between rounded-lg bg-muted/30 p-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative flex items-center justify-center rounded bg-primary/10 overflow-hidden shrink-0 h-7 w-7">
                      <img
                        src={logoUrl}
                        alt={`${holding.name} logo`}
                        className="h-full w-full object-contain p-1"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold font-mono truncate">{holding.ticker}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{holding.name}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <div className="text-xs font-semibold tabular-nums">{formatCurrency(holding.currentValue)}</div>
                    <div className={`text-[10px] tabular-nums ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {formatPercent(holding.growthRate30d)}
                    </div>
                  </div>
                </div>
              );
            })}
            {sortedHoldings.length > rowLimit && (
              <div className="pt-1 text-center text-[10px] text-muted-foreground">
                Top {rowLimit} by value (of {sortedHoldings.length})
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    {showName && <TableHead>Name</TableHead>}
                    {showQuantity && <TableHead className="text-right">Quantity</TableHead>}
                    {showPrice && <TableHead className="text-right">Price</TableHead>}
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">{timeframeLabels[timeframe]}</TableHead>
                    {showSector && <TableHead>Sector</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayHoldings.map((holding) => {
                    const isPositive = holding.growthRate30d >= 0;
                    const logoUrl = getCompanyLogoUrl(holding.ticker, holding.name);
                    return (
                      <HoldingRow 
                        key={holding.id} 
                        holding={holding} 
                        isPositive={isPositive}
                        logoUrl={logoUrl}
                        size={size}
                        showName={showName}
                        showQuantity={showQuantity}
                        showPrice={showPrice}
                        showSector={showSector}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {sortedHoldings.length > rowLimit && (
              <div className={`mt-4 text-center text-muted-foreground ${size === "medium" ? "text-sm" : "text-sm"}`}>
                Showing top {rowLimit} of {sortedHoldings.length} holdings
              </div>
            )}
            {size === "large" && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Displayed value</div>
                  <div className="text-lg font-bold tabular-nums">
                    {formatCurrency(displayHoldings.reduce((sum, h) => sum + h.currentValue, 0))}
                  </div>
                </div>
                <div className="rounded-lg bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Total holdings value</div>
                  <div className="text-lg font-bold tabular-nums">
                    {formatCurrency(sortedHoldings.reduce((sum, h) => sum + h.currentValue, 0))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function HoldingRow({
  holding,
  isPositive,
  logoUrl,
  size,
  showName,
  showQuantity,
  showPrice,
  showSector,
}: {
  holding: Holding;
  isPositive: boolean;
  logoUrl: string;
  size: "small" | "medium" | "large";
  showName: boolean;
  showQuantity: boolean;
  showPrice: boolean;
  showSector: boolean;
}) {
  const [logoError, setLogoError] = useState(false);

  return (
    <TableRow key={holding.id} data-testid={`row-holding-${holding.ticker}`}>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className={`relative flex items-center justify-center rounded bg-primary/10 overflow-hidden shrink-0 ${size === "small" ? "h-6 w-6" : "h-8 w-8"}`}>
            {!logoError ? (
              <img
                src={logoUrl}
                alt={`${holding.name} logo`}
                className="h-full w-full object-contain p-1"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-primary font-mono font-bold text-xs">
                {holding.ticker.slice(0, 2)}
              </span>
            )}
          </div>
          <Badge variant="secondary" className={`font-mono font-medium ${size === "small" ? "text-[10px]" : "text-xs"}`}>
            {holding.ticker}
          </Badge>
        </div>
      </TableCell>
      {showName && <TableCell className="font-medium">{holding.name}</TableCell>}
      {showQuantity && (
        <TableCell className="text-right tabular-nums">
          {holding.quantity.toFixed(2)}
        </TableCell>
      )}
      {showPrice && (
        <TableCell className="text-right tabular-nums">
          {formatCurrency(holding.currentPrice)}
        </TableCell>
      )}
      <TableCell className="text-right tabular-nums font-medium">
        {formatCurrency(holding.currentValue)}
      </TableCell>
      <TableCell className="text-right">
        <div
          className={`flex items-center justify-end gap-1 ${
            isPositive ? "text-chart-1" : "text-destructive"
          }`}
        >
          {size !== "small" && (isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          ))}
          <span className="tabular-nums font-medium">
            {formatPercent(holding.growthRate30d)}
          </span>
        </div>
      </TableCell>
      {showSector && (
        <TableCell>
          <Badge variant="outline" className="text-xs">
            {holding.sector}
          </Badge>
        </TableCell>
      )}
    </TableRow>
  );
}
