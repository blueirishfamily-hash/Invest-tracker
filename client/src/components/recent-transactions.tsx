import type { ReactNode } from "react";
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

export function RecentTransactions({
  size = "medium",
  sizeSelector,
  cardClassName,
}: {
  size?: "small" | "medium" | "large";
  sizeSelector?: ReactNode;
  cardClassName?: string;
}) {
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
      <Card className={cardClassName}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest financial activity</CardDescription>
            </div>
            {sizeSelector}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get recent transactions (last 3, sorted by date descending)
  const recentTransactions = (transactions || [])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const netAcrossThree = size === "large"
    ? recentTransactions.reduce((sum, txn) => {
        const amount = Math.abs(txn.amount);
        return sum + (txn.direction === "credit" ? amount : -amount);
      }, 0)
    : 0;

  if (recentTransactions.length === 0) {
    return (
      <Card className={cardClassName}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest financial activity</CardDescription>
            </div>
            {sizeSelector}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center py-6">
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
    <Card className={cardClassName}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest financial activity</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/transactions" className="text-sm text-primary hover:underline">
              View All →
            </Link>
            {sizeSelector}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`${size === "small" ? "space-y-2" : "space-y-3"}`}>
          {recentTransactions.map((txn) => {
            const category = txn.categoryId ? categoryMap.get(txn.categoryId) : null;
            const account = accountMap.get(txn.accountId);
            const isDebit = txn.direction === "debit";
            const amount = Math.abs(txn.amount);

            return (
              <div
                key={txn.id}
                className={`flex items-center justify-between rounded-lg hover:bg-muted/50 transition-colors ${size === "small" ? "p-1.5" : "p-2"}`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`rounded-full ${isDebit ? "bg-destructive/10" : "bg-chart-1/10"} ${size === "small" ? "p-1" : "p-1.5"}`}>
                    {isDebit ? (
                      <ArrowDownRight className={`${size === "small" ? "h-3 w-3" : "h-3.5 w-3.5"} ${isDebit ? "text-destructive" : "text-chart-1"}`} />
                    ) : (
                      <ArrowUpRight className={`${size === "small" ? "h-3 w-3" : "h-3.5 w-3.5"} ${isDebit ? "text-destructive" : "text-chart-1"}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`${size === "small" ? "text-xs" : "text-sm"} font-medium truncate`}>{txn.name}</p>
                      {size === "large" && txn.isVerified && (
                        <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className={`${size === "small" ? "text-[10px]" : "text-xs"} text-muted-foreground`}>{formatDate(txn.date)}</p>
                      {size === "large" && category && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <p className={`${size === "small" ? "text-[10px]" : "text-xs"} text-muted-foreground truncate`}>{category.name}</p>
                        </>
                      )}
                      {size === "large" && account && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <p className={`${size === "small" ? "text-[10px]" : "text-xs"} text-muted-foreground truncate`}>{account.name}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className={`${size === "small" ? "text-xs" : "text-sm"} font-semibold tabular-nums ml-2 ${isDebit ? "text-destructive" : "text-chart-1"}`}>
                  {isDebit ? "-" : "+"}{formatCurrency(amount)}
                </div>
              </div>
            );
          })}
        </div>
        {size === "large" && recentTransactions.length > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Net across last 3</div>
            <div className={`text-sm font-semibold tabular-nums ${netAcrossThree >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {netAcrossThree >= 0 ? "+" : "-"}{formatCurrency(Math.abs(netAcrossThree))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
