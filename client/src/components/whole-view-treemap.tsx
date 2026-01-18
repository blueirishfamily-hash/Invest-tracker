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

export function WholeViewTab() {
  const [metric, setMetric] = useState<Metric>("percentage");

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

    // Add holdings
    if (holdings) {
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

    // Add real estate
    if (realEstate) {
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

    // Add crypto
    if (crypto) {
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

    // Add collectibles
    if (collectibles) {
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

    // Add alternative investments
    if (altInvestments) {
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
  }, [holdings, realEstate, crypto, collectibles, altInvestments, metric]);

  // Generate distinct colors for percentage mode
  const distinctColors = useMemo(() => {
    if (!treemapData || treemapData.length === 0) return [];
    return generateDistinctColors(treemapData.length);
  }, [treemapData]);

  // Calculate max absolute value for intensity-based coloring
  const maxAbsValue = useMemo(() => {
    if (!treemapData || treemapData.length === 0) return 0;
    return Math.max(...treemapData.map(d => Math.abs(d.actualValue)));
  }, [treemapData]);

  // Create lookup map for colors
  const treemapLookup = useMemo(() => {
    const map = new Map<string, { asset: TreemapAsset; actualValue: number; color: string }>();
    treemapData.forEach((entry, index) => {
      const isPositive = entry.actualValue >= 0;
      const color = (metric === "performance" || metric === "returns")
        ? getColorIntensity(entry.actualValue, maxAbsValue, isPositive)
        : distinctColors[index] || getFallbackColor(entry.name);
      map.set(entry.name, { asset: entry, actualValue: entry.actualValue, color });
    });
    return map;
  }, [treemapData, metric, distinctColors, maxAbsValue]);

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

                  return (
                    <g>
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={fillColor}
                        stroke="#fff"
                      />
                      {resolvedEntryName && (
                        <>
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
                        </>
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
                    if (!data || !data.asset) return [value, ""];
                    
                    const asset = data.asset;
                    const actualValue = data.actualValue || 0;
                    
                    let formattedValue: string;
                    switch (metric) {
                      case "performance":
                        formattedValue = `${actualValue >= 0 ? "+" : ""}${actualValue.toFixed(2)}%`;
                        break;
                      case "returns":
                        formattedValue = `${formatCurrency(actualValue)} (${
                          asset.costBasis > 0 
                            ? formatPercent((actualValue / asset.costBasis) * 100)
                            : "0%"
                        })`;
                        break;
                      case "percentage":
                      default:
                        formattedValue = `${actualValue.toFixed(2)}%`;
                        break;
                    }
                    
                    return [formattedValue, asset.fullName || asset.name || ""];
                  }}
                  labelFormatter={(label) => `${label} (${treemapLookup.get(label)?.asset.type || "Asset"})`}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        )}
        {treemapData.length > 0 && metric === "percentage" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {treemapData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: distinctColors[index] }} />
                <span className="text-sm text-muted-foreground">{entry.name}</span>
                <span className="text-xs text-muted-foreground">({entry.type})</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
