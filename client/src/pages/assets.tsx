import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SEO } from "@/components/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Home, Bitcoin, Gem, Briefcase, Plus, Trash2, Edit, DollarSign, TrendingUp, TrendingDown, Building, Car, Watch, Palette, BarChart3 } from "lucide-react";
import type { RealEstate, CryptoAsset, Collectible, AlternativeInvestment, NetWorthSummary, Holding } from "@shared/schema";
import { HoldingsTab } from "./holdings";
import { WholeViewTab } from "@/components/whole-view-treemap";

// Format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyDetailed = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Net Worth Summary Card
function NetWorthCard() {
  const { data: netWorth, isLoading } = useQuery<NetWorthSummary>({
    queryKey: ["/api/net-worth"],
  });

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-32 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!netWorth) return null;

  const categories = [
    { label: "Stocks & ETFs", value: netWorth.stocksAndETFs, icon: TrendingUp, color: "text-blue-500" },
    { label: "Real Estate", value: netWorth.realEstate, icon: Home, color: "text-green-500" },
    { label: "Crypto", value: netWorth.crypto, icon: Bitcoin, color: "text-orange-500" },
    { label: "Collectibles", value: netWorth.collectibles, icon: Gem, color: "text-purple-500" },
    { label: "Alt Investments", value: netWorth.alternativeInvestments, icon: Briefcase, color: "text-cyan-500" },
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Net Worth Summary
        </CardTitle>
        <CardDescription>Total value across all asset classes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="text-3xl font-bold">{formatCurrency(netWorth.netEquity)}</div>
          <div className="text-sm text-muted-foreground">
            Total Assets: {formatCurrency(netWorth.totalNetWorth)} | Liabilities: {formatCurrency(netWorth.totalLiabilities)}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <div key={cat.label} className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-1">
                <cat.icon className={`h-4 w-4 ${cat.color}`} />
                <span className="text-xs text-muted-foreground">{cat.label}</span>
              </div>
              <div className="font-semibold">{formatCurrency(cat.value)}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Real Estate Tab
function RealEstateTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    propertyName: "",
    propertyAddress: "",
    propertyType: "Primary Residence" as RealEstate["propertyType"],
    estimatedValue: "",
    purchasePrice: "",
    purchaseDate: "",
    mortgageBalance: "",
    monthlyPayment: "",
    interestRate: "",
    lender: "",
    rentalIncome: "",
    notes: "",
  });

  const { data: properties, isLoading } = useQuery<RealEstate[]>({
    queryKey: ["/api/real-estate"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/real-estate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create property");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/real-estate"] });
      queryClient.invalidateQueries({ queryKey: ["/api/net-worth"] });
      setIsAddOpen(false);
      resetForm();
      toast({ title: "Property added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add property", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/real-estate/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete property");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/real-estate"] });
      queryClient.invalidateQueries({ queryKey: ["/api/net-worth"] });
      toast({ title: "Property deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete property", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      propertyName: "",
      propertyAddress: "",
      propertyType: "Primary Residence",
      estimatedValue: "",
      purchasePrice: "",
      purchaseDate: "",
      mortgageBalance: "",
      monthlyPayment: "",
      interestRate: "",
      lender: "",
      rentalIncome: "",
      notes: "",
    });
  };

  const handleSubmit = () => {
    createMutation.mutate({
      ...formData,
      estimatedValue: parseFloat(formData.estimatedValue) || 0,
      purchasePrice: parseFloat(formData.purchasePrice) || 0,
      mortgageBalance: formData.mortgageBalance ? parseFloat(formData.mortgageBalance) : undefined,
      monthlyPayment: formData.monthlyPayment ? parseFloat(formData.monthlyPayment) : undefined,
      interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
      rentalIncome: formData.rentalIncome ? parseFloat(formData.rentalIncome) : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Real Estate Properties</h3>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add Property
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Real Estate Property</DialogTitle>
              <DialogDescription>Enter the details of your property</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Property Name</Label>
                  <Input
                    placeholder="e.g., Beach House"
                    value={formData.propertyName}
                    onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Property Type</Label>
                  <Select
                    value={formData.propertyType}
                    onValueChange={(value) => setFormData({ ...formData, propertyType: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Primary Residence">Primary Residence</SelectItem>
                      <SelectItem value="Vacation Home">Vacation Home</SelectItem>
                      <SelectItem value="Rental">Rental Property</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="Land">Land</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Property Address</Label>
                <Input
                  placeholder="Full address"
                  value={formData.propertyAddress}
                  onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estimated Value ($)</Label>
                  <Input
                    type="number"
                    placeholder="Current market value"
                    value={formData.estimatedValue}
                    onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Purchase Price ($)</Label>
                  <Input
                    type="number"
                    placeholder="Original purchase price"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Purchase Date</Label>
                  <Input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Mortgage Balance ($)</Label>
                  <Input
                    type="number"
                    placeholder="Remaining balance"
                    value={formData.mortgageBalance}
                    onChange={(e) => setFormData({ ...formData, mortgageBalance: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Monthly Payment ($)</Label>
                  <Input
                    type="number"
                    value={formData.monthlyPayment}
                    onChange={(e) => setFormData({ ...formData, monthlyPayment: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Interest Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.interestRate}
                    onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Lender</Label>
                  <Input
                    value={formData.lender}
                    onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
                  />
                </div>
              </div>
              {formData.propertyType === "Rental" && (
                <div>
                  <Label>Monthly Rental Income ($)</Label>
                  <Input
                    type="number"
                    value={formData.rentalIncome}
                    onChange={(e) => setFormData({ ...formData, rentalIncome: e.target.value })}
                  />
                </div>
              )}
              <div>
                <Label>Notes</Label>
                <Input
                  placeholder="Additional details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Property"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {properties && properties.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No real estate properties added yet</p>
            <p className="text-sm">Click "Add Property" to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {properties?.map((property) => {
            const equity = property.estimatedValue - (property.mortgageBalance || 0);
            const gain = property.estimatedValue - property.purchasePrice;
            const gainPercent = (gain / property.purchasePrice) * 100;

            return (
              <Card key={property.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        {property.propertyName || "Property"}
                      </CardTitle>
                      <CardDescription className="mt-1">{property.propertyAddress}</CardDescription>
                    </div>
                    <Badge variant="outline">{property.propertyType}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Estimated Value</div>
                      <div className="text-xl font-bold">{formatCurrency(property.estimatedValue)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Equity</div>
                      <div className="text-xl font-bold text-green-500">{formatCurrency(equity)}</div>
                    </div>
                  </div>
                  {property.mortgageBalance && (
                    <div className="grid grid-cols-3 gap-2 text-sm mb-4">
                      <div>
                        <div className="text-muted-foreground">Mortgage</div>
                        <div>{formatCurrency(property.mortgageBalance)}</div>
                      </div>
                      {property.monthlyPayment && (
                        <div>
                          <div className="text-muted-foreground">Monthly</div>
                          <div>{formatCurrency(property.monthlyPayment)}</div>
                        </div>
                      )}
                      {property.interestRate && (
                        <div>
                          <div className="text-muted-foreground">Rate</div>
                          <div>{property.interestRate}%</div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <div className={`flex items-center gap-1 text-sm ${gain >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {gain >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {formatCurrency(Math.abs(gain))} ({gainPercent.toFixed(1)}%)
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(property.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Crypto Tab
function CryptoTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    symbol: "",
    name: "",
    quantity: "",
    costBasis: "",
    currentPrice: "0",
    currentValue: "0",
    walletName: "",
    exchange: "",
    notes: "",
  });

  const { data: assets, isLoading } = useQuery<CryptoAsset[]>({
    queryKey: ["/api/crypto"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/crypto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create crypto asset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crypto"] });
      queryClient.invalidateQueries({ queryKey: ["/api/net-worth"] });
      setIsAddOpen(false);
      resetForm();
      toast({ title: "Crypto asset added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add crypto asset", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/crypto/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete crypto asset");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crypto"] });
      queryClient.invalidateQueries({ queryKey: ["/api/net-worth"] });
      toast({ title: "Crypto asset deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete crypto asset", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      symbol: "",
      name: "",
      quantity: "",
      costBasis: "",
      currentPrice: "0",
      currentValue: "0",
      walletName: "",
      exchange: "",
      notes: "",
    });
  };

  const handleSubmit = () => {
    createMutation.mutate({
      ...formData,
      symbol: formData.symbol.toUpperCase(),
      quantity: parseFloat(formData.quantity) || 0,
      costBasis: parseFloat(formData.costBasis) || 0,
      currentPrice: parseFloat(formData.currentPrice) || 0,
      currentValue: parseFloat(formData.currentValue) || 0,
      isNFT: false,
    });
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalValue = assets?.reduce((sum, a) => sum + a.currentValue, 0) || 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Cryptocurrency Holdings</h3>
          <p className="text-sm text-muted-foreground">Total: {formatCurrency(totalValue)}</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add Crypto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Cryptocurrency</DialogTitle>
              <DialogDescription>Enter your crypto holding details. Price will be fetched automatically.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Symbol</Label>
                  <Input
                    placeholder="e.g., BTC"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input
                    placeholder="e.g., Bitcoin"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="Amount held"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Cost Basis ($)</Label>
                  <Input
                    type="number"
                    placeholder="Total invested"
                    value={formData.costBasis}
                    onChange={(e) => setFormData({ ...formData, costBasis: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Wallet/Location</Label>
                  <Input
                    placeholder="e.g., Ledger, MetaMask"
                    value={formData.walletName}
                    onChange={(e) => setFormData({ ...formData, walletName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Exchange</Label>
                  <Input
                    placeholder="e.g., Coinbase"
                    value={formData.exchange}
                    onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  placeholder="Additional details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Crypto"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {assets && assets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bitcoin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No cryptocurrency holdings added yet</p>
            <p className="text-sm">Click "Add Crypto" to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assets?.map((asset) => {
            const gain = asset.currentValue - asset.costBasis;
            const gainPercent = asset.costBasis > 0 ? (gain / asset.costBasis) * 100 : 0;

            return (
              <Card key={asset.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Bitcoin className="h-5 w-5 text-orange-500" />
                        {asset.symbol}
                      </CardTitle>
                      <CardDescription>{asset.name}</CardDescription>
                    </div>
                    {asset.walletName && (
                      <Badge variant="outline">{asset.walletName}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Quantity</div>
                      <div className="font-bold">{asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Price</div>
                      <div className="font-bold">{formatCurrencyDetailed(asset.currentPrice)}</div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-sm text-muted-foreground">Current Value</div>
                    <div className="text-xl font-bold">{formatCurrency(asset.currentValue)}</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className={`flex items-center gap-1 text-sm ${gain >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {gain >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {formatCurrency(Math.abs(gain))} ({gainPercent.toFixed(1)}%)
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(asset.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Collectibles Tab
function CollectiblesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "Other" as Collectible["category"],
    description: "",
    estimatedValue: "",
    purchasePrice: "",
    purchaseDate: "",
    condition: "" as Collectible["condition"] | "",
    location: "",
    insured: false,
    insuranceValue: "",
    notes: "",
  });

  const { data: collectibles, isLoading } = useQuery<Collectible[]>({
    queryKey: ["/api/collectibles"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/collectibles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create collectible");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collectibles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/net-worth"] });
      setIsAddOpen(false);
      resetForm();
      toast({ title: "Collectible added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add collectible", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/collectibles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete collectible");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collectibles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/net-worth"] });
      toast({ title: "Collectible deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete collectible", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      category: "Other",
      description: "",
      estimatedValue: "",
      purchasePrice: "",
      purchaseDate: "",
      condition: "",
      location: "",
      insured: false,
      insuranceValue: "",
      notes: "",
    });
  };

  const handleSubmit = () => {
    createMutation.mutate({
      ...formData,
      estimatedValue: parseFloat(formData.estimatedValue) || 0,
      purchasePrice: parseFloat(formData.purchasePrice) || 0,
      condition: formData.condition || undefined,
      insuranceValue: formData.insuranceValue ? parseFloat(formData.insuranceValue) : undefined,
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Watches": return Watch;
      case "Art": return Palette;
      case "Cars": return Car;
      default: return Gem;
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalValue = collectibles?.reduce((sum, c) => sum + c.estimatedValue, 0) || 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Collectibles & Passion Assets</h3>
          <p className="text-sm text-muted-foreground">Total: {formatCurrency(totalValue)}</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add Collectible
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Collectible</DialogTitle>
              <DialogDescription>Track your watches, art, cars, and other valuable collectibles</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    placeholder="e.g., Rolex Submariner"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Art">Art</SelectItem>
                      <SelectItem value="Watches">Watches</SelectItem>
                      <SelectItem value="Cars">Cars</SelectItem>
                      <SelectItem value="Wine">Wine</SelectItem>
                      <SelectItem value="Jewelry">Jewelry</SelectItem>
                      <SelectItem value="Coins">Coins</SelectItem>
                      <SelectItem value="Stamps">Stamps</SelectItem>
                      <SelectItem value="Sports Memorabilia">Sports Memorabilia</SelectItem>
                      <SelectItem value="Antiques">Antiques</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  placeholder="Details about the item..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estimated Value ($)</Label>
                  <Input
                    type="number"
                    value={formData.estimatedValue}
                    onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Purchase Price ($)</Label>
                  <Input
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Purchase Date</Label>
                  <Input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Condition</Label>
                  <Select
                    value={formData.condition}
                    onValueChange={(value) => setFormData({ ...formData, condition: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mint">Mint</SelectItem>
                      <SelectItem value="Excellent">Excellent</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Fair">Fair</SelectItem>
                      <SelectItem value="Poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g., Safe deposit box"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Collectible"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {collectibles && collectibles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Gem className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No collectibles added yet</p>
            <p className="text-sm">Click "Add Collectible" to track your passion assets</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collectibles?.map((item) => {
            const Icon = getCategoryIcon(item.category);
            const gain = item.estimatedValue - item.purchasePrice;
            const gainPercent = item.purchasePrice > 0 ? (gain / item.purchasePrice) * 100 : 0;

            return (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-purple-500" />
                        {item.name}
                      </CardTitle>
                      {item.description && (
                        <CardDescription className="line-clamp-1">{item.description}</CardDescription>
                      )}
                    </div>
                    <Badge variant="outline">{item.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Estimated Value</div>
                      <div className="text-xl font-bold">{formatCurrency(item.estimatedValue)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Purchase Price</div>
                      <div className="font-medium">{formatCurrency(item.purchasePrice)}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.condition && <Badge variant="secondary">{item.condition}</Badge>}
                    {item.insured && <Badge variant="secondary">Insured</Badge>}
                    {item.location && <Badge variant="outline">{item.location}</Badge>}
                  </div>
                  <div className="flex justify-between items-center">
                    <div className={`flex items-center gap-1 text-sm ${gain >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {gain >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {formatCurrency(Math.abs(gain))} ({gainPercent.toFixed(1)}%)
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Alternative Investments Tab
function AlternativeInvestmentsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "Private Equity" as AlternativeInvestment["type"],
    manager: "",
    committedCapital: "",
    calledCapital: "",
    currentNAV: "",
    distributions: "0",
    vintage: "",
    investmentDate: "",
    expectedMaturity: "",
    irr: "",
    multiple: "",
    notes: "",
  });

  const { data: investments, isLoading } = useQuery<AlternativeInvestment[]>({
    queryKey: ["/api/alternative-investments"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/alternative-investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create investment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alternative-investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/net-worth"] });
      setIsAddOpen(false);
      resetForm();
      toast({ title: "Investment added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add investment", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/alternative-investments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete investment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alternative-investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/net-worth"] });
      toast({ title: "Investment deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete investment", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "Private Equity",
      manager: "",
      committedCapital: "",
      calledCapital: "",
      currentNAV: "",
      distributions: "0",
      vintage: "",
      investmentDate: "",
      expectedMaturity: "",
      irr: "",
      multiple: "",
      notes: "",
    });
  };

  const handleSubmit = () => {
    createMutation.mutate({
      ...formData,
      committedCapital: parseFloat(formData.committedCapital) || 0,
      calledCapital: parseFloat(formData.calledCapital) || 0,
      currentNAV: parseFloat(formData.currentNAV) || 0,
      distributions: parseFloat(formData.distributions) || 0,
      irr: formData.irr ? parseFloat(formData.irr) : undefined,
      multiple: formData.multiple ? parseFloat(formData.multiple) : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalNAV = investments?.reduce((sum, i) => sum + i.currentNAV, 0) || 0;
  const totalCommitted = investments?.reduce((sum, i) => sum + i.committedCapital, 0) || 0;
  const totalCalled = investments?.reduce((sum, i) => sum + i.calledCapital, 0) || 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Alternative Investments</h3>
          <p className="text-sm text-muted-foreground">
            NAV: {formatCurrency(totalNAV)} | Called: {formatCurrency(totalCalled)} / {formatCurrency(totalCommitted)}
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add Investment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Alternative Investment</DialogTitle>
              <DialogDescription>Track PE, VC, hedge funds, and other alternative investments</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Investment Name</Label>
                  <Input
                    placeholder="e.g., Sequoia Capital Fund XV"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Private Equity">Private Equity</SelectItem>
                      <SelectItem value="Venture Capital">Venture Capital</SelectItem>
                      <SelectItem value="Hedge Fund">Hedge Fund</SelectItem>
                      <SelectItem value="Angel Investment">Angel Investment</SelectItem>
                      <SelectItem value="Real Estate Fund">Real Estate Fund</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fund Manager / GP</Label>
                  <Input
                    placeholder="Manager name"
                    value={formData.manager}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Vintage Year</Label>
                  <Input
                    placeholder="e.g., 2022"
                    value={formData.vintage}
                    onChange={(e) => setFormData({ ...formData, vintage: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Committed Capital ($)</Label>
                  <Input
                    type="number"
                    value={formData.committedCapital}
                    onChange={(e) => setFormData({ ...formData, committedCapital: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Called Capital ($)</Label>
                  <Input
                    type="number"
                    value={formData.calledCapital}
                    onChange={(e) => setFormData({ ...formData, calledCapital: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Current NAV ($)</Label>
                  <Input
                    type="number"
                    value={formData.currentNAV}
                    onChange={(e) => setFormData({ ...formData, currentNAV: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Distributions ($)</Label>
                  <Input
                    type="number"
                    value={formData.distributions}
                    onChange={(e) => setFormData({ ...formData, distributions: e.target.value })}
                  />
                </div>
                <div>
                  <Label>IRR (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Optional"
                    value={formData.irr}
                    onChange={(e) => setFormData({ ...formData, irr: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Multiple (TVPI)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 1.5x"
                    value={formData.multiple}
                    onChange={(e) => setFormData({ ...formData, multiple: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Investment Date</Label>
                  <Input
                    type="date"
                    value={formData.investmentDate}
                    onChange={(e) => setFormData({ ...formData, investmentDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Expected Maturity</Label>
                  <Input
                    type="date"
                    value={formData.expectedMaturity}
                    onChange={(e) => setFormData({ ...formData, expectedMaturity: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  placeholder="Additional details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Investment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {investments && investments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No alternative investments added yet</p>
            <p className="text-sm">Click "Add Investment" to track PE, VC, and other alternatives</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {investments?.map((investment) => {
            const unfunded = investment.committedCapital - investment.calledCapital;
            const calledPercent = investment.committedCapital > 0
              ? (investment.calledCapital / investment.committedCapital) * 100
              : 0;

            return (
              <Card key={investment.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-cyan-500" />
                        {investment.name}
                      </CardTitle>
                      {investment.manager && (
                        <CardDescription>{investment.manager}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{investment.type}</Badge>
                      {investment.vintage && (
                        <Badge variant="secondary">Vintage {investment.vintage}</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Current NAV</div>
                      <div className="text-xl font-bold">{formatCurrency(investment.currentNAV)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Committed</div>
                      <div className="font-medium">{formatCurrency(investment.committedCapital)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Called</div>
                      <div className="font-medium">
                        {formatCurrency(investment.calledCapital)} ({calledPercent.toFixed(0)}%)
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Unfunded</div>
                      <div className="font-medium">{formatCurrency(unfunded)}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 mb-4">
                    {investment.distributions > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Distributions: </span>
                        <span className="font-medium text-green-500">{formatCurrency(investment.distributions)}</span>
                      </div>
                    )}
                    {investment.irr !== undefined && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">IRR: </span>
                        <span className={`font-medium ${investment.irr >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {investment.irr.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {investment.multiple !== undefined && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Multiple: </span>
                        <span className="font-medium">{investment.multiple.toFixed(2)}x</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(investment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Main Assets Page
export default function AssetsPage() {
  return (
    <>
      <SEO
        title="Assets | Sila"
        description="Track all your assets including real estate, crypto, collectibles, and alternative investments"
      />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Assets</h1>
          <p className="text-muted-foreground">
            Track and manage all your asset classes in one place
          </p>
        </div>

        <NetWorthCard />

        <Tabs defaultValue="holdings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="holdings" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Holdings</span>
            </TabsTrigger>
            <TabsTrigger value="real-estate" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Real Estate</span>
            </TabsTrigger>
            <TabsTrigger value="crypto" className="flex items-center gap-2">
              <Bitcoin className="h-4 w-4" />
              <span className="hidden sm:inline">Crypto</span>
            </TabsTrigger>
            <TabsTrigger value="collectibles" className="flex items-center gap-2">
              <Gem className="h-4 w-4" />
              <span className="hidden sm:inline">Collectibles</span>
            </TabsTrigger>
            <TabsTrigger value="alternative" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Alt Investments</span>
            </TabsTrigger>
            <TabsTrigger value="whole-view" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Whole View</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="holdings">
            <HoldingsTab />
          </TabsContent>

          <TabsContent value="real-estate">
            <RealEstateTab />
          </TabsContent>

          <TabsContent value="crypto">
            <CryptoTab />
          </TabsContent>

          <TabsContent value="collectibles">
            <CollectiblesTab />
          </TabsContent>

          <TabsContent value="alternative">
            <AlternativeInvestmentsTab />
          </TabsContent>

          <TabsContent value="whole-view">
            <WholeViewTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
