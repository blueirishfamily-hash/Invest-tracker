import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { SEO } from "@/components/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);

export default function WhatIfPage() {
  const [scenarioType, setScenarioType] = useState("debt");
  const [scenarioAmount, setScenarioAmount] = useState("500");
  const [months, setMonths] = useState("6");

  const projectionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/what-if/projection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to run projection");
      }
      return res.json();
    },
  });

  return (
    <div className="p-6 space-y-6" data-testid="page-what-if">
      <SEO title="What-If" description="Model new loans or income changes." />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">What-If Scenarios</h1>
        <p className="text-muted-foreground">
          See how a new loan or income change impacts your balance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scenario Inputs</CardTitle>
          <CardDescription>Model the impact on your monthly cash flow.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>Scenario Type</Label>
            <Select value={scenarioType} onValueChange={setScenarioType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income Increase</SelectItem>
                <SelectItem value="expense">Expense Increase</SelectItem>
                <SelectItem value="debt">Loan Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Monthly Amount</Label>
            <Input value={scenarioAmount} type="number" onChange={(e) => setScenarioAmount(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Months</Label>
            <Input value={months} type="number" onChange={(e) => setMonths(e.target.value)} />
          </div>
          <Button
            className="md:col-span-3"
            onClick={() =>
              projectionMutation.mutate({
                scenarioType,
                scenarioAmount: parseFloat(scenarioAmount),
                months: parseInt(months, 10),
              })
            }
            disabled={projectionMutation.isPending}
          >
            {projectionMutation.isPending ? "Running..." : "Run Scenario"}
          </Button>
        </CardContent>
      </Card>

      {projectionMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle>Projected Balance</CardTitle>
            <CardDescription>
              Base balance {formatCurrency(projectionMutation.data.baseBalance)} • Monthly net {formatCurrency(projectionMutation.data.monthlyNet)}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projectionMutation.data.projection}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line type="monotone" dataKey="projectedBalance" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
