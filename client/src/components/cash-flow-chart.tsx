import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Legend, LabelList } from "recharts";
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

interface IncomeSource {
  id: string;
  name: string;
  amount: number;
}

interface ExpenseCategory {
  categoryId: string;
  categoryName: string;
  total: number;
  color?: string;
}

interface CashFlowData {
  totalBalance: number;
  expectedIncome: number;
  incomeSources?: IncomeSource[];
  expensesTotal?: number;
  billsTotal: number;
  subsTotal: number;
  safeToSpend: number;
  upcomingBills?: Bill[];
  upcomingSubscriptions?: Subscription[];
  expensesByCategory?: ExpenseCategory[];
  topVendors?: Array<{ merchantName: string; total: number }>;
  savingsTotal?: number;
  loanPaymentsTotal?: number;
  plannedSpendingTotal?: number;
}

interface CashFlowChartProps {
  data: CashFlowData | null | undefined;
  chartType: "sankey" | "horizontalBar" | "pie";
  isLoading?: boolean;
}

// Sankey diagram following reference format: Income Sources → Budget Hub → Main Categories → Subcategories (if applicable)
function SankeyChart({ data }: { data: CashFlowData }) {
  const income = data.expectedIncome;
  const expenses = data.expensesTotal || 0;
  const billsTotal = data.billsTotal;
  const subsTotal = data.subsTotal;
  const loanPaymentsTotal = data.loanPaymentsTotal || 0;
  const savings = data.savingsTotal || 0; // Use savingsTotal (monthly contributions) instead of safeToSpend
  const expensesByCategory = data.expensesByCategory || [];
  
  // Get category colors map for matching bar chart colors
  const categoryColorMap = new Map(expensesByCategory.map(cat => [cat.categoryId, cat.color]));
  
  // Create expense category breakdowns
  const expenseCategories = expensesByCategory.map(cat => ({
    id: `expense-${cat.categoryId}`,
    name: cat.categoryName,
    amount: cat.total,
    categoryId: cat.categoryId,
  }));
  
  const totalOutflow = expenses + billsTotal + subsTotal + loanPaymentsTotal + savings;
  const maxValue = Math.max(income, totalOutflow);

  if (maxValue === 0 || income === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        No data available
      </div>
    );
  }

  const bills = data.upcomingBills || [];
  const subscriptions = data.upcomingSubscriptions || [];
  
  // Replace employer names with single "Income" source
  const incomeSources = [{ id: 'income-0', name: 'Income', amount: income }];
  
  // Main categories flowing from center hub (column 3)
  // Group expenses by category for better visualization
  const expenseCategoryTotal = expensesByCategory.reduce((sum, cat) => sum + cat.total, 0);
  const mainCategories = [
    ...(expenseCategoryTotal > 0 ? [{ 
      id: 'expenses', 
      name: 'Expenses', 
      amount: expenseCategoryTotal, 
      type: 'expense' as const, 
      hasSubcategories: expenseCategories.length > 0,
      subcategories: expenseCategories.length > 0 ? expenseCategories : undefined,
      categoryId: undefined,
    }] : []),
    ...(billsTotal > 0 ? [{ id: 'bills', name: 'Bills', amount: billsTotal, type: 'bill' as const, hasSubcategories: true, subcategories: bills }] : []),
    ...(subsTotal > 0 ? [{ id: 'subscriptions', name: 'Subscriptions', amount: subsTotal, type: 'subscription' as const, hasSubcategories: true, subcategories: subscriptions }] : []),
    ...(loanPaymentsTotal > 0 ? [{ id: 'loan-payments', name: 'Loan Payments', amount: loanPaymentsTotal, type: 'loan' as const, hasSubcategories: false }] : []),
    ...(savings > 0 ? [{ id: 'savings', name: 'Savings', amount: savings, type: 'savings' as const, hasSubcategories: false }] : []),
  ].filter(cat => cat.amount > 0);

  if (mainCategories.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        No expenses to display
      </div>
    );
  }
  
  // Calculate dimensions - 4 columns: Income → Hub → Categories → Subcategories
  const maxAmount = Math.max(income, totalOutflow);
  
  // Count all nodes for height calculation
  const allSubcategories: Array<{ id: string; name: string; amount: number; parentId: string }> = [];
  mainCategories.forEach(cat => {
    if (cat.hasSubcategories && 'subcategories' in cat) {
      cat.subcategories.forEach((sub: any) => {
        allSubcategories.push({
          id: sub.id,
          name: sub.name,
          amount: sub.amount,
          parentId: cat.id
        });
      });
    }
  });
  
  // SVG dimensions
  const nodeWidth = 100;
  const nodeGap = 150;
  const minBandHeight = 15;
  const totalNodesHeight = Math.max(mainCategories.length * 80, allSubcategories.length * 40 + 100);
  const height = Math.max(600, totalNodesHeight + 100);
  const width = 1200; // Wider to accommodate 4 columns
  
  // Calculate node positions and heights - scale based on max amount for consistent proportions
  const scale = (value: number) => {
    if (maxAmount === 0) return minBandHeight;
    return Math.max((value / maxAmount) * (height - 150), minBandHeight);
  };
  
  // Column 1: Income Sources (left) - multiple sources flowing into Budget hub
  const col1X = 50;
  const col1Y = 100;
  
  // Calculate positions for income source nodes
  let currentCol1Y = col1Y;
  const incomeSourceNodes = incomeSources.map((source) => {
    const nodeHeight = Math.max(scale(source.amount), minBandHeight);
    const node = {
      ...source,
      y: currentCol1Y,
      height: nodeHeight,
    };
    currentCol1Y += nodeHeight + 5; // Gap between income sources
    return node;
  });
  const col1TotalHeight = currentCol1Y - col1Y - 5; // Total height of all income sources
  
  // Column 2: Budget Hub (center-left) - all income flows converge here
  const col2X = col1X + nodeWidth + nodeGap;
  const col2Y = col1Y;
  const col2Height = Math.max(col1TotalHeight, scale(income)); // Hub height matches total income
  
  // Column 3: Main Categories (center-right)
  const col3X = col2X + nodeWidth + nodeGap;
  const col3Y = col2Y;
  
  // Column 4: Subcategories (right)
  const col4X = col3X + nodeWidth + nodeGap;
  
  // Calculate subcategory positions first, then align categories
  let currentCol4Y = col3Y;
  const subcategoryNodes: Array<{ id: string; name: string; amount: number; y: number; height: number; parentId: string }> = [];
  const categoryNodes: Array<{ id: string; name: string; amount: number; type: string; y: number; height: number; hasSubcategories: boolean; subcategories?: any[] }> = [];
  
  // Process each main category to determine positions
  mainCategories.forEach((cat) => {
    if (cat.hasSubcategories && 'subcategories' in cat && cat.subcategories && cat.subcategories.length > 0) {
      // Categories with subcategories: align category node to match subcategory total height
      const categoryStartY = currentCol4Y;
      let categoryTotalHeight = 0;
      
      cat.subcategories.forEach((sub: any) => {
        const subHeight = Math.max(scale(sub.amount), minBandHeight);
        subcategoryNodes.push({
          id: sub.id,
          name: sub.name,
          amount: sub.amount,
          y: currentCol4Y,
          height: subHeight,
          parentId: cat.id
        });
        currentCol4Y += subHeight + 2;
        categoryTotalHeight += subHeight + 2;
      });
      categoryTotalHeight -= 2; // Remove last gap
      currentCol4Y += 3; // Gap after category group
      
      // Create category node aligned with subcategories
      categoryNodes.push({
        ...cat,
        y: categoryStartY,
        height: Math.max(categoryTotalHeight, scale(cat.amount)),
      });
    } else {
      // Categories WITHOUT subcategories: do NOT create nodes in Column 4
      // They will be positioned in Column 3 only and terminate there
      // Position will be calculated after categories with subcategories
    }
  });
  
  // Now add categories WITHOUT subcategories to categoryNodes array
  // Position them sequentially after categories with subcategories
  let currentCol3YForTerminals = col3Y;
  mainCategories.forEach((cat) => {
    if (!cat.hasSubcategories || !('subcategories' in cat) || !cat.subcategories || cat.subcategories.length === 0) {
      // This category doesn't have subcategories - position it in Column 3 only
      // Check if it's already in categoryNodes (it shouldn't be)
      const existing = categoryNodes.find(n => n.id === cat.id);
      if (!existing) {
        // Find the highest Y position already used
        const maxUsedY = categoryNodes.length > 0 
          ? Math.max(...categoryNodes.map(n => n.y + n.height))
          : col3Y;
        currentCol3YForTerminals = Math.max(currentCol3YForTerminals, maxUsedY);
        
        const nodeHeight = Math.max(scale(cat.amount), minBandHeight);
        categoryNodes.push({
          ...cat,
          y: currentCol3YForTerminals,
          height: nodeHeight,
        });
        currentCol3YForTerminals += nodeHeight + 5; // Gap between categories
      }
    }
  });
  
  // Sort categoryNodes by Y position to ensure proper order
  categoryNodes.sort((a, b) => a.y - b.y);
  
  // Helper to create curved Sankey path
  const createSankeyPath = (sourceX: number, sourceY: number, sourceHeight: number, 
                            targetX: number, targetY: number, targetHeight: number) => {
    const curveIntensity = 50;
    return `
      M ${sourceX + nodeWidth} ${sourceY}
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
  
  // Flow 1: Income Sources → Budget Hub (multiple income sources flow into hub)
  let cumulativeIncomeProportion = 0;
  const incomeToHubPaths = incomeSourceNodes.map((source) => {
    const proportion = income > 0 ? source.amount / income : 0;
    const flowSourceY = col2Y + (cumulativeIncomeProportion * col2Height);
    const flowSourceHeight = col2Height * proportion;
    cumulativeIncomeProportion += proportion;
    
    const path = createSankeyPath(
      col1X,
      source.y,
      source.height,
      col2X,
      flowSourceY,
      flowSourceHeight
    );
    
    return path;
  });
  
  // Helper to get category color - match bar chart colors
  const getCategoryColor = (node: any, index: number) => {
    // If node has categoryId and we have a color for it, use that
    if (node.categoryId && categoryColorMap.has(node.categoryId)) {
      return categoryColorMap.get(node.categoryId)!;
    }
    // If node type is expense and has subcategories, use default expense color
    if (node.type === 'expense') {
      return 'hsl(220, 70%, 55%)'; // Blue for expenses
    }
    // Use type-based colors for bills, subscriptions, loans, savings
    if (node.type === 'bill') {
      return 'hsl(0, 70%, 55%)'; // Red for bills
    }
    if (node.type === 'subscription') {
      return 'hsl(280, 70%, 55%)'; // Purple for subscriptions
    }
    if (node.type === 'loan') {
      return 'hsl(340, 70%, 55%)'; // Pink for loan payments
    }
    if (node.type === 'savings') {
      return 'hsl(142, 70%, 55%)'; // Green for savings
    }
    // Fallback to color palette
    const colors = [
      'hsl(0, 70%, 55%)',
      'hsl(25, 85%, 55%)',
      'hsl(45, 85%, 55%)',
      'hsl(220, 70%, 55%)',
      'hsl(280, 70%, 55%)',
      'hsl(340, 70%, 55%)',
      'hsl(160, 60%, 55%)',
      'hsl(200, 70%, 55%)',
    ];
    return colors[index % colors.length];
  };
  
  // Flow 2: Budget Hub → Main Categories
  let cumulativeProportion = 0;
  const hubToCategoryPaths = categoryNodes.map((node, index) => {
    const proportion = income > 0 ? node.amount / income : 0;
    const flowSourceY = col2Y + (cumulativeProportion * col2Height);
    const flowSourceHeight = col2Height * proportion;
    cumulativeProportion += proportion;
    
    const path = createSankeyPath(
      col2X,
      flowSourceY,
      flowSourceHeight,
      col3X,
      node.y,
      node.height
    );
    
    const color = getCategoryColor(node, index);
    
    return { path, color, categoryId: node.id };
  });
  
  // Flow 3: Main Categories → Subcategories (for categories with subcategories)
  const categoryToSubcategoryPaths: Array<{ path: string; color: string }> = [];
  
  categoryNodes.forEach((cat) => {
    if (cat.hasSubcategories && 'subcategories' in cat) {
      const categorySubs = subcategoryNodes.filter(sub => sub.parentId === cat.id);
      if (categorySubs.length > 0) {
        let cumulativeSubProportion = 0;
        categorySubs.forEach((sub) => {
          const subProportion = cat.amount > 0 ? sub.amount / cat.amount : 0;
          const flowSourceY = cat.y + (cumulativeSubProportion * cat.height);
          const flowSourceHeight = cat.height * subProportion;
          cumulativeSubProportion += subProportion;
          
          const path = createSankeyPath(
            col3X,
            flowSourceY,
            flowSourceHeight,
            col4X,
            sub.y,
            sub.height
          );
          
          const categoryPath = hubToCategoryPaths.find(p => p.categoryId === cat.id);
          const color = categoryPath?.color || 'hsl(var(--destructive))';
          categoryToSubcategoryPaths.push({ path, color });
        });
      }
    }
    // Categories WITHOUT subcategories do NOT flow to Column 4 - they terminate in Column 3
  });

  return (
    <div className="h-[600px] overflow-auto p-4">
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
        
        {/* Flow 1: Income Sources → Budget Hub (multiple flows) */}
        {incomeToHubPaths.map((path, index) => (
          <path
            key={`income-to-hub-${index}`}
            d={path}
            fill="hsl(var(--chart-1))"
            opacity="0.8"
            filter="url(#shadow)"
          />
        ))}
        
        {/* Flow 2: Hub → Main Categories */}
        {hubToCategoryPaths.map((pathData, index) => (
          <path
            key={`hub-to-category-${index}`}
            d={pathData.path}
            fill={pathData.color}
            opacity="0.8"
            filter="url(#shadow)"
          />
        ))}
        
        {/* Flow 3: Main Categories → Subcategories */}
        {categoryToSubcategoryPaths.map((pathData, index) => (
          <path
            key={`category-to-sub-${index}`}
            d={pathData.path}
            fill={pathData.color}
            opacity="0.7"
            filter="url(#shadow)"
          />
        ))}
        
        {/* Column 1: Income Source Nodes (multiple sources) */}
        {incomeSourceNodes.map((source) => (
          <g key={source.id}>
            <rect
              x={col1X}
              y={source.y}
              width={nodeWidth}
              height={source.height}
              fill="hsl(var(--chart-1))"
              rx="4"
              filter="url(#shadow)"
            />
            <text
              x={col1X + nodeWidth / 2}
              y={source.y + Math.min(source.height / 2, 12) - 6}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="12"
              fontWeight="bold"
            >
              {source.name.length > 15 ? source.name.substring(0, 15) + '...' : source.name}
            </text>
            <text
              x={col1X + nodeWidth / 2}
              y={source.y + Math.min(source.height / 2, 12) + 8}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="11"
            >
              {formatCurrency(source.amount)}
            </text>
          </g>
        ))}
        
        {/* Column 2: Budget Hub */}
        <rect
          x={col2X}
          y={col2Y}
          width={nodeWidth}
          height={col2Height}
          fill="hsl(var(--chart-1))"
          rx="4"
          filter="url(#shadow)"
        />
        <text
          x={col2X + nodeWidth / 2}
          y={col2Y + col2Height / 2 - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="13"
          fontWeight="bold"
        >
          Budget
        </text>
        <text
          x={col2X + nodeWidth / 2}
          y={col2Y + col2Height / 2 + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="12"
        >
          {formatCurrency(income)}
        </text>
        
        {/* Column 3: Main Category Nodes */}
        {categoryNodes.map((node, index) => (
          <g key={node.id}>
            <rect
              x={col3X}
              y={node.y}
              width={nodeWidth}
              height={node.height}
              fill={getCategoryColor(node, index)}
              rx="4"
              filter="url(#shadow)"
            />
            <text
              x={col3X + nodeWidth / 2}
              y={node.y + Math.min(node.height / 2, 12) - 6}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="11"
              fontWeight="bold"
            >
              {node.name}
            </text>
            <text
              x={col3X + nodeWidth / 2}
              y={node.y + Math.min(node.height / 2, 12) + 8}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="10"
            >
              {formatCurrency(node.amount)}
            </text>
          </g>
        ))}
        
        {/* Column 4: Subcategory Nodes */}
        {subcategoryNodes.map((node) => (
          <g key={node.id}>
            <rect
              x={col4X}
              y={node.y}
              width={nodeWidth}
              height={node.height}
              fill={(() => {
                const parentCategory = categoryNodes.find((cat, idx) => cat.id === node.parentId);
                if (!parentCategory) return 'hsl(var(--destructive))';
                // If subcategory is an expense category, use its specific color
                if (node.categoryId && categoryColorMap.has(node.categoryId)) {
                  return categoryColorMap.get(node.categoryId)!;
                }
                // Otherwise use parent category color
                const parentIndex = categoryNodes.findIndex(cat => cat.id === node.parentId);
                return getCategoryColor(parentCategory, parentIndex);
              })()}
              rx="4"
              filter="url(#shadow)"
            />
            <text
              x={col4X + nodeWidth / 2}
              y={node.y + Math.min(node.height / 2, 10) - 5}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="9"
              fontWeight="bold"
            >
              {node.name.length > 14 ? node.name.substring(0, 14) + '...' : node.name}
            </text>
            <text
              x={col4X + nodeWidth / 2}
              y={node.y + Math.min(node.height / 2, 10) + 7}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="8"
            >
              {formatCurrency(node.amount)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function HorizontalBarChart({ data }: { data: CashFlowData }) {
  // Group expenses by category, not vendors
  const expensesByCategory = data.expensesByCategory || [];
  const topVendors = data.topVendors || [];

  // Remove income - only show expense categories
  const chartData = expensesByCategory.map((cat) => ({
    name: cat.categoryName,
    value: -cat.total, // Negative for expenses (left side of axis)
    categoryId: cat.categoryId,
    color: cat.color || "hsl(var(--destructive))",
  })).filter((item) => Math.abs(item.value) > 0);

  // Generate distinct colors if category doesn't have one
  const getCategoryColor = (index: number, defaultColor?: string) => {
    if (defaultColor) return defaultColor;
    const colors = [
      "hsl(0, 70%, 55%)",    // Red
      "hsl(25, 85%, 55%)",   // Orange
      "hsl(45, 85%, 55%)",   // Yellow-Orange
      "hsl(220, 70%, 55%)",  // Blue
      "hsl(280, 70%, 55%)",  // Purple
      "hsl(340, 70%, 55%)",  // Pink
      "hsl(160, 60%, 55%)",  // Teal
      "hsl(200, 70%, 55%)",  // Cyan
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="flex gap-6">
      <ChartContainer config={{}} className="h-[400px] flex-1">
        <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 100, top: 20, bottom: 20 }}>
          <XAxis type="number" tickFormatter={formatCurrency} />
          <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 12 }} />
          <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
          <Bar dataKey="value">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getCategoryColor(index, entry.color)} />
            ))}
            <LabelList
              dataKey="value"
              position="insideLeft"
              formatter={(value: number) => formatCurrency(Math.abs(value))}
              fill="white"
              fontSize={11}
              fontWeight="bold"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      {topVendors.length > 0 && (
        <div className="w-64 border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Top Vendors</h3>
          <div className="space-y-2">
            {topVendors.map((vendor) => (
              <div key={vendor.merchantName} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate flex-1 mr-2">{vendor.merchantName}</span>
                <span className="font-medium">{formatCurrency(vendor.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PieChartView({ data }: { data: CashFlowData }) {
  const expenses = data.expensesTotal || 0;
  const plannedSpending = data.plannedSpendingTotal || 0;
  const savings = data.savingsTotal || 0;
  const safeToSpend = data.safeToSpend || 0;

  // Pie chart shows 4 aggregated slices:
  // 1. Expenses (all actual expenses)
  // 2. Planned Spending (bills + subscriptions + loan payments)
  // 3. Savings (monthly contributions from goals)
  // 4. Safe to Spend
  // Income is the total area (100%) but not displayed as a slice
  const chartData = [
    ...(expenses > 0 ? [{
      name: "Expenses",
      value: expenses,
      fill: "hsl(var(--destructive))",
    }] : []),
    ...(plannedSpending > 0 ? [{
      name: "Planned Spending",
      value: plannedSpending,
      fill: "hsl(280, 70%, 60%)", // Purple
    }] : []),
    ...(savings > 0 ? [{
      name: "Savings",
      value: savings,
      fill: "hsl(220, 70%, 60%)", // Blue
    }] : []),
    ...(safeToSpend > 0 ? [{
      name: "Safe to Spend",
      value: safeToSpend,
      fill: "hsl(var(--chart-3))", // Green
    }] : []),
  ].filter((item) => item.value > 0);

  const topCategories = (data.expensesByCategory || []).slice(0, 10);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      <ChartContainer
        config={{
          income: { label: "Income", color: "hsl(var(--chart-1))" },
          available: { label: "Safe to Spend", color: "hsl(var(--chart-3))" },
        }}
        className="h-[400px] flex-1"
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
      {topCategories.length > 0 && (
        <div className="w-64 border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Top Expense Categories</h3>
          <div className="space-y-2">
            {topCategories.map((cat) => (
              <div key={cat.categoryId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {cat.color && (
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  )}
                  <span className="text-muted-foreground">{cat.categoryName}</span>
                </div>
                <span className="font-medium">{formatCurrency(cat.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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
