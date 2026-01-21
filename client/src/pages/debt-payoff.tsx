import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import type { DebtPlan, DebtItem } from "@shared/schema";
import { DebtPayoffGraph } from "@/components/debt-payoff-graph";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

export function DebtPayoffContent() {
  const queryClient = useQueryClient();
  const [isDebtOpen, setIsDebtOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<DebtPlan | null>(null);

  const [debtForm, setDebtForm] = useState({
    name: "",
    method: "snowball",
    extraPayment: "",
  });
  const [debts, setDebts] = useState<Array<{ name: string; balance: string; interestRate: string; minimumPayment: string }>>([
    { name: "", balance: "", interestRate: "", minimumPayment: "" },
  ]);

  const { data: debtPlans } = useQuery<DebtPlan[]>({
    queryKey: ["/api/debt-plans"],
  });

  const debtMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/debt-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create debt plan");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/debt-plans"] });
      setIsDebtOpen(false);
      setDebtForm({ name: "", method: "snowball", extraPayment: "" });
      setDebts([{ name: "", balance: "", interestRate: "", minimumPayment: "" }]);
    },
  });

  const handleDebtClick = (debt: DebtItem, plan: DebtPlan) => {
    setSelectedDebt(debt);
    setSelectedPlan(plan);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Debt Payoff Plans</h2>
          <p className="text-muted-foreground">Use the snowball or avalanche method to plan your path to being debt-free.</p>
        </div>
        <Dialog open={isDebtOpen} onOpenChange={setIsDebtOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Debt Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>New Debt Plan</DialogTitle>
              <DialogDescription>Use the snowball or avalanche method.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={debtForm.name} onChange={(e) => setDebtForm({ ...debtForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Method</Label>
                  <Select value={debtForm.method} onValueChange={(value) => setDebtForm({ ...debtForm, method: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="snowball">Snowball</SelectItem>
                      <SelectItem value="avalanche">Avalanche</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Extra Payment</Label>
                  <Input
                    type="number"
                    value={debtForm.extraPayment}
                    onChange={(e) => setDebtForm({ ...debtForm, extraPayment: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Debts</Label>
                {debts.map((debt, index) => (
                  <div key={`debt-${index}`} className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Name"
                      value={debt.name}
                      onChange={(e) =>
                        setDebts((prev) => prev.map((item, idx) => (idx === index ? { ...item, name: e.target.value } : item)))
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Balance"
                      value={debt.balance}
                      onChange={(e) =>
                        setDebts((prev) => prev.map((item, idx) => (idx === index ? { ...item, balance: e.target.value } : item)))
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Rate %"
                      value={debt.interestRate}
                      onChange={(e) =>
                        setDebts((prev) => prev.map((item, idx) => (idx === index ? { ...item, interestRate: e.target.value } : item)))
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Min Pay"
                      value={debt.minimumPayment}
                      onChange={(e) =>
                        setDebts((prev) => prev.map((item, idx) => (idx === index ? { ...item, minimumPayment: e.target.value } : item)))
                      }
                    />
                  </div>
                ))}
                <Button variant="outline" onClick={() => setDebts((prev) => [...prev, { name: "", balance: "", interestRate: "", minimumPayment: "" }])}>
                  Add Debt
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() =>
                  debtMutation.mutate({
                    name: debtForm.name,
                    method: debtForm.method,
                    extraPayment: parseFloat(debtForm.extraPayment || "0"),
                    debts: debts
                      .filter((debt) => debt.name)
                      .map((debt, index) => ({
                        id: `debt-item-${index}`,
                        name: debt.name,
                        balance: parseFloat(debt.balance || "0"),
                        interestRate: parseFloat(debt.interestRate || "0"),
                        minimumPayment: parseFloat(debt.minimumPayment || "0"),
                      })),
                  })
                }
                disabled={debtMutation.isPending}
              >
                {debtMutation.isPending ? "Saving..." : "Save Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {selectedDebt && selectedPlan ? (
        <DebtPayoffGraph
          debt={selectedDebt}
          onClose={() => {
            setSelectedDebt(null);
            setSelectedPlan(null);
          }}
        />
      ) : (
        <>
          {(debtPlans || []).map((plan) => {
            const sortedDebts = [...plan.debts].sort((a, b) =>
              plan.method === "snowball" ? a.balance - b.balance : b.interestRate - a.interestRate
            );
            return (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    {plan.method === "snowball" ? "Snowball" : "Avalanche"} method • Extra payment {formatCurrency(plan.extraPayment)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sortedDebts.map((debt) => (
                    <div
                      key={debt.id}
                      className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleDebtClick(debt, plan)}
                    >
                      <div>
                        <div className="font-semibold">{debt.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Balance {formatCurrency(debt.balance)} • Rate {debt.interestRate}%
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-muted-foreground">
                          Min payment {formatCurrency(debt.minimumPayment)}
                        </div>
                        <Badge variant="outline">Click to view payoff</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
          {(!debtPlans || debtPlans.length === 0) && (
            <Card>
              <CardHeader>
                <CardTitle>No debt plans yet</CardTitle>
                <CardDescription>Add a plan to start tracking your payoff path.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
