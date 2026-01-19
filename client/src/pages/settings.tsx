import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SEO } from "@/components/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supportedCurrencies, type UserPreferences, type SecuritySettings, type TransactionCategory, type TransactionTag } from "@shared/schema";

const strategyOptions = [
  "Very Conservative",
  "Conservative",
  "Moderate",
  "Aggressive",
  "Very Aggressive",
] as const;

const themeOptions = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
] as const;

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<UserPreferences>({
    queryKey: ["/api/settings"],
  });

  const { data: securitySettings } = useQuery<SecuritySettings>({
    queryKey: ["/api/security-settings"],
  });

  const { data: categories } = useQuery<TransactionCategory[]>({
    queryKey: ["/api/transaction-categories"],
  });

  const { data: tags } = useQuery<TransactionTag[]>({
    queryKey: ["/api/transaction-tags"],
  });

  const [formState, setFormState] = useState<UserPreferences | null>(null);
  const [securityState, setSecurityState] = useState<SecuritySettings | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    type: "expense",
    color: "",
  });
  const [tagForm, setTagForm] = useState({ name: "", color: "" });

  useEffect(() => {
    if (settings) {
      setFormState(settings);
    }
  }, [settings]);

  useEffect(() => {
    if (securitySettings) {
      setSecurityState(securitySettings);
    }
  }, [securitySettings]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/settings"], data);
      toast({ title: "Settings updated" });
    },
    onError: () => {
      toast({ title: "Failed to update settings", variant: "destructive" });
    },
  });

  const updateSecurityMutation = useMutation({
    mutationFn: async (updates: Partial<SecuritySettings>) => {
      const res = await fetch("/api/security-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update security settings");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/security-settings"], data);
      toast({ title: "Security settings updated" });
    },
    onError: () => {
      toast({ title: "Failed to update security settings", variant: "destructive" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/transaction-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create category");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transaction-categories"] });
      setCategoryForm({ name: "", type: "expense", color: "" });
      toast({ title: "Category created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create category", description: error.message, variant: "destructive" });
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/transaction-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create tag");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transaction-tags"] });
      setTagForm({ name: "", color: "" });
      toast({ title: "Tag created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create tag", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!formState) return;
    updateMutation.mutate(formState);
  };

  if (isLoading || !formState) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <SEO title="Settings | Sila" description="Manage your account preferences" />
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Loading your preferences...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <SEO title="Settings | Sila" description="Manage your account preferences" />

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and personalization
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Preferences</CardTitle>
          <CardDescription>Customize how Sila works for you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Portfolio Strategy</Label>
            <Select
              value={formState.portfolioStrategy}
              onValueChange={(value) =>
                setFormState((prev) => prev ? { ...prev, portfolioStrategy: value as UserPreferences["portfolioStrategy"] } : prev)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                {strategyOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Age</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={formState.currentAge}
                onChange={(e) =>
                  setFormState((prev) => prev ? { ...prev, currentAge: Number(e.target.value) } : prev)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Retirement Age</Label>
              <Input
                type="number"
                min={40}
                max={100}
                value={formState.retirementAge}
                onChange={(e) =>
                  setFormState((prev) => prev ? { ...prev, retirementAge: Number(e.target.value) } : prev)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Display Currency</Label>
            <Select
              value={formState.displayCurrency}
              onValueChange={(value) =>
                setFormState((prev) => prev ? { ...prev, displayCurrency: value } : prev)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {supportedCurrencies.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Theme Preference</Label>
            <Select
              value={formState.themePreference}
              onValueChange={(value) =>
                setFormState((prev) => prev ? { ...prev, themePreference: value as UserPreferences["themePreference"] } : prev)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                {themeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cash Flow Chart Type</Label>
            <Select
              value={formState.cashFlowChartType}
              onValueChange={(value) =>
                setFormState((prev) => prev ? { ...prev, cashFlowChartType: value as UserPreferences["cashFlowChartType"] } : prev)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select chart type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pie">Pie Chart</SelectItem>
                <SelectItem value="horizontalBar">Horizontal Bar Chart</SelectItem>
                <SelectItem value="sankey">Sankey Diagram</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Default chart type for the Cash Flow page
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive updates about portfolio activity and alerts
              </p>
            </div>
            <Switch
              checked={formState.emailNotifications}
              onCheckedChange={(checked) =>
                setFormState((prev) => prev ? { ...prev, emailNotifications: checked } : prev)
              }
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Transaction Categories & Tags</CardTitle>
          <CardDescription>Create custom categories and tags for organizing transactions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Custom Categories</CardTitle>
                <CardDescription>Create categories that match your spending habits.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input
                    value={categoryForm.name}
                    onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select
                    value={categoryForm.type}
                    onValueChange={(value) => setCategoryForm({ ...categoryForm, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Color (optional)</Label>
                  <Input
                    value={categoryForm.color}
                    onChange={(event) => setCategoryForm({ ...categoryForm, color: event.target.value })}
                    placeholder="#22C55E"
                  />
                </div>
                <Button
                  onClick={() =>
                    createCategoryMutation.mutate({
                      name: categoryForm.name,
                      type: categoryForm.type,
                      color: categoryForm.color || undefined,
                      isSystem: false,
                    })
                  }
                  disabled={createCategoryMutation.isPending || !categoryForm.name}
                >
                  {createCategoryMutation.isPending ? "Saving..." : "Add Category"}
                </Button>
                <div className="text-xs text-muted-foreground pt-2">
                  {categories?.filter(c => !c.isSystem).length || 0} custom categories
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tags</CardTitle>
                <CardDescription>Label transactions with custom tags.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input
                    value={tagForm.name}
                    onChange={(event) => setTagForm({ ...tagForm, name: event.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Color (optional)</Label>
                  <Input
                    value={tagForm.color}
                    onChange={(event) => setTagForm({ ...tagForm, color: event.target.value })}
                    placeholder="#6366F1"
                  />
                </div>
                <Button
                  onClick={() =>
                    createTagMutation.mutate({
                      name: tagForm.name,
                      color: tagForm.color || undefined,
                    })
                  }
                  disabled={createTagMutation.isPending || !tagForm.name}
                >
                  {createTagMutation.isPending ? "Saving..." : "Add Tag"}
                </Button>
                <div className="text-xs text-muted-foreground pt-2">
                  {tags?.length || 0} tags
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Extra safeguards for your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Multi-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">Add a second step for sign-in.</p>
            </div>
            <Switch
              checked={securityState?.mfaEnabled ?? false}
              onCheckedChange={(checked) =>
                setSecurityState((prev) => (prev ? { ...prev, mfaEnabled: checked } : prev))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Biometric Login</p>
              <p className="text-sm text-muted-foreground">
                Use FaceID or fingerprint when available.
              </p>
            </div>
            <Switch
              checked={securityState?.biometricEnabled ?? false}
              onCheckedChange={(checked) =>
                setSecurityState((prev) => (prev ? { ...prev, biometricEnabled: checked } : prev))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">256-bit Encryption</p>
              <p className="text-sm text-muted-foreground">Encrypted in transit and at rest.</p>
            </div>
            <Switch
              checked={securityState?.encryptionEnabled ?? true}
              onCheckedChange={(checked) =>
                setSecurityState((prev) => (prev ? { ...prev, encryptionEnabled: checked } : prev))
              }
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => securityState && updateSecurityMutation.mutate(securityState)}
              disabled={updateSecurityMutation.isPending}
            >
              {updateSecurityMutation.isPending ? "Saving..." : "Save Security Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
