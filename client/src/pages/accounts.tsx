import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PlaidLink } from "@/components/plaid-link";
import { SEO } from "@/components/seo";
import { Link2, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import type { PlaidAccount } from "@shared/schema";

export default function Accounts() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState<string | null>(null);

  const { data: accounts, isLoading, error } = useQuery<PlaidAccount[]>({
    queryKey: ["/api/plaid/accounts"],
  });

  const handleSync = async (accountId: string) => {
    setSyncing(accountId);
    try {
      const response = await fetch(`/api/plaid/sync/${accountId}`, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        // Invalidate queries to refetch
        queryClient.invalidateQueries({ queryKey: ["/api/holdings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/plaid/accounts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/portfolio/metrics"] });
        queryClient.invalidateQueries({ queryKey: ["/api/benchmark"] });
      } else {
        alert(`Failed to sync: ${data.error}`);
      }
    } catch (error) {
      console.error("Error syncing account:", error);
      alert("Failed to sync account. Please try again.");
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncing("all");
    try {
      const response = await fetch("/api/plaid/sync-all", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        // Invalidate queries to refetch
        queryClient.invalidateQueries({ queryKey: ["/api/holdings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/plaid/accounts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/portfolio/metrics"] });
        queryClient.invalidateQueries({ queryKey: ["/api/benchmark"] });
      } else {
        alert(`Failed to sync all accounts: ${data.error}`);
      }
    } catch (error) {
      console.error("Error syncing all accounts:", error);
      alert("Failed to sync accounts. Please try again.");
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (accountId: string) => {
    try {
      const response = await fetch(`/api/plaid/accounts/${accountId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/plaid/accounts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/holdings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/portfolio/metrics"] });
      } else {
        const data = await response.json();
        alert(`Failed to delete account: ${data.error}`);
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Failed to delete account. Please try again.");
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-accounts">
      <SEO
        title="Accounts"
        description="Manage your connected investment accounts. Connect new accounts via Plaid to sync real holdings data."
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Connected Accounts
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Connect your investment accounts to automatically sync holdings data
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <PlaidLink
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/plaid/accounts"] });
          }}
        />
        {accounts && accounts.length > 0 && (
          <Button
            variant="outline"
            onClick={handleSyncAll}
            disabled={syncing === "all"}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing === "all" ? "animate-spin" : ""}`} />
            Sync All
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">
              Failed to load accounts. Please try again.
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-muted animate-pulse rounded w-1/3 mb-2" />
                <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted animate-pulse rounded" />
                  <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : accounts && accounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Link2 className="h-5 w-5 text-muted-foreground" />
                      {account.accountName}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {account.institutionName}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {account.accountType || "Investment"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {account.accountSubtype && (
                  <div className="text-sm text-muted-foreground">
                    Type: <span className="text-foreground">{account.accountSubtype}</span>
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  Last synced: <span className="text-foreground">{formatDate(account.lastSyncedAt)}</span>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(account.id)}
                    disabled={syncing === account.id}
                    className="flex-1"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing === account.id ? "animate-spin" : ""}`} />
                    Sync
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to disconnect {account.accountName} from {account.institutionName}? 
                          This will remove all associated holdings from your portfolio.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(account.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Link2 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Connected Accounts</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Connect your investment accounts to automatically sync your holdings and portfolio data.
            </p>
            <PlaidLink />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
