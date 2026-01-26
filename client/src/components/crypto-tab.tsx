import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Wallet,
  Building2,
  Image as ImageIcon,
  ArrowUpDown,
  DollarSign,
  PieChart
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CryptoAsset } from "@shared/schema";
import { CryptoChart } from "./crypto-chart";
import { CryptoAddDialog } from "./crypto-add-dialog";
import { CryptoCandlestickChart } from "./crypto-candlestick-chart";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatPercent = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

type SortField = "value" | "gainLoss" | "gainLossPercent" | "change24h" | "name";
type SortDirection = "asc" | "desc";

export function CryptoTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [exchangeFilter, setExchangeFilter] = useState<string>("all");
  const [walletFilter, setWalletFilter] = useState<string>("all");
  const [nftFilter, setNftFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedAsset, setSelectedAsset] = useState<CryptoAsset | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("30d");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: assets, isLoading } = useQuery<CryptoAsset[]>({
    queryKey: ["/api/crypto"],
  });

  const { data: marketData } = useQuery<any[]>({
    queryKey: ["/api/crypto/market"],
    queryFn: async () => {
      const response = await fetch("/api/crypto/market?limit=20");
      if (!response.ok) throw new Error("Failed to fetch market data");
      return response.json();
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

  // Calculate portfolio metrics
  const portfolioMetrics = useMemo(() => {
    if (!assets || assets.length === 0) {
      return {
        totalValue: 0,
        totalCostBasis: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        assetCount: 0,
        nftCount: 0,
      };
    }

    const totalValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
    const totalCostBasis = assets.reduce((sum, a) => sum + a.costBasis, 0);
    const totalGainLoss = totalValue - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;
    const nftCount = assets.filter(a => a.isNFT).length;

    return {
      totalValue,
      totalCostBasis,
      totalGainLoss,
      totalGainLossPercent,
      assetCount: assets.length,
      nftCount,
    };
  }, [assets]);

  // Get unique exchanges and wallets for filters
  const exchanges = useMemo(() => {
    if (!assets) return [];
    const unique = new Set(assets.map(a => a.exchange).filter(Boolean));
    return Array.from(unique).sort();
  }, [assets]);

  const wallets = useMemo(() => {
    if (!assets) return [];
    const unique = new Set(assets.map(a => a.walletName).filter(Boolean));
    return Array.from(unique).sort();
  }, [assets]);

  // Filter and sort assets
  const filteredAndSortedAssets = useMemo(() => {
    if (!assets) return [];

    let filtered = assets.filter((asset) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          asset.symbol.toLowerCase().includes(query) ||
          asset.name.toLowerCase().includes(query) ||
          asset.exchange?.toLowerCase().includes(query) ||
          asset.walletName?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Exchange filter
      if (exchangeFilter !== "all" && asset.exchange !== exchangeFilter) return false;

      // Wallet filter
      if (walletFilter !== "all" && asset.walletName !== walletFilter) return false;

      // NFT filter
      if (nftFilter === "nft" && !asset.isNFT) return false;
      if (nftFilter === "crypto" && asset.isNFT) return false;

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "value":
          comparison = a.currentValue - b.currentValue;
          break;
        case "gainLoss":
          const gainA = a.currentValue - a.costBasis;
          const gainB = b.currentValue - b.costBasis;
          comparison = gainA - gainB;
          break;
        case "gainLossPercent":
          const percentA = a.costBasis > 0 ? ((a.currentValue - a.costBasis) / a.costBasis) * 100 : 0;
          const percentB = b.costBasis > 0 ? ((b.currentValue - b.costBasis) / b.costBasis) * 100 : 0;
          comparison = percentA - percentB;
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        default:
          comparison = 0;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [assets, searchQuery, exchangeFilter, walletFilter, nftFilter, sortField, sortDirection]);

  // Top performers
  const topPerformer = useMemo(() => {
    if (!filteredAndSortedAssets.length) return null;
    return filteredAndSortedAssets.reduce((prev, current) => {
      const prevGain = prev.currentValue - prev.costBasis;
      const currentGain = current.currentValue - current.costBasis;
      return currentGain > prevGain ? current : prev;
    });
  }, [filteredAndSortedAssets]);

  const worstPerformer = useMemo(() => {
    if (!filteredAndSortedAssets.length) return null;
    return filteredAndSortedAssets.reduce((prev, current) => {
      const prevGain = prev.currentValue - prev.costBasis;
      const currentGain = current.currentValue - current.costBasis;
      return currentGain < prevGain ? current : prev;
    });
  }, [filteredAndSortedAssets]);

  // Allocation data for pie chart
  const allocationData = useMemo(() => {
    if (!filteredAndSortedAssets.length) return [];
    return filteredAndSortedAssets
      .map(asset => ({
        name: asset.symbol,
        value: asset.currentValue,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredAndSortedAssets]);

  // Exchange breakdown
  const exchangeBreakdown = useMemo(() => {
    if (!filteredAndSortedAssets.length) return [];
    const exchangeMap = new Map<string, number>();
    filteredAndSortedAssets.forEach(asset => {
      const exchange = asset.exchange || "Unknown";
      exchangeMap.set(exchange, (exchangeMap.get(exchange) || 0) + asset.currentValue);
    });
    return Array.from(exchangeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredAndSortedAssets]);

  // NFT assets
  const nftAssets = useMemo(() => {
    return filteredAndSortedAssets.filter(a => a.isNFT);
  }, [filteredAndSortedAssets]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleEdit = (asset: CryptoAsset) => {
    setSelectedAsset(asset);
    setIsEditOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this crypto asset?")) {
      deleteMutation.mutate(id);
    }
  };

  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(142 50% 45%)",
    "hsl(200 60% 50%)",
    "hsl(280 50% 50%)",
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Crypto Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatCurrency(portfolioMetrics.totalValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {portfolioMetrics.assetCount} asset{portfolioMetrics.assetCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Gain/Loss
            </CardTitle>
            {portfolioMetrics.totalGainLoss >= 0 ? (
              <TrendingUp className="h-4 w-4 text-positive" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tabular-nums ${
              portfolioMetrics.totalGainLoss >= 0 ? "text-positive" : "text-destructive"
            }`}>
              {formatCurrency(portfolioMetrics.totalGainLoss)}
            </div>
            <p className={`text-xs mt-1 ${
              portfolioMetrics.totalGainLoss >= 0 ? "text-positive" : "text-destructive"
            }`}>
              {formatPercent(portfolioMetrics.totalGainLossPercent)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Performer
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-positive" />
          </CardHeader>
          <CardContent>
            {topPerformer ? (
              <>
                <div className="text-lg font-semibold truncate">
                  {topPerformer.symbol}
                </div>
                <p className="text-positive text-sm font-medium tabular-nums">
                  {formatPercent(
                    topPerformer.costBasis > 0
                      ? ((topPerformer.currentValue - topPerformer.costBasis) / topPerformer.costBasis) * 100
                      : 0
                  )}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground text-sm">No data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Worst Performer
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {worstPerformer ? (
              <>
                <div className="text-lg font-semibold truncate">
                  {worstPerformer.symbol}
                </div>
                <p className="text-destructive text-sm font-medium tabular-nums">
                  {formatPercent(
                    worstPerformer.costBasis > 0
                      ? ((worstPerformer.currentValue - worstPerformer.costBasis) / worstPerformer.costBasis) * 100
                      : 0
                  )}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground text-sm">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Allocation Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Allocation</CardTitle>
            <CardDescription>Distribution by cryptocurrency</CardDescription>
          </CardHeader>
          <CardContent>
            {allocationData.length > 0 ? (
              <ChartContainer
                config={{}}
                className="h-[300px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No allocation data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Candlestick Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Performance</CardTitle>
            <CardDescription>Candlestick chart showing portfolio value over time</CardDescription>
          </CardHeader>
          <CardContent>
            {assets && assets.length > 0 ? (
              <CryptoCandlestickChart assets={assets} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No portfolio data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Price Chart Section */}
      {selectedAsset && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedAsset.name} ({selectedAsset.symbol}) Price Chart</CardTitle>
                <CardDescription>Historical price performance</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAsset(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <CryptoChart asset={selectedAsset} timeframe={selectedTimeframe} />
          </CardContent>
        </Card>
      )}

      {/* Holdings Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Crypto Holdings</CardTitle>
              <CardDescription>Manage and track your cryptocurrency assets</CardDescription>
            </div>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Crypto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by symbol, name, exchange..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={exchangeFilter} onValueChange={setExchangeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Exchange" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exchanges</SelectItem>
                {exchanges.map(exchange => (
                  <SelectItem key={exchange} value={exchange}>{exchange}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={walletFilter} onValueChange={setWalletFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Wallet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wallets</SelectItem>
                {wallets.map(wallet => (
                  <SelectItem key={wallet} value={wallet}>{wallet}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={nftFilter} onValueChange={setNftFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                <SelectItem value="crypto">Cryptocurrency</SelectItem>
                <SelectItem value="nft">NFTs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Holdings Table */}
          {filteredAndSortedAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">No crypto assets found</p>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Crypto Asset
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 -ml-3"
                        onClick={() => handleSort("name")}
                      >
                        Asset
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Cost Basis</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 -ml-3"
                        onClick={() => handleSort("value")}
                      >
                        Current Value
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 -ml-3"
                        onClick={() => handleSort("gainLoss")}
                      >
                        Gain/Loss
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedAssets.map((asset) => {
                    const gainLoss = asset.currentValue - asset.costBasis;
                    const gainLossPercent = asset.costBasis > 0
                      ? (gainLoss / asset.costBasis) * 100
                      : 0;

                    return (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="font-semibold">{asset.symbol}</div>
                            <div className="text-sm text-muted-foreground">{asset.name}</div>
                            {asset.isNFT && (
                              <Badge variant="outline" className="h-5">
                                <ImageIcon className="h-3 w-3 mr-1" />
                                NFT
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">{asset.quantity.toFixed(6)}</TableCell>
                        <TableCell className="tabular-nums">{formatCurrency(asset.costBasis)}</TableCell>
                        <TableCell className="tabular-nums">{formatCurrency(asset.currentPrice)}</TableCell>
                        <TableCell className="tabular-nums font-medium">
                          {formatCurrency(asset.currentValue)}
                        </TableCell>
                        <TableCell>
                          <div className={`tabular-nums font-medium ${
                            gainLoss >= 0 ? "text-positive" : "text-destructive"
                          }`}>
                            {formatCurrency(gainLoss)}
                          </div>
                          <div className={`text-xs ${
                            gainLoss >= 0 ? "text-positive" : "text-destructive"
                          }`}>
                            {formatPercent(gainLossPercent)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {asset.exchange && (
                              <div className="flex items-center gap-1 text-xs">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">{asset.exchange}</span>
                              </div>
                            )}
                            {asset.walletName && (
                              <div className="flex items-center gap-1 text-xs">
                                <Wallet className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">{asset.walletName}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedAsset(asset)}
                            >
                              Chart
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(asset)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(asset.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Market Data Section */}
      {marketData && marketData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Market Overview</CardTitle>
            <CardDescription>Top cryptocurrencies by market cap</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>24h Change</TableHead>
                    <TableHead>7d Change</TableHead>
                    <TableHead>Market Cap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marketData.slice(0, 10).map((coin) => (
                    <TableRow key={coin.id}>
                      <TableCell>{coin.market_cap_rank}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <img src={coin.image} alt={coin.name} className="h-6 w-6" />
                          <div>
                            <div className="font-semibold">{coin.name}</div>
                            <div className="text-xs text-muted-foreground uppercase">{coin.symbol}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatCurrency(coin.current_price)}
                      </TableCell>
                      <TableCell className={`tabular-nums ${
                        coin.price_change_percentage_24h >= 0 ? "text-positive" : "text-destructive"
                      }`}>
                        {formatPercent(coin.price_change_percentage_24h)}
                      </TableCell>
                      <TableCell className={`tabular-nums ${
                        coin.price_change_percentage_7d_in_currency >= 0 ? "text-positive" : "text-destructive"
                      }`}>
                        {coin.price_change_percentage_7d_in_currency
                          ? formatPercent(coin.price_change_percentage_7d_in_currency)
                          : "N/A"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatCurrency(coin.market_cap)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* NFT Section */}
      {nftAssets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>NFT Holdings</CardTitle>
            <CardDescription>Your non-fungible token collection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nftAssets.map((nft) => (
                <Card key={nft.id}>
                  <CardContent className="pt-6">
                    {nft.nftDetails?.imageUrl && (
                      <img
                        src={nft.nftDetails.imageUrl}
                        alt={nft.name}
                        className="w-full h-48 object-cover rounded-lg mb-4"
                      />
                    )}
                    <div className="space-y-2">
                      <div className="font-semibold">{nft.name}</div>
                      {nft.nftDetails?.collection && (
                        <div className="text-sm text-muted-foreground">
                          Collection: {nft.nftDetails.collection}
                        </div>
                      )}
                      {nft.nftDetails?.tokenId && (
                        <div className="text-sm text-muted-foreground">
                          Token ID: {nft.nftDetails.tokenId}
                        </div>
                      )}
                      <div className="text-lg font-semibold tabular-nums">
                        {formatCurrency(nft.currentValue)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialogs */}
      <CryptoAddDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={() => {
          setIsAddOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/crypto"] });
        }}
      />

      {selectedAsset && (
        <CryptoAddDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          asset={selectedAsset}
          onSuccess={() => {
            setIsEditOpen(false);
            setSelectedAsset(null);
            queryClient.invalidateQueries({ queryKey: ["/api/crypto"] });
          }}
        />
      )}
    </div>
  );
}
