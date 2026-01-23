import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";
import type { CryptoAsset } from "@shared/schema";

interface CryptoAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: CryptoAsset;
  onSuccess?: () => void;
}

export function CryptoAddDialog({ open, onOpenChange, asset, onSuccess }: CryptoAddDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<any>(null);
  const [formData, setFormData] = useState({
    symbol: "",
    name: "",
    quantity: "",
    costBasis: "",
    walletAddress: "",
    walletName: "",
    exchange: "",
    isNFT: false,
    nftCollection: "",
    nftTokenId: "",
    nftImageUrl: "",
    notes: "",
  });

  useEffect(() => {
    if (asset) {
      setFormData({
        symbol: asset.symbol,
        name: asset.name,
        quantity: asset.quantity.toString(),
        costBasis: asset.costBasis.toString(),
        walletAddress: asset.walletAddress || "",
        walletName: asset.walletName || "",
        exchange: asset.exchange || "",
        isNFT: asset.isNFT || false,
        nftCollection: asset.nftDetails?.collection || "",
        nftTokenId: asset.nftDetails?.tokenId || "",
        nftImageUrl: asset.nftDetails?.imageUrl || "",
        notes: asset.notes || "",
      });
      setSelectedCoin({ symbol: asset.symbol, name: asset.name });
    } else {
      setFormData({
        symbol: "",
        name: "",
        quantity: "",
        costBasis: "",
        walletAddress: "",
        walletName: "",
        exchange: "",
        isNFT: false,
        nftCollection: "",
        nftTokenId: "",
        nftImageUrl: "",
        notes: "",
      });
      setSelectedCoin(null);
    }
  }, [asset, open]);

  // Search for coins
  const { data: searchData } = useQuery<any[]>({
    queryKey: ["/api/crypto/search", searchQuery],
    enabled: searchQuery.length >= 2,
    queryFn: async () => {
      const response = await fetch(`/api/crypto/search?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  useEffect(() => {
    if (searchData) {
      setSearchResults(searchData);
    }
  }, [searchData]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = asset ? `/api/crypto/${asset.id}` : "/api/crypto";
      const method = asset ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Failed to ${asset ? "update" : "create"} crypto asset`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crypto"] });
      queryClient.invalidateQueries({ queryKey: ["/api/net-worth"] });
      onOpenChange(false);
      onSuccess?.();
      toast({
        title: asset ? "Crypto asset updated successfully" : "Crypto asset added successfully",
      });
    },
    onError: () => {
      toast({
        title: asset ? "Failed to update crypto asset" : "Failed to add crypto asset",
        variant: "destructive",
      });
    },
  });

  const handleCoinSelect = (coin: any) => {
    setSelectedCoin(coin);
    setFormData(prev => ({
      ...prev,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
    }));
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSubmit = () => {
    if (!formData.symbol || !formData.name || !formData.quantity || !formData.costBasis) {
      toast({
        title: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const payload: any = {
      symbol: formData.symbol.toUpperCase(),
      name: formData.name,
      quantity: parseFloat(formData.quantity) || 0,
      costBasis: parseFloat(formData.costBasis) || 0,
      walletAddress: formData.walletAddress || undefined,
      walletName: formData.walletName || undefined,
      exchange: formData.exchange || undefined,
      isNFT: formData.isNFT,
      notes: formData.notes || undefined,
    };

    if (formData.isNFT) {
      payload.nftDetails = {
        collection: formData.nftCollection || undefined,
        tokenId: formData.nftTokenId || undefined,
        imageUrl: formData.nftImageUrl || undefined,
      };
    }

    createMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? "Edit Crypto Asset" : "Add Crypto Asset"}</DialogTitle>
          <DialogDescription>
            {asset ? "Update your cryptocurrency holding" : "Add a new cryptocurrency to your portfolio"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Coin Search */}
          {!asset && (
            <div className="space-y-2">
              <Label>Search Cryptocurrency</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or symbol (e.g., Bitcoin, BTC)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((coin) => (
                      <button
                        key={coin.id}
                        type="button"
                        className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2"
                        onClick={() => handleCoinSelect(coin)}
                      >
                        {coin.thumb && (
                          <img src={coin.thumb} alt={coin.name} className="h-6 w-6" />
                        )}
                        <div>
                          <div className="font-medium">{coin.name}</div>
                          <div className="text-xs text-muted-foreground uppercase">{coin.symbol}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedCoin && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  {selectedCoin.thumb && (
                    <img src={selectedCoin.thumb} alt={selectedCoin.name} className="h-8 w-8" />
                  )}
                  <div>
                    <div className="font-medium">{selectedCoin.name}</div>
                    <div className="text-xs text-muted-foreground uppercase">{selectedCoin.symbol}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input
                id="symbol"
                value={formData.symbol}
                onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                placeholder="BTC"
                disabled={!!selectedCoin}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Bitcoin"
                disabled={!!selectedCoin}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="0.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costBasis">Cost Basis ($) *</Label>
              <Input
                id="costBasis"
                type="number"
                step="any"
                value={formData.costBasis}
                onChange={(e) => setFormData(prev => ({ ...prev, costBasis: e.target.value }))}
                placeholder="15000"
              />
            </div>
          </div>

          {/* Exchange/Wallet */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exchange">Exchange</Label>
              <Input
                id="exchange"
                value={formData.exchange}
                onChange={(e) => setFormData(prev => ({ ...prev, exchange: e.target.value }))}
                placeholder="Coinbase, Binance, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="walletName">Wallet Name</Label>
              <Input
                id="walletName"
                value={formData.walletName}
                onChange={(e) => setFormData(prev => ({ ...prev, walletName: e.target.value }))}
                placeholder="Ledger, MetaMask, etc."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="walletAddress">Wallet Address</Label>
            <Input
              id="walletAddress"
              value={formData.walletAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, walletAddress: e.target.value }))}
              placeholder="0x..."
            />
          </div>

          {/* NFT Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isNFT"
              checked={formData.isNFT}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isNFT: !!checked }))}
            />
            <Label htmlFor="isNFT" className="cursor-pointer">
              This is an NFT
            </Label>
          </div>

          {/* NFT Details */}
          {formData.isNFT && (
            <div className="space-y-4 p-4 bg-muted rounded-md">
              <div className="space-y-2">
                <Label htmlFor="nftCollection">Collection</Label>
                <Input
                  id="nftCollection"
                  value={formData.nftCollection}
                  onChange={(e) => setFormData(prev => ({ ...prev, nftCollection: e.target.value }))}
                  placeholder="Bored Ape Yacht Club"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nftTokenId">Token ID</Label>
                  <Input
                    id="nftTokenId"
                    value={formData.nftTokenId}
                    onChange={(e) => setFormData(prev => ({ ...prev, nftTokenId: e.target.value }))}
                    placeholder="1234"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nftImageUrl">Image URL</Label>
                  <Input
                    id="nftImageUrl"
                    value={formData.nftImageUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, nftImageUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving..." : asset ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
