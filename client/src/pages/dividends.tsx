import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SEO } from "@/components/seo";
import { Loader2, DollarSign, Calendar, TrendingUp, AlertCircle } from "lucide-react";

interface DividendSchedule {
  ticker: string;
  name: string;
  quantity: number;
  paymentDate: string;
  amountPerShare: number;
  totalAmount: number;
  frequency: string;
  yield: number;
  exDividendDate?: string;
}

interface DividendScheduleResponse {
  schedule: DividendSchedule[];
  totalEstimated: number;
  year: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export default function Dividends() {
  const [sortField, setSortField] = useState<"date" | "ticker" | "amount">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const { data, isLoading, error } = useQuery<DividendScheduleResponse>({
    queryKey: ["/api/dividends/schedule"],
  });

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!data || !data.schedule) {
      return {
        totalEstimated: 0,
        upcomingThisMonth: 0,
        averageMonthly: 0,
        count: 0,
      };
    }

    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const upcomingThisMonth = data.schedule
      .filter((item) => {
        const payDate = new Date(item.paymentDate);
        return payDate >= now && payDate <= endOfMonth;
      })
      .reduce((sum, item) => sum + item.totalAmount, 0);

    const remainingMonths = 12 - now.getMonth();
    const averageMonthly = remainingMonths > 0 
      ? data.totalEstimated / remainingMonths 
      : data.totalEstimated;

    return {
      totalEstimated: data.totalEstimated,
      upcomingThisMonth,
      averageMonthly,
      count: data.schedule.length,
    };
  }, [data]);

  // Sort schedule
  const sortedSchedule = useMemo(() => {
    if (!data?.schedule) return [];

    const sorted = [...data.schedule].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "date":
          comparison = new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime();
          break;
        case "ticker":
          comparison = a.ticker.localeCompare(b.ticker);
          break;
        case "amount":
          comparison = a.totalAmount - b.totalAmount;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [data, sortField, sortDirection]);

  const handleSort = (field: "date" | "ticker" | "amount") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="page-dividends">
        <SEO title="Dividends" description="View your dividend schedule and expected payments" />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6" data-testid="page-dividends">
        <SEO title="Dividends" description="View your dividend schedule and expected payments" />
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">
              Failed to load dividend schedule. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-dividends">
      <SEO
        title="Dividends"
        description="View your dividend schedule and expected payments for the current year"
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Dividend Tracker
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Dividend schedule for {data?.year || new Date().getFullYear()}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Estimated</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatCurrency(summaryStats.totalEstimated)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              For {data?.year || new Date().getFullYear()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatCurrency(summaryStats.upcomingThisMonth)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Expected this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Monthly</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatCurrency(summaryStats.averageMonthly)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Remaining months
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dividend Schedule Table */}
      {!data || data.schedule.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <DollarSign className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Dividend Schedule</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {data?.schedule.length === 0
                ? "No dividend payments scheduled for the current year. Add holdings to see dividend schedules."
                : "Unable to fetch dividend data. Please try again later."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Dividend Schedule</CardTitle>
            <CardDescription>
              {summaryStats.count} dividend payment{summaryStats.count !== 1 ? "s" : ""} scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("ticker")}
                  >
                    Ticker {sortField === "ticker" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("date")}
                  >
                    Payment Date {sortField === "date" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="text-right">Amount/Share</TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("amount")}
                  >
                    Total Amount {sortField === "amount" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead className="text-right">Yield</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSchedule.map((item, index) => (
                  <TableRow key={`${item.ticker}-${item.paymentDate}-${index}`}>
                    <TableCell className="font-mono font-semibold">
                      {item.ticker}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {item.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.quantity.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {formatDate(item.paymentDate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(item.amountPerShare)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrency(item.totalAmount)}
                    </TableCell>
                    <TableCell>
                      {item.frequency}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPercent(item.yield)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
