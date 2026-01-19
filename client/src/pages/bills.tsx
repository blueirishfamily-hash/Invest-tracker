import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SEO } from "@/components/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Plus, Repeat } from "lucide-react";
import type { Bill, Subscription, TransactionCategory, DebtPlan } from "@shared/schema";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

export function BillsContent() {
  const queryClient = useQueryClient();
  const [isBillOpen, setIsBillOpen] = useState(false);
  const [isSubOpen, setIsSubOpen] = useState(false);
  const [isDebtOpen, setIsDebtOpen] = useState(false);

  const [billForm, setBillForm] = useState({
    name: "",
    amount: "",
    dueDate: new Date().toISOString().slice(0, 10),
    frequency: "monthly",
    categoryId: "",
    isAutoPay: false,
    reminderDaysBefore: "7,3,1",
  });

  const [subForm, setSubForm] = useState({
    name: "",
    amount: "",
    cadence: "monthly",
    nextBillingDate: new Date().toISOString().slice(0, 10),
    categoryId: "",
    status: "active",
  });

  const [debtForm, setDebtForm] = useState({
    name: "",
    method: "snowball",
    extraPayment: "",
  });
  const [debts, setDebts] = useState<Array<{ name: string; balance: string; interestRate: string; minimumPayment: string }>>([
    { name: "", balance: "", interestRate: "", minimumPayment: "" },
  ]);

  const { data: bills } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
  });
  const { data: subscriptions } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });
  const { data: categories } = useQuery<TransactionCategory[]>({
    queryKey: ["/api/transaction-categories"],
  });
  const { data: debtPlans } = useQuery<DebtPlan[]>({
    queryKey: ["/api/debt-plans"],
  });

  const billMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create bill");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      setIsBillOpen(false);
      setBillForm({
        name: "",
        amount: "",
        dueDate: new Date().toISOString().slice(0, 10),
        frequency: "monthly",
        categoryId: "",
        isAutoPay: false,
        reminderDaysBefore: "7,3,1",
      });
    },
  });

  const subMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create subscription");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setIsSubOpen(false);
      setSubForm({
        name: "",
        amount: "",
        cadence: "monthly",
        nextBillingDate: new Date().toISOString().slice(0, 10),
        categoryId: "",
        status: "active",
      });
    },
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

  return (
    <div className="space-y-6" data-testid="page-bills">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Bills & Subscriptions</h2>
          <p className="text-muted-foreground">Keep due dates visible and manage recurring services.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isBillOpen} onOpenChange={setIsBillOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Bill
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>New Bill</DialogTitle>
                <DialogDescription>Set reminders and due dates for important bills.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input value={billForm.name} onChange={(e) => setBillForm({ ...billForm, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      value={billForm.amount}
                      onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={billForm.dueDate}
                      onChange={(e) => setBillForm({ ...billForm, dueDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Frequency</Label>
                    <Select value={billForm.frequency} onValueChange={(value) => setBillForm({ ...billForm, frequency: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {["weekly", "biweekly", "monthly", "quarterly", "yearly", "one-time"].map((freq) => (
                          <SelectItem key={freq} value={freq}>
                            {freq}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select value={billForm.categoryId} onValueChange={(value) => setBillForm({ ...billForm, categoryId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {(categories || []).map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Reminder Days (comma-separated)</Label>
                  <Input
                    value={billForm.reminderDaysBefore}
                    onChange={(e) => setBillForm({ ...billForm, reminderDaysBefore: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() =>
                    billMutation.mutate({
                      name: billForm.name,
                      amount: parseFloat(billForm.amount),
                      dueDate: billForm.dueDate,
                      frequency: billForm.frequency,
                      categoryId: billForm.categoryId || undefined,
                      isAutoPay: billForm.isAutoPay,
                      reminderDaysBefore: billForm.reminderDaysBefore
                        .split(",")
                        .map((value) => parseInt(value.trim(), 10))
                        .filter((value) => !Number.isNaN(value)),
                      status: "scheduled",
                    })
                  }
                  disabled={billMutation.isPending}
                >
                  {billMutation.isPending ? "Saving..." : "Save Bill"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isSubOpen} onOpenChange={setIsSubOpen}>
            <DialogTrigger asChild>
              <Button>
                <Repeat className="h-4 w-4 mr-2" />
                Add Subscription
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>New Subscription</DialogTitle>
                <DialogDescription>Track recurring subscriptions and cancellations.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      value={subForm.amount}
                      onChange={(e) => setSubForm({ ...subForm, amount: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Next Billing Date</Label>
                    <Input
                      type="date"
                      value={subForm.nextBillingDate}
                      onChange={(e) => setSubForm({ ...subForm, nextBillingDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Cadence</Label>
                    <Select value={subForm.cadence} onValueChange={(value) => setSubForm({ ...subForm, cadence: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Cadence" />
                      </SelectTrigger>
                      <SelectContent>
                        {["weekly", "monthly", "quarterly", "yearly"].map((cadence) => (
                          <SelectItem key={cadence} value={cadence}>
                            {cadence}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select value={subForm.categoryId} onValueChange={(value) => setSubForm({ ...subForm, categoryId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {(categories || []).map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() =>
                    subMutation.mutate({
                      name: subForm.name,
                      amount: parseFloat(subForm.amount),
                      cadence: subForm.cadence,
                      nextBillingDate: subForm.nextBillingDate,
                      categoryId: subForm.categoryId || undefined,
                      status: subForm.status,
                    })
                  }
                  disabled={subMutation.isPending}
                >
                  {subMutation.isPending ? "Saving..." : "Save Subscription"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="bills">
        <TabsList>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="debt">Debt Payoff</TabsTrigger>
        </TabsList>
        <TabsContent value="bills">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Bills</CardTitle>
              <CardDescription>Keep an eye on due dates and reminders.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(bills || []).map((bill) => (
                <div key={bill.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-semibold">{bill.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Due {new Date(bill.dueDate).toLocaleDateString()} • {bill.frequency}
                    </div>
                  </div>
                  <Badge variant="outline">{formatCurrency(bill.amount)}</Badge>
                </div>
              ))}
              {(!bills || bills.length === 0) && (
                <div className="text-sm text-muted-foreground">No bills yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Subscriptions</CardTitle>
              <CardDescription>Identify recurring services and ghost subscriptions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(subscriptions || []).map((sub) => (
                <div key={sub.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-semibold">{sub.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Next bill {new Date(sub.nextBillingDate).toLocaleDateString()} • {sub.cadence}
                    </div>
                  </div>
                  <Badge variant="outline">{formatCurrency(sub.amount)}</Badge>
                </div>
              ))}
              {(!subscriptions || subscriptions.length === 0) && (
                <div className="text-sm text-muted-foreground">No subscriptions yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Bill Calendar
              </CardTitle>
              <CardDescription>Upcoming bills and subscriptions at a glance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(bills || []).map((bill) => (
                <div key={`calendar-${bill.id}`} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-semibold">{bill.name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(bill.dueDate).toLocaleDateString()}</div>
                  </div>
                  <Badge variant="outline">{formatCurrency(bill.amount)}</Badge>
                </div>
              ))}
              {(subscriptions || []).map((sub) => (
                <div key={`calendar-${sub.id}`} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-semibold">{sub.name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(sub.nextBillingDate).toLocaleDateString()}</div>
                  </div>
                  <Badge variant="outline">{formatCurrency(sub.amount)}</Badge>
                </div>
              ))}
              {(!bills?.length && !subscriptions?.length) && (
                <div className="text-sm text-muted-foreground">No upcoming items yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="debt">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Debt Payoff Plans</h3>
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
                      <div key={debt.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <div className="font-semibold">{debt.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Balance {formatCurrency(debt.balance)} • Rate {debt.interestRate}%
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Min payment {formatCurrency(debt.minimumPayment)}
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function BillsPage() {
  return (
    <div className="p-6 space-y-6" data-testid="page-bills">
      <SEO title="Bills & Subscriptions" description="Track bills, reminders, and recurring subscriptions." />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Bills & Subscriptions</h1>
        <p className="text-muted-foreground">Keep due dates visible and manage recurring services.</p>
      </div>

      <BillsContent />
    </div>
  );
}
