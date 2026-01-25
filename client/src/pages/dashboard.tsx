import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { HoldingsTable } from "@/components/holdings-table";
import { BenchmarkChart } from "@/components/benchmark-chart";
import { BudgetPieChart } from "@/components/budget-pie-chart";
import { GoalProgression } from "@/components/goal-progression";
import { RecentTransactions } from "@/components/recent-transactions";
import { SEO } from "@/components/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Bitcoin, Briefcase, DollarSign, Gem, GripVertical, Home, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import type { Holding, PortfolioMetrics, BenchmarkData, NetWorthSummary } from "@shared/schema";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Timeframe = "1D" | "5D" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "5Y" | "MAX";
type CardSize = "small" | "medium" | "large";
type CardId = "netWorth" | "benchmark" | "holdings" | "goalProgression" | "budgetOverview" | "recentTransactions";

const DEFAULT_CARD_ORDER: CardId[] = [
  "netWorth",
  "benchmark",
  "holdings",
  "goalProgression",
  "budgetOverview",
  "recentTransactions",
];

const CARD_ORDER_STORAGE_KEY = "dashboard:cardOrder:v1";

function normalizeCardOrder(value: unknown): CardId[] | null {
  if (!Array.isArray(value)) return null;
  const asStrings = value.filter((v) => typeof v === "string") as string[];
  const isCardId = (v: string): v is CardId => (DEFAULT_CARD_ORDER as string[]).includes(v);
  const filtered = asStrings.filter(isCardId) as CardId[];
  // Must contain all IDs exactly once
  const set = new Set(filtered);
  if (set.size !== DEFAULT_CARD_ORDER.length) return null;
  for (const id of DEFAULT_CARD_ORDER) {
    if (!set.has(id)) return null;
  }
  return [...set] as CardId[];
}

