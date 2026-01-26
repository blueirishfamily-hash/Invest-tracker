import { useQuery } from "@tanstack/react-query";
import { SEO } from "@/components/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);

function formatMonthLabel(month: string): string {
  // Expects YYYY-MM
  const [y, m] = month.split("-");
  const date = new Date(Number(y), Math.max(0, Number(m) - 1), 1);
  return date.toLocaleDateString("en-US", { month: "short" });
}

export function InsightsContent() {
  const { data: analytics } = useQuery<any>({
    queryKey: ["/api/insights/spending-analytics"],
  });
  const { data: anomalies } = useQuery<any[]>({
    queryKey: ["/api/anomalies"],
  });

  return (
    <div className="space-y-6" data-testid="page-insights">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Insights</h2>
        <p className="text-muted-foreground">Compare spending trends and catch unusual activity.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Net Income</CardTitle>
          <CardDescription>Income (green) vs expenses (red), rolling 6-month overview.</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics?.monthly || []}>
              <XAxis dataKey="month" tickFormatter={formatMonthLabel} />
              <YAxis tickFormatter={(value: number) => formatCurrency(value)} />
              <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="income" name="Income" fill="hsl(142 70% 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category Averages</CardTitle>
          <CardDescription>6-month average spend by category.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {analytics?.averageByCategory &&
            Object.entries(analytics.averageByCategory).map(([category, value]) => (
              <div key={category} className="rounded-lg border p-3">
                <div className="text-sm text-muted-foreground">{category}</div>
                <div className="text-lg font-semibold">{formatCurrency(value as number)}</div>
              </div>
            ))}
          {!analytics?.averageByCategory && (
            <div className="text-sm text-muted-foreground">No spending data yet.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Anomaly Alerts
          </CardTitle>
          <CardDescription>Unusual charges or potential duplicates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(anomalies || []).map((anomaly) => (
            <div key={anomaly.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="font-semibold">{anomaly.description}</div>
                <div className="text-xs text-muted-foreground">{new Date(anomaly.createdAt).toLocaleString()}</div>
              </div>
              <Badge variant={anomaly.severity === "high" ? "destructive" : "secondary"}>
                {anomaly.severity}
              </Badge>
            </div>
          ))}
          {(!anomalies || anomalies.length === 0) && (
            <div className="text-sm text-muted-foreground">No anomalies detected.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function InsightsPage() {
  return (
    <div className="p-6 space-y-6" data-testid="page-insights">
      <SEO title="Insights" description="Spending analytics and anomaly detection." />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="text-muted-foreground">Compare spending trends and catch unusual activity.</p>
      </div>

      <InsightsContent />
    </div>
  );
}
