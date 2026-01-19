import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Treemap, Tooltip, ResponsiveContainer } from "recharts";
import type { 
  Holding, 
  RealEstate, 
  CryptoAsset, 
  Collectible, 
  AlternativeInvestment 
} from "@shared/schema";

type Metric = "performance" | "returns" | "percentage";

// Unified asset item for treemap
interface TreemapAsset {
  name: string;
  fullName: string;
  type: string;
  value: number;
  actualValue: number;
  asset: any; // Original asset object
  costBasis: number;
  currentValue: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

// Generate distinct colors for holdings (percentage mode)
function generateDistinctColors(count: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const hue = (i * 360) / count;
    colors.push(`hsl(${hue}, 65%, 55%)`);
  }
  return colors;
}

function getFallbackColor(name: string): string {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `hsl(${hash % 360}, 65%, 55%)`;
}

// Generate consistent color for an asset based on its name/ticker
// This ensures the same asset always has the same color regardless of filters
// Uses multiple hash passes to create more varied and distinct colors
function getAssetColor(assetName: string, assetType?: string): string {
  // Use both name and type for hash to differentiate same names in different asset types
  const seed = assetType ? `${assetType}:${assetName}` : assetName;
  
  // Create a better hash using multiple passes and better distribution
  let hash1 = 0;
  let hash2 = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash1 = ((hash1 << 5) - hash1) + char;
    hash1 = hash1 & hash1; // Convert to 32bit integer
    hash2 = hash2 + char * (i + 1); // Second hash for saturation/lightness
  }
  
  // Use first hash for hue - distribute across full color wheel
  // Use golden ratio multiplier for better distribution
  const goldenRatio = 0.618033988749895;
  const hue = Math.abs(hash1) * goldenRatio % 360;
  
  // Use second hash for saturation - vary between 55% and 85% for more variety
  const saturation = 55 + (Math.abs(hash2) % 30);
  
  // Vary lightness between 45% and 65% for better contrast
  // Use a different calculation from the seed for lightness
  let lightnessHash = 0;
  for (let i = 0; i < seed.length; i++) {
    lightnessHash = ((lightnessHash << 3) - lightnessHash) + seed.charCodeAt(i);
    lightnessHash = lightnessHash & lightnessHash;
  }
  const lightness = 45 + (Math.abs(lightnessHash) % 20);
  
  return `hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`;
}

// Calculate color intensity for returns/performance mode
function getColorIntensity(value: number, maxValue: number, isPositive: boolean): string {
  if (maxValue === 0) {
    return isPositive ? "hsl(142, 65%, 55%)" : "hsl(0, 65%, 55%)";
  }
  const intensity = Math.abs(value) / maxValue;
  const lightness = 45 - (intensity * 20);
  const saturation = 65;
  return isPositive 
    ? `hsl(142, ${saturation}%, ${Math.max(25, Math.min(45, lightness))}%)`
    : `hsl(0, ${saturation}%, ${Math.max(25, Math.min(45, lightness))}%)`;
}

