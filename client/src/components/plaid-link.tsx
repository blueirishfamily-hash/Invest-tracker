import { useState, useEffect, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

interface PlaidLinkProps {
  onSuccess?: () => void;
  disabled?: boolean;
}

export function PlaidLink({ onSuccess, disabled }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Fetch link token
    fetch("/api/plaid/link-token", {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.linkToken) {
          setLinkToken(data.linkToken);
        } else {
          console.error("Failed to get link token:", data.error);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching link token:", error);
        setLoading(false);
      });
  }, []);

  const onSuccessCallback = useCallback(
    async (publicToken: string, metadata: any) => {
      try {
        const response = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ publicToken }),
        });

        const data = await response.json();

        if (response.ok) {
          // Invalidate accounts query to refetch
          queryClient.invalidateQueries({ queryKey: ["/api/plaid/accounts"] });
          queryClient.invalidateQueries({ queryKey: ["/api/holdings"] });
          
          if (onSuccess) {
            onSuccess();
          }
        } else {
          console.error("Failed to exchange token:", data.error);
          alert(`Failed to connect account: ${data.error}`);
        }
      } catch (error) {
        console.error("Error exchanging token:", error);
        alert("Failed to connect account. Please try again.");
      }
    },
    [onSuccess, queryClient]
  );

  const onExit = useCallback((err: any, metadata: any) => {
    if (err) {
      console.error("Plaid Link error:", err);
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onSuccessCallback,
    onExit,
  });

  if (loading) {
    return (
      <Button disabled>
        <Plus className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  if (!linkToken) {
    return (
      <Button disabled variant="outline">
        <Plus className="h-4 w-4 mr-2" />
        Plaid Not Configured
      </Button>
    );
  }

  return (
    <Button
      onClick={() => open()}
      disabled={!ready || disabled}
    >
      <Plus className="h-4 w-4 mr-2" />
      Add Account
    </Button>
  );
}
