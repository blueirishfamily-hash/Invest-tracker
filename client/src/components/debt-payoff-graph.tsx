import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { DebtItem } from "@shared/schema";
import { calculateDebtPayoffSchedule, type PayoffSchedule } from "@/lib/debt-calculations";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);

interface DebtPayoffGraphProps {
  debt: DebtItem;
  onClose?: () => void;
}

export function DebtPayoffGraph({ debt, onClose }: DebtPayoffGraphProps) {
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState<string>("0");
  const [oneTimePayment, setOneTimePayment] = useState<string>("0");
  const [schedule, setSchedule] = useState<PayoffSchedule | null>(() => 
    calculateDebtPayoffSchedule(debt, 0, 0)
  );

  const handleCalculate = () => {
    const extra = parseFloat(extraMonthlyPayment) || 0;
    const oneTime = parseFloat(oneTimePayment) || 0;
    const newSchedule = calculateDebtPayoffSchedule(debt, extra, oneTime);
    setSchedule(newSchedule);
  };

  if (!schedule) return null;

  const monthsSaved = schedule.originalPayoffDate && schedule.proposedPayoffDate
    ? Math.round((schedule.originalPayoffDate.getTime() - schedule.proposedPayoffDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;

  const interestSaved = schedule.originalTotalInterest - schedule.proposedTotalInterest;

  // Find the month index where proposed payoff occurs
  const proposedPayoffMonthIndex = schedule.data.findIndex(
    (point) => point.proposedBalance <= 0.01
  );

  // Filter data so proposed plan only shows up to payoff date
  const graphData = schedule.data.map((point, index) => {
    if (proposedPayoffMonthIndex >= 0 && index > proposedPayoffMonthIndex) {
      // After proposed payoff, set proposed values to null so line stops
      return {
        ...point,
        proposedBalance: null,
        proposedTotalPaid: null,
      };
    }
    return point;
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{debt.name}</CardTitle>
            <CardDescription>
              Balance: {formatCurrency(debt.balance)} • Rate: {debt.interestRate}% • Min Payment: {formatCurrency(debt.minimumPayment)}
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
          <div className="grid gap-2">
            <Label htmlFor="extra-monthly">Alternative Monthly Payment</Label>
            <Input
              id="extra-monthly"
              type="number"
              step="0.01"
              value={extraMonthlyPayment}
              onChange={(e) => setExtraMonthlyPayment(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="one-time">One-Time Payment</Label>
            <Input
              id="one-time"
              type="number"
              step="0.01"
              value={oneTimePayment}
              onChange={(e) => setOneTimePayment(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleCalculate} className="w-full">
              Calculate
            </Button>
          </div>
        </div>

        {/* Comparison Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 border rounded-lg">
            <div className="text-xs text-muted-foreground">Original Payoff</div>
            <div className="text-lg font-semibold">
              {schedule.originalPayoffDate
                ? schedule.originalPayoffDate.toLocaleDateString()
                : "N/A"}
            </div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-xs text-muted-foreground">Proposed Payoff</div>
            <div className="text-lg font-semibold text-green-600">
              {schedule.proposedPayoffDate
                ? schedule.proposedPayoffDate.toLocaleDateString()
                : "N/A"}
            </div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-xs text-muted-foreground">Time Saved</div>
            <div className="text-lg font-semibold">
              {monthsSaved > 0 ? `${monthsSaved} months` : "0 months"}
            </div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-xs text-muted-foreground">Interest Saved</div>
            <div className="text-lg font-semibold text-green-600">
              {formatCurrency(interestSaved)}
            </div>
          </div>
        </div>

        {/* Graph */}
        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={graphData}>
              <defs>
                <linearGradient id="colorOriginal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fee2e2" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#fee2e2" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorProposed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dcfce7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#dcfce7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                label={{ value: "Month", position: "insideBottom", offset: -5 }}
                className="text-xs"
              />
              <YAxis
                label={{ value: "Total Paid ($)", angle: -90, position: "insideLeft" }}
                className="text-xs"
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(month) => `Month ${month}`}
              />
              {/* Original Plan Area */}
              <Area
                type="monotone"
                dataKey="originalTotalPaid"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#colorOriginal)"
                name="Original Plan"
              />
              {/* Proposed Plan Area */}
              <Area
                type="monotone"
                dataKey="proposedTotalPaid"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#colorProposed)"
                name="Proposed Plan"
                connectNulls={false}
              />
              {/* Dashed line at proposed payoff date if earlier than original */}
              {schedule.proposedPayoffDate &&
                schedule.originalPayoffDate &&
                schedule.proposedPayoffDate < schedule.originalPayoffDate &&
                proposedPayoffMonthIndex >= 0 && (
                  <ReferenceLine
                    x={proposedPayoffMonthIndex}
                    stroke="#22c55e"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    label={{
                      value: `Payoff: ${schedule.proposedPayoffDate.toLocaleDateString()}`,
                      position: "top",
                      fill: "#22c55e",
                      fontSize: 12,
                    }}
                  />
                )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span>Original Plan</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span>Proposed Plan</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