function SortableCard({
  id,
  className,
  children,
}: {
  id: CardId;
  className: string;
  children: (dragHandle: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandle = (
    <button
      ref={setActivatorNodeRef}
      type="button"
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
      aria-label="Drag to reorder"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${className} ${isDragging ? "z-10" : ""}`}
    >
      {children(dragHandle)}
    </div>
  );
}

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [cardSizes, setCardSizes] = useState<Record<CardId, CardSize>>({
    netWorth: "large",
    benchmark: "medium",
    holdings: "medium",
    goalProgression: "medium",
    budgetOverview: "medium",
    recentTransactions: "medium",
  });

  const [cardOrder, setCardOrder] = useState<CardId[]>(() => {
    if (typeof window === "undefined") return DEFAULT_CARD_ORDER;
    try {
      const raw = window.localStorage.getItem(CARD_ORDER_STORAGE_KEY);
      if (!raw) return DEFAULT_CARD_ORDER;
      const parsed: unknown = JSON.parse(raw);
      return normalizeCardOrder(parsed) ?? DEFAULT_CARD_ORDER;
    } catch {
      return DEFAULT_CARD_ORDER;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(CARD_ORDER_STORAGE_KEY, JSON.stringify(cardOrder));
    } catch {
      // ignore
    }
  }, [cardOrder]);
  const { data: holdings, isLoading: holdingsLoading } = useQuery<Holding[]>({
    queryKey: ["/api/holdings"],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<PortfolioMetrics>({
    queryKey: ["/api/portfolio/metrics"],
  });

  const { data: benchmark, isLoading: benchmarkLoading } = useQuery<BenchmarkData>({
    queryKey: ["/api/benchmark", timeframe],
    queryFn: async () => {
      const url = `/api/benchmark?timeframe=${timeframe}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch benchmark data");
      }
      return response.json();
    },
  });

  const { data: benchmarkChart, isLoading: benchmarkChartLoading } = useQuery<{
    portfolio: Array<{ date: string; value: number }>;
    spy: Array<{ date: string; value: number }>;
  }>({
    queryKey: ["/api/benchmark/chart", timeframe],
    queryFn: async () => {
      const url = `/api/benchmark/chart?timeframe=${timeframe}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch benchmark chart data");
      }
      return response.json();
    },
  });


  const { data: netWorth, isLoading: netWorthLoading } = useQuery<NetWorthSummary>({
    queryKey: ["/api/net-worth"],
  });

  // Format currency helper
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const nextSize = (size: CardSize): CardSize =>
    size === "large" ? "medium" : size === "medium" ? "small" : "large";

  const sizeLabel = (size: CardSize) => (size === "large" ? "Large" : size === "medium" ? "Medium" : "Small");

  const SizeIcon = ({ size }: { size: CardSize }) => {
    const fillOuter = size === "large";
    const fillMiddle = size === "large" || size === "medium";
    const fillInner = true;
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <circle
          cx="9"
          cy="9"
          r="7"
          stroke="currentColor"
          strokeWidth="1.5"
          fill={fillOuter ? "currentColor" : "none"}
          opacity={fillOuter ? 1 : 0.5}
        />
        <circle
          cx="9"
          cy="9"
          r="4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          fill={fillMiddle ? "currentColor" : "none"}
          opacity={fillMiddle ? 1 : 0.5}
        />
        <circle
          cx="9"
          cy="9"
          r="2.2"
          stroke="currentColor"
          strokeWidth="1.5"
          fill={fillInner ? "currentColor" : "none"}
          opacity={1}
        />
      </svg>
    );
  };

  const renderSizeToggle = (cardId: CardId) => {
    const current = cardSizes[cardId];
    const label = sizeLabel(current);
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Size: ${label} (click to change)`}
            onClick={() =>
              setCardSizes((prev) => ({ ...prev, [cardId]: nextSize(prev[cardId]) }))
            }
          >
            <SizeIcon size={current} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Size: {label}</TooltipContent>
      </Tooltip>
    );
  };

  const cardSpanClasses: Record<CardId, Record<CardSize, string>> = {
    netWorth: {
      small: "lg:col-span-6",
      medium: "lg:col-span-8",
      large: "lg:col-span-12",
    },
    benchmark: {
      small: "lg:col-span-4",
      medium: "lg:col-span-8",
      large: "lg:col-span-12",
    },
    holdings: {
      small: "lg:col-span-8",
      medium: "lg:col-span-6",
      large: "lg:col-span-12",
    },
    goalProgression: {
      small: "lg:col-span-4",
      medium: "lg:col-span-6",
      large: "lg:col-span-4",
    },
    budgetOverview: {
      small: "lg:col-span-4",
      medium: "lg:col-span-6",
      large: "lg:col-span-8",
    },
    recentTransactions: {
      small: "lg:col-span-4",
      medium: "lg:col-span-6",
      large: "lg:col-span-4",
    },
  };

  const cardHeightClasses: Record<CardId, Record<CardSize, string>> = {
    netWorth: {
      small: "min-h-[220px]",
      medium: "min-h-[280px]",
      large: "min-h-[340px]",
    },
    benchmark: {
      small: "min-h-[180px]",
      medium: "min-h-[320px]",
      large: "min-h-[380px]",
    },
    holdings: {
      small: "min-h-[260px]",
      medium: "min-h-[340px]",
      large: "min-h-[440px]",
    },
    goalProgression: {
      small: "min-h-[220px]",
      medium: "min-h-[280px]",
      large: "min-h-[340px]",
    },
    budgetOverview: {
      small: "min-h-[220px]",
      medium: "min-h-[300px]",
      large: "min-h-[380px]",
    },
    recentTransactions: {
      small: "min-h-[220px]",
      medium: "min-h-[260px]",
      large: "min-h-[320px]",
    },
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCardOrder((items) => {
      const oldIndex = items.indexOf(active.id as CardId);
      const newIndex = items.indexOf(over.id as CardId);
      if (oldIndex === -1 || newIndex === -1) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  // Compute daily change from holdings (same approach as the removed PortfolioMetricsCards)
  const computedTotalValue = metrics?.totalValue ?? 0;
  let dailyChange = 0;
  let dailyChangePercent = 0;

  if (holdings && holdings.length > 0) {
    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    if (totalValue > 0) {
      const weightedDailyChange = holdings.reduce((sum, h) => {
        const dailyGrowthRate = h.growthRate30d / 30;
        const dailyChangeForHolding = (h.currentValue * dailyGrowthRate) / 100;
        return sum + dailyChangeForHolding;
      }, 0);
      dailyChange = weightedDailyChange;
      dailyChangePercent = (dailyChange / totalValue) * 100;
    }
  }

  const controlsFor = (id: CardId, dragHandle: ReactNode) => (
    <div className="flex items-center gap-1">
      {dragHandle}
      {renderSizeToggle(id)}
    </div>
  );

  const renderCard = useMemo(() => {
    return (id: CardId, dragHandle: ReactNode) => {
      switch (id) {
        case "netWorth":
          return (
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Net Worth
                    </CardTitle>
                    <CardDescription>Total value across all asset classes</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href="/assets" className="text-sm text-primary hover:underline">
                      Manage Assets →
                    </Link>
                    {controlsFor("netWorth", dragHandle)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {netWorthLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-48" />
                    <div className="grid grid-cols-5 gap-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-12" />
                      ))}
                    </div>
                  </div>
                ) : netWorth ? (
                  <div>
                    <div className="mb-4">
                      <div
                        className={`font-bold ${
                          cardSizes.netWorth === "small"
                            ? "text-2xl"
                            : cardSizes.netWorth === "large"
                              ? "text-4xl"
                              : "text-3xl"
                        }`}
                      >
                        {formatCurrency(netWorth.netEquity)}
                      </div>
                      <div className={`text-muted-foreground ${cardSizes.netWorth === "small" ? "text-xs" : "text-sm"}`}>
                        Assets: {formatCurrency(netWorth.totalNetWorth)} | Liabilities: {formatCurrency(netWorth.totalLiabilities)}
                      </div>
                    </div>
                    {cardSizes.netWorth !== "small" && (() => {
                      const categories = [
                        { label: "Stocks & ETFs", value: netWorth.stocksAndETFs, icon: TrendingUp, color: "text-blue-500", bgColor: "bg-blue-500" },
                        { label: "Real Estate", value: netWorth.realEstate, icon: Home, color: "text-green-500", bgColor: "bg-green-500" },
                        { label: "Crypto", value: netWorth.crypto, icon: Bitcoin, color: "text-orange-500", bgColor: "bg-orange-500" },
                        { label: "Collectibles", value: netWorth.collectibles, icon: Gem, color: "text-purple-500", bgColor: "bg-purple-500" },
                        { label: "Alt Investments", value: netWorth.alternativeInvestments, icon: Briefcase, color: "text-cyan-500", bgColor: "bg-cyan-500" },
                      ];
                      const visibleCategories =
                        cardSizes.netWorth === "medium" ? categories.slice(0, 3) : categories;
                      return (
                        <div
                          className={`grid gap-3 ${
                            cardSizes.netWorth === "large"
                              ? "grid-cols-2 md:grid-cols-5"
                              : "grid-cols-2 sm:grid-cols-3"
                          }`}
                        >
                          {visibleCategories.map((cat) => {
                            const percentage = netWorth.totalNetWorth > 0
                              ? (cat.value / netWorth.totalNetWorth) * 100
                              : 0;
                            return (
                              <div key={cat.label} className="p-2 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <cat.icon className={`h-3.5 w-3.5 ${cat.color}`} />
                                  <span className="text-xs text-muted-foreground truncate">{cat.label}</span>
                                </div>
                                <div className={`font-semibold ${cardSizes.netWorth === "medium" ? "text-xs" : "text-sm"}`}>
                                  {formatCurrency(cat.value)}
                                </div>
                                <Progress value={percentage} className={`mt-1 ${cardSizes.netWorth === "medium" ? "h-0.5" : "h-1"}`} />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        case "benchmark":
          return (
            <BenchmarkChart
              data={benchmark}
              chartData={benchmarkChart}
              isLoading={benchmarkLoading || benchmarkChartLoading}
              timeframe={timeframe}
              size={cardSizes.benchmark}
              sizeSelector={controlsFor("benchmark", dragHandle)}
              cardClassName="h-full"
              totalValue={computedTotalValue}
              dailyChange={dailyChange}
              dailyChangePercent={dailyChangePercent}
            />
          );
        case "holdings":
          return (
            <HoldingsTable
              holdings={holdings}
              isLoading={holdingsLoading}
              timeframe={timeframe}
              size={cardSizes.holdings}
              sizeSelector={controlsFor("holdings", dragHandle)}
              cardClassName="h-full"
            />
          );
        case "goalProgression":
          return (
            <GoalProgression
              size={cardSizes.goalProgression}
              sizeSelector={controlsFor("goalProgression", dragHandle)}
              cardClassName="h-full"
            />
          );
        case "budgetOverview":
          return (
            <BudgetPieChart
              size={cardSizes.budgetOverview}
              sizeSelector={controlsFor("budgetOverview", dragHandle)}
              cardClassName="h-full"
            />
          );
        case "recentTransactions":
          return (
            <RecentTransactions
              size={cardSizes.recentTransactions}
              sizeSelector={controlsFor("recentTransactions", dragHandle)}
              cardClassName="h-full"
            />
          );
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [benchmark, benchmarkChart, benchmarkChartLoading, benchmarkLoading, cardSizes, computedTotalValue, dailyChange, dailyChangePercent, holdings, holdingsLoading, netWorth, netWorthLoading, timeframe]);

  return (
    <div className="p-6 space-y-6" data-testid="page-dashboard">
      <SEO 
        title="Dashboard" 
        description="Track your investment portfolio performance with real-time metrics, benchmarking, and industry analysis." 
      />
      
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Portfolio Dashboard
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Track your investment performance and market insights
        </p>
      </div>
      <TooltipProvider>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {cardOrder.map((id) => {
                const wrapperClass = `col-span-1 ${cardSpanClasses[id][cardSizes[id]]} ${cardHeightClasses[id][cardSizes[id]]}`;
                return (
                  <SortableCard key={id} id={id} className={wrapperClass}>
                    {(dragHandle) => renderCard(id, dragHandle)}
                  </SortableCard>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </TooltipProvider>
    </div>
  );
}
