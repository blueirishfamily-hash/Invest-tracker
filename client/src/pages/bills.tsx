import { useState, useMemo } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, Plus, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Bill, Subscription, TransactionCategory } from "@shared/schema";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

// Helper function to calculate next due date for a bill
const getNextDueDate = (bill: Bill, targetMonth: Date): Date | null => {
  const base = new Date(bill.dueDate);
  if (Number.isNaN(base.getTime())) return null;
  
  const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
  const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59, 999);
  
  let next = new Date(base);
  
  // For one-time bills, check if it falls in the target month
  if (bill.frequency === "one-time") {
    return next >= monthStart && next <= monthEnd ? next : null;
  }
  
  // For recurring bills, find the next occurrence in the target month
  while (next < monthStart) {
    switch (bill.frequency) {
      case "weekly":
        next.setDate(next.getDate() + 7);
        break;
      case "biweekly":
        next.setDate(next.getDate() + 14);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        break;
      case "quarterly":
        next.setMonth(next.getMonth() + 3);
        break;
      case "yearly":
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        return null;
    }
  }
  
  // Check if the next date is within the target month
  if (next > monthEnd) {
    // Find the first occurrence in the month by going backwards
    while (next > monthEnd) {
      switch (bill.frequency) {
        case "weekly":
          next.setDate(next.getDate() - 7);
          break;
        case "biweekly":
          next.setDate(next.getDate() - 14);
          break;
        case "monthly":
          next.setMonth(next.getMonth() - 1);
          break;
        case "quarterly":
          next.setMonth(next.getMonth() - 3);
          break;
        case "yearly":
          next.setFullYear(next.getFullYear() - 1);
          break;
        default:
          return null;
      }
    }
    // Then go forward to find the first occurrence in the month
    while (next < monthStart) {
      switch (bill.frequency) {
        case "weekly":
          next.setDate(next.getDate() + 7);
          break;
        case "biweekly":
          next.setDate(next.getDate() + 14);
          break;
        case "monthly":
          next.setMonth(next.getMonth() + 1);
          break;
        case "quarterly":
          next.setMonth(next.getMonth() + 3);
          break;
        case "yearly":
          next.setFullYear(next.getFullYear() + 1);
          break;
        default:
          return null;
      }
    }
  }
  
  return next >= monthStart && next <= monthEnd ? next : null;
};

// Helper function to calculate next billing date for a subscription
const getNextBillingDate = (subscription: Subscription, targetMonth: Date): Date | null => {
  const base = new Date(subscription.nextBillingDate);
  if (Number.isNaN(base.getTime())) return null;
  
  const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
  const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59, 999);
  
  let next = new Date(base);
  
  // Find the next occurrence in the target month
  while (next < monthStart) {
    switch (subscription.cadence) {
      case "weekly":
        next.setDate(next.getDate() + 7);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        break;
      case "quarterly":
        next.setMonth(next.getMonth() + 3);
        break;
      case "yearly":
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        return null;
    }
  }
  
  // Check if the next date is within the target month
  if (next > monthEnd) {
    return null;
  }
  
  return next >= monthStart && next <= monthEnd ? next : null;
};

