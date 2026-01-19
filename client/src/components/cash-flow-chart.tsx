import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);

interface Bill {
  id: string;
  name: string;
  amount: number;
  nextDueDate?: string;
}

interface Subscription {
  id: string;
  name: string;
  amount: number;
  nextBillingDate?: string;
}

interface CashFlowData {
  totalBalance: number;
  expectedIncome: number;
  billsTotal: number;
  subsTotal: number;
  safeToSpend: number;
  upcomingBills?: Bill[];
  upcomingSubscriptions?: Subscription[];
}

interface CashFlowChartProps {
  data: CashFlowData | null | undefined;
  chartType: "sankey" | "horizontalBar" | "pie";
  isLoading?: boolean;
}

// True Sankey diagram based on standard design pattern
function SankeyChart({ data }: { data: CashFlowData }) {
  const income = data.expectedIncome;
  const expenses = data.billsTotal + data.subsTotal;
  const available = data.safeToSpend;
  const maxValue = Math.max(income, expenses + Math.max(0, available));

  if (maxValue === 0 || income === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        No data available
      </div>
    );
  }

  const bills = data.upcomingBills || [];
  const subscriptions = data.upcomingSubscriptions || [];
  const allExpenses = [...bills.map(b => ({ ...b, type: 'bill' })), ...subscriptions.map(s => ({ ...s, type: 'subscription' }))];
  
  // SVG dimensions
  const width = 900;
  const height = Math.max(400, allExpenses.length * 40 + 150);
  const nodeWidth = 80; // Narrower vertical bars like in the reference
  const nodeGap = 180; // Space between nodes
  const minBandHeight = 15;
  
  // Calculate node positions and heights - scale based on income
  const scale = (value: number) => (value / income) * (height - 100) || minBandHeight;
  
  // Left node: Income (vertical bar)
  const leftX = 50;
  const leftY = 50;
  const leftHeight = Math.max(scale(income), minBandHeight);
  
  // Center node: Budget/Expenses Hub (where income converges before splitting)
  const centerX = leftX + nodeWidth + nodeGap;
  const centerY = leftY;
  const centerHeight = leftHeight; // Hub matches income height
  
  // Right nodes: Individual expenses + Safe to Spend (vertical bars)
  const rightX = centerX + nodeWidth + nodeGap;
  const rightY = centerY; // Align right nodes with center node start
  
  // Calculate positions for right-side expense nodes
  let currentY = rightY;
  const rightNodes = allExpenses.map((expense) => {
    const nodeHeight = Math.max(scale(expense.amount), minBandHeight);
    const node = {
      ...expense,
      y: currentY,
      height: nodeHeight,
    };
    currentY += nodeHeight + 2; // Small gap between nodes
    return node;
  });
  
  // Add Safe to Spend node at the bottom
  const safeToSpendY = currentY;
  const safeToSpendHeight = Math.max(scale(Math.abs(available)), minBandHeight);
  
  // Helper to create curved Sankey path
  const createSankeyPath = (sourceX: number, sourceY: number, sourceHeight: number, 
                            targetX: number, targetY: number, targetHeight: number) => {
    const curveIntensity = 30;
    return `
      M ${sourceX} ${sourceY}
      L ${sourceX + nodeWidth} ${sourceY}
      C ${sourceX + nodeWidth + curveIntensity} ${sourceY},
        ${targetX - curveIntensity} ${targetY},
        ${targetX} ${targetY}
      L ${targetX} ${targetY + targetHeight}
      C ${targetX - curveIntensity} ${targetY + targetHeight},
        ${sourceX + nodeWidth + curveIntensity} ${sourceY + sourceHeight},
        ${sourceX + nodeWidth} ${sourceY + sourceHeight}
      Z
    `;
  };
  
  // Flow 1: Income → Budget Hub
  const incomeToHubPath = createSankeyPath(
    leftX,
    leftY,
    leftHeight,
    centerX,
    centerY,
    centerHeight
  );
  
  // Flow 2: Budget Hub → Individual Expenses
  // Each flow thread should have the same height as its target node
  // Position flows to align with target nodes
  const hubToExpensePaths = rightNodes.map((node) => {
    // Flow height matches target node height exactly
    const flowSourceY = centerY + (node.y - rightY);
    const path = createSankeyPath(
      centerX,
      flowSourceY,
      node.height, // Flow width matches target node height
      rightX,
      node.y,
      node.height
    );
    const color = node.type === 'bill' 
      ? 'hsl(var(--destructive))' 
      : 'hsl(var(--destructive) / 0.75)';
    return { path, color };
  });
  
  // Flow 3: Budget Hub → Safe to Spend
  // Flow height matches target node height exactly
  const safeToSpendFlowSourceY = centerY + (safeToSpendY - rightY);
  const hubToSafeToSpendPath = createSankeyPath(
    centerX,
    safeToSpendFlowSourceY,
    safeToSpendHeight, // Flow width matches target node height
    rightX,
    safeToSpendY,
    safeToSpendHeight
  );

  return (
    <div className="h-[500px] overflow-auto p-4">
      <svg width={width} height={height} className="w-full">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="1" dy="1" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Flow 1: Income → Budget Hub */}
        <path
          d={incomeToHubPath}
          fill="hsl(var(--chart-1))"
          opacity="0.85"
          filter="url(#shadow)"
        />
        
        {/* Flow 2: Budget Hub → Individual Expenses */}
        {hubToExpensePaths.map((pathData, index) => (
          <path
            key={`hub-to-expense-${index}`}
            d={pathData.path}
            fill={pathData.color}
            opacity="0.85"
            filter="url(#shadow)"
          />
        ))}
        
        {/* Flow 3: Budget Hub → Safe to Spend */}
        <path
          d={hubToSafeToSpendPath}
          fill={available >= 0 ? 'hsl(var(--chart-3))' : 'hsl(var(--destructive))'}
          opacity="0.85"
          filter="url(#shadow)"
        />
        
        {/* Left node: Income */}
        <rect
          x={leftX}
          y={leftY}
          width={nodeWidth}
          height={leftHeight}
          fill="hsl(var(--chart-1))"
          rx="4"
          filter="url(#shadow)"
        />
        <text
          x={leftX + nodeWidth / 2}
          y={leftY + leftHeight / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="12"
          fontWeight="bold"
        >
          Income
        </text>
        <text
          x={leftX + nodeWidth / 2}
          y={leftY + leftHeight / 2 + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="11"
        >
          {formatCurrency(income)}
        </text>
        
        {/* Center Node: Budget Hub */}
        <rect
          x={centerX}
          y={centerY}
          width={nodeWidth}
          height={centerHeight}
          fill="hsl(var(--muted))"
          rx="2"
          filter="url(#shadow)"
        />
        <text
          x={centerX + nodeWidth / 2}
          y={centerY + centerHeight / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="hsl(var(--foreground))"
          fontSize="12"
          fontWeight="bold"
        >
          Budget
        </text>
        
        {/* Right Nodes: Individual Expenses (vertical bars) */}
        {rightNodes.map((node, index) => (
          <g key={node.id}>
            <rect
              x={rightX}
              y={node.y}
              width={nodeWidth}
              height={node.height}
              fill={node.type === 'bill' ? 'hsl(var(--destructive))' : 'hsl(var(--destructive) / 0.75)'}
              rx="2"
              filter="url(#shadow)"
            />
            <text
              x={rightX + nodeWidth / 2}
              y={node.y + Math.min(node.height / 2, 10)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="10"
              fontWeight="bold"
            >
              {node.name.length > 12 ? node.name.substring(0, 12) + '...' : node.name}
            </text>
            <text
              x={rightX + nodeWidth / 2}
              y={node.y + Math.min(node.height / 2, 10) + 12}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="9"
            >
              {formatCurrency(node.amount)}
            </text>
          </g>
        ))}
        
        {/* Right Node: Safe to Spend (vertical bar) */}
        <rect
          x={rightX}
          y={safeToSpendY}
          width={nodeWidth}
          height={safeToSpendHeight}
          fill={available >= 0 ? 'hsl(var(--chart-3))' : 'hsl(var(--destructive))'}
          rx="2"
          filter="url(#shadow)"
        />
        <text
          x={rightX + nodeWidth / 2}
          y={safeToSpendY + safeToSpendHeight / 2 - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="11"
          fontWeight="bold"
        >
          {available >= 0 ? 'Safe to' : 'Deficit'}
        </text>
        <text
          x={rightX + nodeWidth / 2}
          y={safeToSpendY + safeToSpendHeight / 2 + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="10"
        >
          {formatCurrency(available)}
        </text>
      </svg>
    </div>
  );
}

function HorizontalBarChart({ data }: { data: CashFlowData }) {
  const bills = data.upcomingBills || [];
  const subscriptions = data.upcomingSubscriptions || [];

  const chartData = [
    {
      name: "Income",
      value: data.expectedIncome,
      type: "income",
    },
    ...bills.map((bill) => ({
      name: bill.name,
      value: -bill.amount,
      type: "expense" as const,
      category: "bill" as const,
    })),
    ...subscriptions.map((sub) => ({
      name: sub.name,
      value: -sub.amount,
      type: "expense" as const,
      category: "subscription" as const,
    })),
    {
      name: "Safe to Spend",
      value: data.safeToSpend,
      type: "available",
    },
  ].filter((item) => Math.abs(item.value) > 0);

  const chartConfig = {
    income: {
      label: "Income",
      color: "hsl(var(--chart-1))",
    },
    expense: {
      label: "Expenses",
      color: "hsl(var(--destructive))",
    },
    available: {
      label: "Available",
      color: "hsl(var(--chart-3))",
    },
  };

  const getBarColor = (entry: any) => {
    if (entry.type === "income") return chartConfig.income.color;
    if (entry.type === "available") return chartConfig.available.color;
    // Different shades for bills vs subscriptions
    if (entry.category === "bill") return "hsl(var(--destructive))";
    return "hsl(var(--destructive) / 0.7)";
  };

  return (
    <ChartContainer config={chartConfig} className="h-[400px]">
      <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 20 }}>
        <XAxis type="number" tickFormatter={formatCurrency} />
        <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 12 }} />
        <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
        <Bar dataKey="value">
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function PieChartView({ data }: { data: CashFlowData }) {
  const bills = data.upcomingBills || [];
  const subscriptions = data.upcomingSubscriptions || [];

  const chartData = [
    {
      name: "Income",
      value: data.expectedIncome,
      fill: "hsl(var(--chart-1))",
    },
    ...bills.map((bill, index) => ({
      name: bill.name,
      value: bill.amount,
      fill: `hsl(var(--destructive) / ${0.9 - (index * 0.1)})`,
    })),
    ...subscriptions.map((sub, index) => ({
      name: sub.name,
      value: sub.amount,
      fill: `hsl(var(--destructive) / ${0.7 - (index * 0.05)})`,
    })),
    ...(data.safeToSpend > 0
      ? [
          {
            name: "Safe to Spend",
            value: data.safeToSpend,
            fill: "hsl(var(--chart-3))",
          },
        ]
      : []),
  ].filter((item) => item.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <ChartContainer
      config={{
        income: { label: "Income", color: "hsl(var(--chart-1))" },
        available: { label: "Safe to Spend", color: "hsl(var(--chart-3))" },
      }}
      className="h-[400px]"
    >
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => {
            const pct = (percent * 100).toFixed(0);
            // Only show label if slice is large enough
            return percent > 0.05 ? `${name}: ${pct}%` : "";
          }}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
      </PieChart>
    </ChartContainer>
  );
}

export function CashFlowChart({ data, chartType, isLoading }: CashFlowChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Visualization</CardTitle>
          <CardDescription>Visual breakdown of income, expenses, and available funds.</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Visualization</CardTitle>
          <CardDescription>Visual breakdown of income, expenses, and available funds.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No cash flow data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Visualization</CardTitle>
        <CardDescription>Visual breakdown of income, expenses, and available funds.</CardDescription>
      </CardHeader>
      <CardContent>
        {chartType === "sankey" && <SankeyChart data={data} />}
        {chartType === "horizontalBar" && <HorizontalBarChart data={data} />}
        {chartType === "pie" && <PieChartView data={data} />}
      </CardContent>
    </Card>
  );
}
