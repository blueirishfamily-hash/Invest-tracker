import { useState } from "react";
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

export function HoldingsTable({ holdings, isLoading, timeframe }: HoldingsTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (!holdings || holdings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Holdings</CardTitle>
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

  // Limit to top 5 holdings for compact view
  const displayHoldings = holdings.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Holdings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticker</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">{timeframeLabels[timeframe]}</TableHead>
                <TableHead>Sector</TableHead>
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
                  />
                );
              })}
            </TableBody>
          </Table>
        </div>
        {holdings.length > 5 && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Showing top 5 of {holdings.length} holdings
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HoldingRow({ holding, isPositive, logoUrl }: { holding: Holding; isPositive: boolean; logoUrl: string }) {
  const [logoError, setLogoError] = useState(false);

  return (
    <TableRow key={holding.id} data-testid={`row-holding-${holding.ticker}`}>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded bg-primary/10 overflow-hidden shrink-0">
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
          <Badge variant="secondary" className="font-mono font-medium">
            {holding.ticker}
          </Badge>
        </div>
      </TableCell>
                    <TableCell className="font-medium">{holding.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {holding.quantity.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(holding.currentPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(holding.currentValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className={`flex items-center justify-end gap-1 ${
                          isPositive ? "text-chart-1" : "text-destructive"
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span className="tabular-nums font-medium">
                          {formatPercent(holding.growthRate30d)}
                        </span>
                      </div>
                    </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {holding.sector}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
