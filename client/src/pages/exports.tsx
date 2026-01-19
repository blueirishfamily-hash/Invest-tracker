import { useQuery } from "@tanstack/react-query";
import { SEO } from "@/components/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

export default function ExportsPage() {
  const { data: snapshot } = useQuery<any>({ queryKey: ["/api/cash-flow/snapshot"] });
  const { data: netWorth } = useQuery<any>({ queryKey: ["/api/net-worth"] });
  const { data: funds } = useQuery<any[]>({ queryKey: ["/api/sinking-funds"] });
  const { data: debtPlans } = useQuery<any[]>({ queryKey: ["/api/debt-plans"] });

  const handlePdfExport = () => {
    const popup = window.open("", "_blank", "width=800,height=900");
    if (!popup) return;
    const html = `
      <html>
        <head>
          <title>Sila Export</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { margin-bottom: 8px; }
            h2 { margin-top: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Sila Financial Summary</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>

          <h2>Net Worth</h2>
          <p>Total Net Worth: ${netWorth ? formatCurrency(netWorth.totalNetWorth) : "--"}</p>
          <p>Net Equity: ${netWorth ? formatCurrency(netWorth.netEquity) : "--"}</p>

          <h2>Cash Flow Snapshot</h2>
          <p>Safe to Spend: ${snapshot ? formatCurrency(snapshot.safeToSpend) : "--"}</p>
          <p>Total Balance: ${snapshot ? formatCurrency(snapshot.totalBalance) : "--"}</p>

          <h2>Sinking Funds</h2>
          <table>
            <thead><tr><th>Fund</th><th>Current</th><th>Target</th></tr></thead>
            <tbody>
              ${(funds || [])
                .map(
                  (fund) =>
                    `<tr><td>${fund.name}</td><td>${formatCurrency(fund.currentAmount)}</td><td>${formatCurrency(fund.targetAmount)}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>

          <h2>Debt Plans</h2>
          <table>
            <thead><tr><th>Plan</th><th>Method</th><th>Extra Payment</th></tr></thead>
            <tbody>
              ${(debtPlans || [])
                .map(
                  (plan) =>
                    `<tr><td>${plan.name}</td><td>${plan.method}</td><td>${formatCurrency(plan.extraPayment)}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-exports">
      <SEO title="Exports" description="Export data to CSV or PDF." />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Data Export</h1>
        <p className="text-muted-foreground">Download CSV files or generate a PDF summary.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions CSV</CardTitle>
          <CardDescription>Export transactions for tax or audit purposes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/api/exports/transactions.csv">
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PDF Summary</CardTitle>
          <CardDescription>Printable summary of cash flow and goals.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handlePdfExport}>
            <FileText className="h-4 w-4 mr-2" />
            Generate PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
