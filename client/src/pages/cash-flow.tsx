import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SEO } from "@/components/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Plus } from "lucide-react";
import type { FinancialAccount, UserPreferences } from "@shared/schema";
import { CashFlowChart } from "@/components/cash-flow-chart";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

export function CashFlowContent() {
  const queryClient = useQueryClient();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [tempChartType, setTempChartType] = useState<"sankey" | "horizontalBar" | "pie" | null>(null);
  const [accountForm, setAccountForm] = useState({
    name: "",
    type: "checking",
    balance: "",
    institutionId: "",
    isShared: false,
  });

  const { data: accounts } = useQuery<FinancialAccount[]>({
    queryKey: ["/api/financial-accounts"],
  });
  const { data: snapshot, isLoading: snapshotLoading } = useQuery<any>({
    queryKey: ["/api/cash-flow/snapshot"],
  });
  const { data: settings } = useQuery<UserPreferences>({
    queryKey: ["/api/settings"],
  });

  const activeChartType = tempChartType ?? settings?.cashFlowChartType ?? "pie";

  const accountMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/financial-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create account");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial-accounts"] });
      setIsAccountOpen(false);
      setAccountForm({ name: "", type: "checking", balance: "", institutionId: "", isShared: false });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const res = await fetch(`/api/financial-accounts/${accountId}/mock-sync`, { method: "POST" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to sync account");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-flow/snapshot"] });
    },
  });

  return (
    <div className="space-y-6" data-testid="page-cash-flow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Cash Flow Overview</h2>
          <p className="text-muted-foreground">Understand your safe-to-spend balance at a glance.</p>
        </div>
        <Dialog open={isAccountOpen} onOpenChange={setIsAccountOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Account</DialogTitle>
              <DialogDescription>Add a bank, credit, loan, or BNPL account (mock sync).</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select value={accountForm.type} onValueChange={(value) => setAccountForm({ ...accountForm, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {["checking", "savings", "credit", "loan", "bnpl", "cash", "other"].map((type) => {
                        // Capitalize first letter and handle special cases
                        const displayType = type === "bnpl" 
                          ? "BNPL" 
                          : type.charAt(0).toUpperCase() + type.slice(1);
                        return (
                          <SelectItem key={type} value={type}>
                            {displayType}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Balance</Label>
                  <Input
                    type="number"
                    value={accountForm.balance}
                    onChange={(e) => setAccountForm({ ...accountForm, balance: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">Shared Account</div>
                    <div className="text-xs text-muted-foreground">
                      Visible to household members in Couples Mode.
                    </div>
                  </div>
                  <Switch
                    checked={accountForm.isShared}
                    onCheckedChange={(checked) => setAccountForm({ ...accountForm, isShared: checked })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() =>
                  accountMutation.mutate({
                    userId: "user-1",
                    name: accountForm.name,
                    type: accountForm.type,
                    balance: parseFloat(accountForm.balance || "0"),
                    currency: "USD",
                    syncStatus: "mock",
                    isShared: accountForm.isShared,
                  })
                }
                disabled={accountMutation.isPending}
              >
                {accountMutation.isPending ? "Saving..." : "Save Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium">Chart Type</Label>
            <Select
              value={activeChartType}
              onValueChange={(value) => setTempChartType(value as "sankey" | "horizontalBar" | "pie")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pie">Pie Chart</SelectItem>
                <SelectItem value="horizontalBar">Horizontal Bar Chart</SelectItem>
                <SelectItem value="sankey">Sankey Diagram</SelectItem>
              </SelectContent>
            </Select>
            {tempChartType && (
              <p className="text-xs text-muted-foreground">
                Temporary override (default: {settings?.cashFlowChartType ?? "pie"})
              </p>
            )}
          </div>
        </div>
        <CashFlowChart data={snapshot} chartType={activeChartType} isLoading={snapshotLoading} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Safe to Spend</CardTitle>
            <CardDescription>Balance after upcoming bills.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {snapshot ? formatCurrency(snapshot.safeToSpend) : "--"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Balance</CardTitle>
            <CardDescription>Across connected accounts.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {snapshot ? formatCurrency(snapshot.totalBalance) : "--"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expected Income</CardTitle>
            <CardDescription>Based on recent inflows.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {snapshot ? formatCurrency(snapshot.expectedIncome) : "--"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>Mock synced accounts for cash flow tracking.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(accounts || []).map((account) => (
            <div key={account.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="font-semibold">{account.name}</div>
                <div className="text-xs text-muted-foreground">
                  {account.type === "bnpl" 
                    ? "BNPL" 
                    : account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {account.isShared && <Badge variant="secondary">Shared</Badge>}
                <Badge variant="outline">{formatCurrency(account.balance)}</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncMutation.mutate(account.id)}
                  disabled={syncMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                  Sync
                </Button>
              </div>
            </div>
          ))}
          {(!accounts || accounts.length === 0) && (
            <div className="text-sm text-muted-foreground">No accounts yet. Add one to start.</div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Bills</CardTitle>
            <CardDescription>Next 30 days.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(snapshot?.upcomingBills || []).map((bill: any) => (
              <div key={bill.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-semibold">{bill.name}</div>
                  <div className="text-xs text-muted-foreground">{bill.nextDueDate}</div>
                </div>
                <Badge variant="outline">{formatCurrency(bill.amount)}</Badge>
              </div>
            ))}
            {(!snapshot?.upcomingBills || snapshot.upcomingBills.length === 0) && (
              <div className="text-sm text-muted-foreground">No upcoming bills.</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Subscriptions</CardTitle>
            <CardDescription>Next 30 days.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(snapshot?.upcomingSubscriptions || []).map((sub: any) => (
              <div key={sub.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-semibold">{sub.name}</div>
                  <div className="text-xs text-muted-foreground">{sub.nextBillingDate}</div>
                </div>
                <Badge variant="outline">{formatCurrency(sub.amount)}</Badge>
              </div>
            ))}
            {(!snapshot?.upcomingSubscriptions || snapshot.upcomingSubscriptions.length === 0) && (
              <div className="text-sm text-muted-foreground">No upcoming subscriptions.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CashFlowPage() {
  return (
    <div className="p-6 space-y-6" data-testid="page-cash-flow">
      <SEO title="Cash Flow" description="Monitor safe-to-spend and upcoming bills." />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Cash Flow Overview</h1>
        <p className="text-muted-foreground">Understand your safe-to-spend balance at a glance.</p>
      </div>

      <CashFlowContent />
    </div>
  );
}