export function BillsContent() {
  const queryClient = useQueryClient();
  const [isBillOpen, setIsBillOpen] = useState(false);
  const [isSubOpen, setIsSubOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

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

  const { data: bills } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
  });
  const { data: subscriptions } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });
  const { data: categories } = useQuery<TransactionCategory[]>({
    queryKey: ["/api/transaction-categories"],
  });

  // Calculate dates for bills and subscriptions in the selected month
  const monthItems = useMemo(() => {
    if (!bills || !subscriptions) return { billsByDate: new Map(), subsByDate: new Map(), allItems: [], upcomingBills: [] };
    
    const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59, 999);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const billsByDate = new Map<string, Bill[]>();
    const subsByDate = new Map<string, Subscription[]>();
    const allItems: Array<{ type: "bill" | "subscription"; item: Bill | Subscription; date: Date; isPaid?: boolean }> = [];
    const upcomingBills: Array<{ bill: Bill; dueDate: Date; isPaid: boolean }> = [];
    
    // Process bills
    bills.forEach((bill) => {
      const nextDate = getNextDueDate(bill, selectedMonth);
      if (nextDate) {
        const dateKey = nextDate.toISOString().slice(0, 10);
        const existing = billsByDate.get(dateKey) || [];
        billsByDate.set(dateKey, [...existing, bill]);
        
        // Check if bill is paid for this month
        // A bill is considered paid if:
        // 1. Status is "paid", OR
        // 2. lastPaidDate exists and is within the current month
        const isPaid = bill.status === "paid" || 
          (bill.lastPaidDate && (() => {
            const lastPaid = new Date(bill.lastPaidDate);
            lastPaid.setHours(0, 0, 0, 0);
            return lastPaid >= monthStart && lastPaid <= monthEnd;
          })());
        
        allItems.push({ type: "bill", item: bill, date: nextDate, isPaid });
        
        // Add to upcoming bills if due date is today or in the future
        if (nextDate >= today) {
          upcomingBills.push({ bill, dueDate: nextDate, isPaid: isPaid || false });
        }
      }
    });
    
    // Process subscriptions
    subscriptions
      .filter((sub) => sub.status === "active")
      .forEach((sub) => {
        const nextDate = getNextBillingDate(sub, selectedMonth);
        if (nextDate) {
          const dateKey = nextDate.toISOString().slice(0, 10);
          const existing = subsByDate.get(dateKey) || [];
          subsByDate.set(dateKey, [...existing, sub]);
          allItems.push({ type: "subscription", item: sub, date: nextDate });
        }
      });
    
    // Sort all items by date
    allItems.sort((a, b) => a.date.getTime() - b.date.getTime());
    // Sort upcoming bills by date
    upcomingBills.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    
    return { billsByDate, subsByDate, allItems, upcomingBills };
  }, [bills, subscriptions, selectedMonth]);
  
  // Get dates that have bills or subscriptions for calendar modifiers
  const datesWithBills = useMemo(() => {
    const dates: Date[] = [];
    monthItems.billsByDate.forEach((_, dateKey) => {
      dates.push(new Date(dateKey));
    });
    return dates;
  }, [monthItems.billsByDate]);
  
  const datesWithSubs = useMemo(() => {
    const dates: Date[] = [];
    monthItems.subsByDate.forEach((_, dateKey) => {
      dates.push(new Date(dateKey));
    });
    return dates;
  }, [monthItems.subsByDate]);
  
  const datesWithBoth = useMemo(() => {
    const dates: Date[] = [];
    monthItems.billsByDate.forEach((_, dateKey) => {
      if (monthItems.subsByDate.has(dateKey)) {
        dates.push(new Date(dateKey));
      }
    });
    return dates;
  }, [monthItems]);

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
          <div className="space-y-6">
            {/* Calendar and Upcoming Bills Side by Side */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Calendar */}
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Bill Calendar
                  </CardTitle>
                  <CardDescription>Upcoming bills and subscriptions at a glance.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    month={selectedMonth}
                    onMonthChange={setSelectedMonth}
                    className="rounded-md border"
                    classNames={{
                      day: "relative flex flex-col items-center justify-center",
                    }}
                    components={{
                      Day: (props) => {
                        const { date, displayMonth, ...dayProps } = props as any;
                        const dateKey = date.toISOString().slice(0, 10);
                        const dayBills = monthItems.billsByDate.get(dateKey) || [];
                        const daySubs = monthItems.subsByDate.get(dateKey) || [];
                        const isCurrentMonth = date.getMonth() === displayMonth.getMonth();
                        
                        return (
                          <button
                            type="button"
                            {...dayProps}
                            className={cn(
                              "relative h-9 w-9 p-0 font-normal rounded-md hover:bg-accent hover:text-accent-foreground flex flex-col items-center justify-center",
                              !isCurrentMonth && "text-muted-foreground opacity-50",
                              dayProps.className
                            )}
                          >
                            <span>{date.getDate()}</span>
                            {isCurrentMonth && (dayBills.length > 0 || daySubs.length > 0) && (
                              <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 flex gap-0.5 items-center justify-center pointer-events-none">
                                {dayBills.map((_, billIdx) => (
                                  <div
                                    key={`bill-dot-${dateKey}-${billIdx}`}
                                    className="w-1.5 h-1.5 rounded-full bg-red-500"
                                  />
                                ))}
                                {daySubs.map((_, subIdx) => (
                                  <div
                                    key={`sub-dot-${dateKey}-${subIdx}`}
                                    className="w-1.5 h-1.5 rounded-full bg-blue-500"
                                  />
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      },
                    }}
                  />
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span>Bills</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>Subscriptions</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Upcoming Bills on the right */}
              <Card className="lg:w-80">
                <CardHeader>
                  <CardTitle>Upcoming Bills</CardTitle>
                  <CardDescription>Bills due today or later this month.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                  {monthItems.upcomingBills.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No upcoming bills.</div>
                  ) : (
                    monthItems.upcomingBills.map(({ bill, dueDate, isPaid }) => (
                      <div key={bill.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">{bill.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Due {dueDate.toLocaleDateString()} • {bill.frequency}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{formatCurrency(bill.amount)}</Badge>
                          {isPaid && (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                              Paid
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* All Bills for the Month */}
            <Card>
              <CardHeader>
                <CardTitle>All Bills This Month</CardTitle>
                <CardDescription>
                  {selectedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {monthItems.allItems.filter(item => item.type === "bill").length === 0 ? (
                  <div className="text-sm text-muted-foreground">No bills this month.</div>
                ) : (
                  monthItems.allItems
                    .filter(item => item.type === "bill")
                    .map((item) => {
                      const bill = item.item as Bill;
                      return (
                        <div key={bill.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold">{bill.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Due {item.date.toLocaleDateString()} • {bill.frequency}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{formatCurrency(bill.amount)}</Badge>
                            {item.isPaid && (
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                Paid
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </CardContent>
            </Card>
            
            {/* All Subscriptions for the Month */}
            <Card>
              <CardHeader>
                <CardTitle>All Subscriptions This Month</CardTitle>
                <CardDescription>
                  {selectedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {monthItems.allItems.filter(item => item.type === "subscription").length === 0 ? (
                  <div className="text-sm text-muted-foreground">No subscriptions this month.</div>
                ) : (
                  monthItems.allItems
                    .filter(item => item.type === "subscription")
                    .map((item) => {
                      const subscription = item.item as Subscription;
                      return (
                        <div key={subscription.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold">{subscription.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Next bill {item.date.toLocaleDateString()} • {subscription.cadence}
                            </div>
                          </div>
                          <Badge variant="outline">{formatCurrency(subscription.amount)}</Badge>
                        </div>
                      );
                    })
                )}
              </CardContent>
            </Card>
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
