import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SEO } from "@/components/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, SplitSquareVertical, Tags } from "lucide-react";
import type {
  FinancialAccount,
  Transaction,
  TransactionCategory,
  TransactionTag,
  TransactionSplit,
} from "@shared/schema";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

export function TransactionsContent() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [splitTarget, setSplitTarget] = useState<Transaction | null>(null);
  const [splitRows, setSplitRows] = useState<Array<{ categoryId: string; amount: string; notes: string }>>([
    { categoryId: "", amount: "", notes: "" },
  ]);

  const [formData, setFormData] = useState({
    accountId: "",
    date: new Date().toISOString().slice(0, 10),
    name: "",
    merchantName: "",
    amount: "",
    direction: "debit",
    categoryId: "",
    tags: [] as string[],
    notes: "",
  });
  const [editFormData, setEditFormData] = useState({
    date: "",
    merchantName: "",
    name: "",
    amount: "",
    categoryId: "",
  });
  const [ruleForm, setRuleForm] = useState({
    pattern: "",
    categoryId: "",
    confidence: "0.7",
  });

  const { data: accounts } = useQuery<FinancialAccount[]>({
    queryKey: ["/api/financial-accounts"],
  });
  const { data: categories } = useQuery<TransactionCategory[]>({
    queryKey: ["/api/transaction-categories"],
  });
  const { data: tags } = useQuery<TransactionTag[]>({
    queryKey: ["/api/transaction-tags"],
  });
  const { data: categoryRules } = useQuery<any[]>({
    queryKey: ["/api/category-rules"],
  });
  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const categoryLookup = useMemo(() => {
    const map = new Map<string, TransactionCategory>();
    (categories || []).forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [categories]);

  const tagLookup = useMemo(() => {
    const map = new Map<string, TransactionTag>();
    (tags || []).forEach((tag) => map.set(tag.id, tag));
    return map;
  }, [tags]);

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create transaction");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setIsAddOpen(false);
      setFormData({
        accountId: "",
        date: new Date().toISOString().slice(0, 10),
        name: "",
        merchantName: "",
        amount: "",
        direction: "debit",
        categoryId: "",
        tags: [],
        notes: "",
      });
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/category-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create rule");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/category-rules"] });
      setRuleForm({ pattern: "", categoryId: "" });
    },
  });

  const splitMutation = useMutation({
    mutationFn: async (payload: { id: string; splits: TransactionSplit[] }) => {
      const res = await fetch(`/api/transactions/${payload.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isSplit: true,
          splits: payload.splits,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to split transaction");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setSplitTarget(null);
      setSplitRows([{ categoryId: "", amount: "", notes: "" }]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; updates: any }) => {
      const res = await fetch(`/api/transactions/${payload.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.updates),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update transaction");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setIsEditOpen(false);
      setSelectedTransaction(null);
    },
  });

  const handleAddTransaction = () => {
    if (!formData.accountId || !formData.name || !formData.amount) return;
    createMutation.mutate({
      accountId: formData.accountId,
      date: new Date(formData.date).toISOString(),
      name: formData.name,
      merchantName: formData.merchantName || undefined,
      amount: parseFloat(formData.amount),
      direction: formData.direction,
      categoryId: formData.categoryId || undefined,
      tags: formData.tags,
      isPending: false,
      isSplit: false,
      splits: undefined,
      notes: formData.notes || undefined,
    });
  };

  const handleSplitSave = () => {
    if (!splitTarget) return;
    const splits: TransactionSplit[] = splitRows
      .filter((row) => row.amount)
      .map((row, index) => ({
        id: `split-${splitTarget.id}-${index}`,
        transactionId: splitTarget.id,
        categoryId: row.categoryId || undefined,
        amount: parseFloat(row.amount),
        notes: row.notes || undefined,
      }));
    if (splits.length === 0) return;
    splitMutation.mutate({ id: splitTarget.id, splits });
  };

  const handleUpdateTransaction = () => {
    if (!selectedTransaction) return;
    if (!editFormData.date || !editFormData.amount) {
      return; // Basic validation
    }
    try {
      const amountValue = parseFloat(editFormData.amount);
      if (isNaN(amountValue)) {
        console.error("Invalid amount value");
        return;
      }
      updateMutation.mutate({
        id: selectedTransaction.id,
        updates: {
          date: new Date(editFormData.date).toISOString(),
          merchantName: editFormData.merchantName || undefined,
          name: editFormData.name || "",
          amount: amountValue,
          categoryId: editFormData.categoryId || undefined,
        },
      });
    } catch (error) {
      console.error("Error updating transaction:", error);
    }
  };

  return (
    <div className="space-y-6" data-testid="page-transactions">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Transactions</h2>
          <p className="text-muted-foreground">
            Add manual transactions, split purchases, and manage smart categorization.
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Transaction</DialogTitle>
              <DialogDescription>Manual entry for cash or off-platform spending.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Account</Label>
                <Select value={formData.accountId} onValueChange={(value) => setFormData({ ...formData, accountId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {(accounts || []).map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Merchant</Label>
                <Input
                  value={formData.merchantName}
                  onChange={(event) => setFormData({ ...formData, merchantName: event.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(event) => setFormData({ ...formData, amount: event.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Direction</Label>
                  <Select value={formData.direction} onValueChange={(value) => setFormData({ ...formData, direction: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debit">Expense</SelectItem>
                      <SelectItem value="credit">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Auto (Smart)" />
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
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  Tags
                </Label>
                <div className="grid gap-2">
                  {(tags || []).map((tag) => (
                    <label key={tag.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={formData.tags.includes(tag.id)}
                        onCheckedChange={(checked) => {
                          setFormData((prev) => ({
                            ...prev,
                            tags: checked
                              ? [...prev.tags, tag.id]
                              : prev.tags.filter((id) => id !== tag.id),
                          }));
                        }}
                      />
                      {tag.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddTransaction} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save Transaction"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Smart categorization applies when possible.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(transactions || []).map((txn) => {
                const categoryName = txn.categoryId ? categoryLookup.get(txn.categoryId)?.name : "Uncategorized";
                return (
                  <TableRow 
                    key={txn.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      try {
                        setSelectedTransaction(txn);
                        const dateValue = txn.date ? new Date(txn.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
                        setEditFormData({
                          date: dateValue,
                          merchantName: txn.merchantName || "",
                          name: txn.name || "",
                          amount: txn.amount !== undefined && txn.amount !== null ? String(txn.amount) : "",
                          categoryId: txn.categoryId || "",
                        });
                        setIsEditOpen(true);
                      } catch (error) {
                        console.error("Error opening edit dialog:", error);
                      }
                    }}
                  >
                    <TableCell>{new Date(txn.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="font-medium">{txn.merchantName || txn.name}</div>
                      <div className="text-xs text-muted-foreground">{txn.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{categoryName || "Uncategorized"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {txn.tags.map((tagId) => (
                          <Badge key={tagId} variant="secondary">
                            {tagLookup.get(tagId)?.name || tagId}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={txn.direction === "debit" ? "text-destructive" : "text-emerald-600"}>
                        {formatCurrency(txn.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click from triggering
                          setSplitTarget(txn);
                          setSplitRows([{ categoryId: txn.categoryId || "", amount: String(txn.amount), notes: "" }]);
                        }}
                      >
                        <SplitSquareVertical className="h-4 w-4 mr-2" />
                        Split
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!transactions || transactions.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No transactions yet. Add a manual transaction to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) {
          setSelectedTransaction(null);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update transaction details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={editFormData.date}
                onChange={(event) => setEditFormData({ ...editFormData, date: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Merchant Name</Label>
              <Input
                value={editFormData.merchantName}
                onChange={(event) => setEditFormData({ ...editFormData, merchantName: event.target.value })}
                placeholder="Store or merchant name"
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input
                value={editFormData.name}
                onChange={(event) => setEditFormData({ ...editFormData, name: event.target.value })}
                placeholder="Transaction description"
              />
            </div>
            <div className="grid gap-2">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={editFormData.amount}
                onChange={(event) => setEditFormData({ ...editFormData, amount: event.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={editFormData.categoryId}
                onValueChange={(value) => setEditFormData({ ...editFormData, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Uncategorized</SelectItem>
                  {(categories || []).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setSelectedTransaction(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTransaction}
              disabled={updateMutation.isPending || !editFormData.date || !editFormData.amount}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!splitTarget} onOpenChange={(open) => !open && setSplitTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Split Transaction</DialogTitle>
            <DialogDescription>
              Break a single purchase into multiple categories.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {splitRows.map((row, index) => (
              <div key={`split-${index}`} className="grid grid-cols-3 gap-2">
                <Select
                  value={row.categoryId}
                  onValueChange={(value) =>
                    setSplitRows((prev) =>
                      prev.map((item, idx) => (idx === index ? { ...item, categoryId: value } : item))
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories || []).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Amount"
                  value={row.amount}
                  onChange={(event) =>
                    setSplitRows((prev) =>
                      prev.map((item, idx) => (idx === index ? { ...item, amount: event.target.value } : item))
                    )
                  }
                />
                <Input
                  placeholder="Notes"
                  value={row.notes}
                  onChange={(event) =>
                    setSplitRows((prev) =>
                      prev.map((item, idx) => (idx === index ? { ...item, notes: event.target.value } : item))
                    )
                  }
                />
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => setSplitRows((prev) => [...prev, { categoryId: "", amount: "", notes: "" }])}
            >
              Add Split Line
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={handleSplitSave} disabled={splitMutation.isPending}>
              {splitMutation.isPending ? "Saving..." : "Save Split"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Smart Categorization Rules</CardTitle>
          <CardDescription>Teach Sila how to label recurring merchants.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Merchant Pattern</Label>
              <Input
                value={ruleForm.pattern}
                onChange={(event) => setRuleForm({ ...ruleForm, pattern: event.target.value })}
                placeholder="e.g., target|walmart"
              />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={ruleForm.categoryId}
                onValueChange={(value) => setRuleForm({ ...ruleForm, categoryId: value })}
              >
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
          <Button
            onClick={() =>
              createRuleMutation.mutate({
                pattern: ruleForm.pattern,
                categoryId: ruleForm.categoryId,
                isActive: true,
              })
            }
            disabled={createRuleMutation.isPending}
          >
            {createRuleMutation.isPending ? "Saving..." : "Add Rule"}
          </Button>

          <div className="space-y-2">
            {(categoryRules || []).map((rule) => (
              <div key={rule.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">{rule.pattern}</div>
                  <div className="text-xs text-muted-foreground">
                    Category: {categoryLookup.get(rule.categoryId)?.name || "Unknown"} • Confidence: {(rule.confidence * 100).toFixed(0)}% ({rule.acceptedCount} accepted, {rule.rejectedCount} rejected)
                  </div>
                </div>
                <Badge variant="outline">{rule.isActive ? "Active" : "Disabled"}</Badge>
              </div>
            ))}
            {(!categoryRules || categoryRules.length === 0) && (
              <div className="text-sm text-muted-foreground">No smart rules yet.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <div className="p-6 space-y-6" data-testid="page-transactions">
      <SEO title="Transactions" description="Track transactions, split purchases, and manage tags." />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">
          Add manual transactions, split purchases, and manage smart categorization.
        </p>
      </div>

      <TransactionsContent />
    </div>
  );
}
