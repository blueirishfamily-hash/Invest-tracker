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
import { Progress } from "@/components/ui/progress";
import { Plus } from "lucide-react";
import type { SinkingFund } from "@shared/schema";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const [isFundOpen, setIsFundOpen] = useState(false);

  const [fundForm, setFundForm] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "",
    monthlyContribution: "",
  });


  const { data: funds } = useQuery<SinkingFund[]>({
    queryKey: ["/api/sinking-funds"],
  });

  const fundMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/sinking-funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create sinking fund");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sinking-funds"] });
      setIsFundOpen(false);
      setFundForm({ name: "", targetAmount: "", currentAmount: "", monthlyContribution: "" });
    },
  });

  return (
    <div className="p-6 space-y-6" data-testid="page-goals">
      <SEO title="Goals" description="Sinking funds and debt payoff planning." />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
          <p className="text-muted-foreground">Create savings buckets for your financial goals.</p>
        </div>
        <Dialog open={isFundOpen} onOpenChange={setIsFundOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Fund
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Sinking Fund</DialogTitle>
              <DialogDescription>Create a bucket for a specific goal.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={fundForm.name} onChange={(e) => setFundForm({ ...fundForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Target Amount</Label>
                  <Input
                    type="number"
                    value={fundForm.targetAmount}
                    onChange={(e) => setFundForm({ ...fundForm, targetAmount: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Current Amount</Label>
                  <Input
                    type="number"
                    value={fundForm.currentAmount}
                    onChange={(e) => setFundForm({ ...fundForm, currentAmount: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Monthly Contribution</Label>
                <Input
                  type="number"
                  value={fundForm.monthlyContribution}
                  onChange={(e) => setFundForm({ ...fundForm, monthlyContribution: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() =>
                  fundMutation.mutate({
                    name: fundForm.name,
                    targetAmount: parseFloat(fundForm.targetAmount),
                    currentAmount: parseFloat(fundForm.currentAmount || "0"),
                    monthlyContribution: parseFloat(fundForm.monthlyContribution || "0"),
                    status: "active",
                  })
                }
                disabled={fundMutation.isPending}
              >
                {fundMutation.isPending ? "Saving..." : "Save Fund"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
            {(funds || []).map((fund) => {
              const progress = fund.targetAmount ? Math.min((fund.currentAmount / fund.targetAmount) * 100, 100) : 0;
              return (
                <Card key={fund.id}>
                  <CardHeader>
                    <CardTitle>{fund.name}</CardTitle>
                    <CardDescription>{formatCurrency(fund.currentAmount)} of {formatCurrency(fund.targetAmount)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Progress value={progress} />
                    <div className="text-sm text-muted-foreground">
                      Monthly contribution: {formatCurrency(fund.monthlyContribution)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {(!funds || funds.length === 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>No funds yet</CardTitle>
                  <CardDescription>Add a sinking fund to track progress.</CardDescription>
                </CardHeader>
              </Card>
            )}
      </div>
    </div>
  );
}