export function WholeViewTab({ selectedCategories }: { selectedCategories?: Set<string> }) {
  const [metric, setMetric] = useState<Metric>("percentage");
  
  // Default to all categories if not provided
  const activeCategories = selectedCategories || new Set(["stocks", "realEstate", "crypto", "collectibles", "altInvestments"]);

  // Fetch all asset types
  const { data: holdings } = useQuery<Holding[]>({
    queryKey: ["/api/holdings"],
  });

  const { data: realEstate } = useQuery<RealEstate[]>({
    queryKey: ["/api/real-estate"],
  });

  const { data: crypto } = useQuery<CryptoAsset[]>({
    queryKey: ["/api/crypto"],
  });

  const { data: collectibles } = useQuery<Collectible[]>({
    queryKey: ["/api/collectibles"],
  });

  const { data: altInvestments } = useQuery<AlternativeInvestment[]>({
    queryKey: ["/api/alternative-investments"],
  });

  // Aggregate all assets into unified treemap data
  const treemapData = useMemo(() => {
    const allAssets: TreemapAsset[] = [];

    // Add holdings (if stocks category is selected)
    if (holdings && activeCategories.has("stocks")) {
      holdings.forEach((holding) => {
        allAssets.push({
          name: holding.ticker,
          fullName: holding.name,
          type: "Stock",
          value: holding.currentValue,
          actualValue: 0, // Will be calculated below
          asset: holding,
          costBasis: holding.costBasis,
          currentValue: holding.currentValue,
        });
      });
    }

    // Add real estate (if realEstate category is selected)
    if (realEstate && activeCategories.has("realEstate")) {
      realEstate.forEach((property) => {
        const value = property.estimatedValue;
        allAssets.push({
          name: property.propertyName || property.propertyAddress || "Property",
          fullName: property.propertyName || property.propertyAddress || "Real Estate Property",
          type: "Real Estate",
          value,
          actualValue: 0,
          asset: property,
          costBasis: property.purchasePrice || 0,
          currentValue: value,
        });
      });
    }

    // Add crypto (if crypto category is selected)
    if (crypto && activeCategories.has("crypto")) {
      crypto.forEach((cryptoAsset) => {
        allAssets.push({
          name: cryptoAsset.symbol,
          fullName: cryptoAsset.name,
          type: "Crypto",
          value: cryptoAsset.currentValue,
          actualValue: 0,
          asset: cryptoAsset,
          costBasis: cryptoAsset.costBasis || 0,
          currentValue: cryptoAsset.currentValue,
        });
      });
    }

    // Add collectibles (if collectibles category is selected)
    if (collectibles && activeCategories.has("collectibles")) {
      collectibles.forEach((collectible) => {
        const value = collectible.estimatedValue || 0;
        allAssets.push({
          name: collectible.name,
          fullName: collectible.name,
          type: "Collectible",
          value,
          actualValue: 0,
          asset: collectible,
          costBasis: collectible.purchasePrice || 0,
          currentValue: value,
        });
      });
    }

    // Add alternative investments (if altInvestments category is selected)
    if (altInvestments && activeCategories.has("altInvestments")) {
      altInvestments.forEach((altInv) => {
        const value = altInv.currentNAV || 0;
        allAssets.push({
          name: altInv.name,
          fullName: altInv.name,
          type: "Alt Investment",
          value,
          actualValue: 0,
          asset: altInv,
          costBasis: altInv.initialInvestment || 0,
          currentValue: value,
        });
      });
    }

    // Calculate total portfolio value
    const totalPortfolioValue = allAssets.reduce((sum, a) => sum + a.currentValue, 0);

    // Calculate actual values based on metric
    const data = allAssets.map((asset) => {
      let value: number;
      let actualValue: number;

      // Calculate growth rate
      const growthRate = asset.costBasis > 0 
        ? ((asset.currentValue - asset.costBasis) / asset.costBasis) * 100 
        : 0;

      switch (metric) {
        case "performance":
          value = Math.abs(growthRate);
          actualValue = growthRate;
          break;
        case "returns":
          value = Math.abs(asset.currentValue - asset.costBasis);
          actualValue = asset.currentValue - asset.costBasis;
          break;
        case "percentage":
        default:
          value = totalPortfolioValue > 0 ? (asset.currentValue / totalPortfolioValue) * 100 : 0;
          actualValue = value;
          break;
      }

      return {
        ...asset,
        value: Math.max(value, 0.01),
        actualValue: Number(actualValue),
      };
    });

    return data.filter(item => item.value > 0);
  }, [holdings, realEstate, crypto, collectibles, altInvestments, metric, activeCategories]);

  // Calculate max absolute value for intensity-based coloring
  const maxAbsValue = useMemo(() => {
    if (!treemapData || treemapData.length === 0) return 0;
    return Math.max(...treemapData.map(d => Math.abs(d.actualValue)));
  }, [treemapData]);

  // Create lookup map for colors with locked colors per asset
  const treemapLookup = useMemo(() => {
    const map = new Map<string, { asset: TreemapAsset; actualValue: number; color: string }>();
    treemapData.forEach((entry) => {
      const isPositive = entry.actualValue >= 0;
      let color: string;
      
      if (metric === "performance" || metric === "returns") {
        // For performance/returns mode, use intensity-based coloring with green/red
        // but blend with locked base hue for asset identification
        const baseColor = getAssetColor(entry.name, entry.type);
        const hueMatch = baseColor.match(/hsl\((\d+),/);
        const baseHue = hueMatch ? parseInt(hueMatch[1]) : 0;
        
        // Calculate intensity
        const intensity = maxAbsValue > 0 ? Math.abs(entry.actualValue) / maxAbsValue : 0;
        const lightness = 45 - (intensity * 20);
        const saturation = 65;
        
        // Use green (142) for positive, red (0) for negative, but blend slightly with base hue
        const targetHue = isPositive ? 142 : 0;
        // Blend: 70% target hue, 30% base hue for slight asset differentiation
        const blendedHue = Math.round(targetHue * 0.7 + baseHue * 0.3);
        color = `hsl(${blendedHue}, ${saturation}%, ${Math.max(25, Math.min(45, lightness))}%)`;
      } else {
        // For percentage mode, use locked color based on asset name/type
        color = getAssetColor(entry.name, entry.type);
      }
      
      map.set(entry.name, { asset: entry, actualValue: entry.actualValue, color });
    });
    return map;
  }, [treemapData, metric, maxAbsValue]);

  // Generate color map for legend (only for percentage mode)
  const assetColorMap = useMemo(() => {
    const map = new Map<string, string>();
    treemapData.forEach((entry) => {
      map.set(entry.name, getAssetColor(entry.name, entry.type));
    });
    return map;
  }, [treemapData]);

  const isLoading = !holdings && !realEstate && !crypto && !collectibles && !altInvestments;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Portfolio Overview</CardTitle>
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium">Metric:</Label>
            <ToggleGroup
              type="single"
              value={metric}
              onValueChange={(value) => {
                if (value === "performance" || value === "returns" || value === "percentage") {
                  setMetric(value);
                }
              }}
              className="border rounded-md"
            >
              <ToggleGroupItem value="performance" aria-label="Performance" size="sm">
                Performance
              </ToggleGroupItem>
              <ToggleGroupItem value="returns" aria-label="Returns" size="sm">
                Returns
              </ToggleGroupItem>
              <ToggleGroupItem value="percentage" aria-label="Percentage of Portfolio" size="sm">
                % of Portfolio
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[600px] flex items-center justify-center">
            <div className="w-full h-full bg-muted animate-pulse rounded" />
          </div>
        ) : treemapData.length === 0 ? (
          <div className="h-[600px] flex items-center justify-center text-muted-foreground">
            No assets available for treemap visualization
          </div>
        ) : (
          <div className="h-[600px]">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treemapData}
                dataKey="value"
                nameKey="name"
                aspectRatio={4 / 3}
                stroke="#fff"
                fill="#8884d8"
                content={(props: any) => {
                  if (!props) return null;

                  const { x, y, width, height, payload, name } = props;

                  if (
                    typeof x !== "number" ||
                    typeof y !== "number" ||
                    typeof width !== "number" ||
                    typeof height !== "number" ||
                    width <= 0 ||
                    height <= 0
                  ) {
                    return null;
                  }

                  const payloadData = payload?.data || payload?.payload || payload || {};
                  const entryName = name || payloadData?.name || "";

                  const entryFromData = entryName ? treemapLookup.get(entryName) : null;
                  const resolvedEntryName = entryFromData ? entryName : "";
                  const actualValue = entryFromData?.actualValue ?? payloadData?.actualValue ?? 0;
                  const asset = entryFromData?.asset || payloadData?.asset || {};
                  const fillColor = entryFromData?.color || getFallbackColor(entryName || "asset");

                  const showLabels = width >= 40 && height >= 20;

                  let valueText = "";
                  if (showLabels) {
                    if (metric === "percentage") {
                      const percentage = actualValue?.toFixed(1) || "0.0";
                      const marketValue = asset?.currentValue
                        ? formatCurrency(asset.currentValue)
                        : "$0";
                      valueText = `${percentage}% • ${marketValue}`;
                    } else if (metric === "performance") {
                      valueText =
                        actualValue >= 0
                          ? `+${actualValue.toFixed(1)}%`
                          : `${actualValue.toFixed(1)}%`;
                    } else {
                      valueText = formatCurrency(actualValue);
                    }
                  }

                  // Create unique clipPath ID for this tile
                  const clipId = `clip-${Math.round(x)}-${Math.round(y)}-${Math.round(width)}-${Math.round(height)}`;
                  
                  return (
                    <g>
                      <defs>
                        <clipPath id={clipId}>
                          <rect x={x} y={y} width={width} height={height} />
                        </clipPath>
                      </defs>
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={fillColor}
                        stroke="#fff"
                      />
                      {resolvedEntryName && (
                        <g clipPath={`url(#${clipId})`}>
                          <text
                            x={x + width / 2}
                            y={y + height / 2 - (showLabels ? 8 : 0)}
                            textAnchor="middle"
                            fill="#000000"
                            fontSize={showLabels ? 12 : Math.max(8, Math.min(width / 8, 10))}
                            fontWeight="bold"
                            dominantBaseline="middle"
                            stroke="none"
                          >
                            {resolvedEntryName}
                          </text>
                          {showLabels && valueText && (
                            <text
                              x={x + width / 2}
                              y={y + height / 2 + 8}
                              textAnchor="middle"
                              fill="#000000"
                              fontSize={10}
                              stroke="none"
                            >
                              {valueText}
                            </text>
                          )}
                        </g>
                      )}
                    </g>
                  );
                }}
              >
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number, payload: any) => {
                    const data = payload?.payload || payload;
                    if (!data || !data.asset) return ["", ""];
                    
                    const asset = data.asset;
                    // Always show exact current value
                    const currentValue = formatCurrency(asset.currentValue || 0);
                    
                    // Return value and asset class
                    return [currentValue, asset.type || ""];
                  }}
                  labelFormatter={(label) => {
                    const entry = treemapLookup.get(label);
                    if (entry) {
                      // Show asset name/ticker and asset class
                      const assetName = entry.asset.fullName || entry.asset.name || label;
                      const assetClass = entry.asset.type || "";
                      return `${assetName} (${assetClass})`;
                    }
                    return label;
                  }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        )}
        {treemapData.length > 0 && metric === "percentage" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {treemapData.map((entry) => {
              const color = assetColorMap.get(entry.name) || getAssetColor(entry.name, entry.type);
              return (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                  <span className="text-sm text-muted-foreground">{entry.name}</span>
                  <span className="text-xs text-muted-foreground">({entry.type})</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
