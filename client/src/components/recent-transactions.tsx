import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import type { Transaction, TransactionCategory, FinancialAccount } from "@shared/schema";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export function RecentTransactions() {
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: categories } = useQuery<TransactionCategory[]>({
    queryKey: ["/api/transaction-categories"],
  });

  const { data: accounts } = useQuery<FinancialAccount[]>({
    queryKey: ["/api/financial-accounts"],
  });

  const categoryMap = new Map(categories?.map(cat => [cat.id, cat]) || []);
  const accountMap = new Map(accounts?.map(acc => [acc.id, acc]) || []);

  if (transactionsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest financial activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[175px] space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get recent transactions (last 5, sorted by date descending)
  const recentTransactions = (transactions || [])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  if (recentTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest financial activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[175px] flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">No transactions yet</p>
            <Link href="/transactions" className="text-sm text-primary hover:underline mt-2">
              Add transaction →
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest financial activity</CardDescription>
          </div>
          <Link href="/transactions" className="text-sm text-primary hover:underline">
            View All →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[175px] overflow-y-auto space-y-3">
          {recentTransactions.map((txn) => {
            const category = txn.categoryId ? categoryMap.get(txn.categoryId) : null;
            const account = accountMap.get(txn.accountId);
            const isDebit = txn.direction === "debit";
            const amount = Math.abs(txn.amount);

            return (
              <div
                key={txn.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-1.5 rounded-full ${isDebit ? "bg-destructive/10" : "bg-chart-1/10"}`}>
                    {isDebit ? (
                      <ArrowDownRight className={`h-3.5 w-3.5 ${isDebit ? "text-destructive" : "text-chart-1"}`} />
                    ) : (
                      <ArrowUpRight className={`h-3.5 w-3.5 ${isDebit ? "text-destructive" : "text-chart-1"}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{txn.name}</p>
                      {txn.isVerified && (
                        <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">{formatDate(txn.date)}</p>
                      {category && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <p className="text-xs text-muted-foreground truncate">{category.name}</p>
                        </>
                      )}
                      {account && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <p className="text-xs text-muted-foreground truncate">{account.name}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-semibold tabular-nums ml-2 ${isDebit ? "text-destructive" : "text-chart-1"}`}>
                  {isDebit ? "-" : "+"}{formatCurrency(amount)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
