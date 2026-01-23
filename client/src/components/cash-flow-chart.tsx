import { useRef, useEffect, useState } from "react";
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
  parentId?: string;
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

// Sankey diagram: Income Sources → Total Income → Budget → Main Categories → Subcategories
function SankeyChart({ data }: { data: CashFlowData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    };
    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      updateWidth();
    });
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [data]);

  const income = data.expectedIncome;
  const expenses = data.expensesTotal || 0;
  const billsTotal = data.billsTotal;
  const subsTotal = data.subsTotal;
  const loanPaymentsTotal = data.loanPaymentsTotal || 0;
  const savings = data.savingsTotal || 0;
  const safeToSpend = data.safeToSpend || 0;
  const expensesByCategory = data.expensesByCategory || [];
  const bills = data.upcomingBills || [];
  const subscriptions = data.upcomingSubscriptions || [];
  const incomeSourcesData = data.incomeSources || [];

  if (income === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        No data available
      </div>
    );
  }

  // Filter zero-value income sources
  let validIncomeSources = incomeSourcesData.filter(s => s.amount > 0);
  if (validIncomeSources.length === 0) {
    validIncomeSources = [{ id: 'income-0', name: 'Income', amount: income }];
  }

  // Build category map for grouping and color lookup
  const categoryMap = new Map(expensesByCategory.map(cat => [cat.categoryId, cat]));
  
  // Group expense categories: subcategories under parent main categories
  const expenseMainCategoryMap = new Map<string, { categoryId: string; categoryName: string; total: number; color?: string; subcategories: Array<{ id: string; name: string; amount: number; categoryId: string }> }>();
  
  expensesByCategory.forEach((cat) => {
    if (cat.total <= 0) return; // Filter zero-value categories
    
    if (cat.parentId) {
      // This is a subcategory - add to parent
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        const existing = expenseMainCategoryMap.get(cat.parentId);
        if (existing) {
          existing.total += cat.total;
          existing.subcategories.push({
            id: `expense-${cat.categoryId}`,
            name: cat.categoryName,
            amount: cat.total,
            categoryId: cat.categoryId,
          });
        } else {
          expenseMainCategoryMap.set(cat.parentId, {
            categoryId: parent.categoryId,
            categoryName: parent.categoryName,
            total: cat.total,
            color: parent.color || cat.color,
            subcategories: [{
              id: `expense-${cat.categoryId}`,
              name: cat.categoryName,
              amount: cat.total,
              categoryId: cat.categoryId,
            }],
          });
        }
      }
    } else {
      // This is a main category
      const existing = expenseMainCategoryMap.get(cat.categoryId);
      if (existing) {
        existing.total += cat.total;
      } else {
        expenseMainCategoryMap.set(cat.categoryId, {
          categoryId: cat.categoryId,
          categoryName: cat.categoryName,
          total: cat.total,
          color: cat.color,
          subcategories: [],
        });
      }
    }
  });

  // Get color function matching horizontal bar chart
  const getCategoryColor = (categoryId: string, defaultColor?: string) => {
    const category = expensesByCategory.find(c => c.categoryId === categoryId);
    if (category?.color) return category.color;
    if (defaultColor) return defaultColor;
    // Fallback to same palette as horizontal bar chart
    return "hsl(var(--destructive))";
  };
  
  // Build main categories array (filter zero-value)
  const mainCategories: Array<{
    id: string;
    name: string;
    amount: number;
    type: 'expense' | 'bill' | 'subscription' | 'loan' | 'savings';
    hasSubcategories: boolean;
    subcategories?: any[];
    categoryId?: string;
  }> = [];

  // Add expense main categories
  expenseMainCategoryMap.forEach((cat) => {
    if (cat.total > 0) {
      mainCategories.push({
        id: cat.categoryId,
        name: cat.categoryName,
        amount: cat.total,
        type: 'expense',
        hasSubcategories: cat.subcategories.length > 0,
        subcategories: cat.subcategories.length > 0 ? cat.subcategories : undefined,
        categoryId: cat.categoryId,
      });
    }
  });

  // Add subscriptions (with subcategories if any)
  if (subsTotal > 0) {
    const validSubscriptions = subscriptions.filter((s: any) => s.amount > 0);
    mainCategories.push({
      id: 'subscriptions',
      name: 'Subscriptions',
      amount: subsTotal,
      type: 'subscription',
      hasSubcategories: validSubscriptions.length > 0,
      subcategories: validSubscriptions.length > 0 ? validSubscriptions.map((s: any) => ({
        id: s.id || `sub-${s.name}`,
        name: s.name,
        amount: s.amount,
      })) : undefined,
    });
  }

  // Add savings (no subcategories)
  if (savings > 0) {
    mainCategories.push({
      id: 'savings',
      name: 'Savings',
      amount: savings,
      type: 'savings',
      hasSubcategories: false,
    });
  }

  // Add loan payments (no subcategories)
  if (loanPaymentsTotal > 0) {
    mainCategories.push({
      id: 'loan-payments',
      name: 'Loan Payments',
      amount: loanPaymentsTotal,
      type: 'loan',
      hasSubcategories: false,
    });
  }

  if (mainCategories.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        No expenses to display
      </div>
    );
  }

  // Calculate total outflow for Budget height
  const totalOutflow = mainCategories.reduce((sum, cat) => sum + cat.amount, 0);
  
  // Calculate dynamic card dimensions based on content
  // Start with base height and calculate actual needed height
  const baseCardHeight = 500; // Increased base height for Sankey
  const cardPadding = 20;
  const maxDiagramHeight = baseCardHeight - cardPadding * 2; // ~460px
  
  // SVG dimensions - compact, layered layout to maximize space usage
  const nodeWidth = 85;
  const minBandHeight = 10;
  
  // Calculate proportional scaling factor - reduced for better vertical fit
  const maxAmount = Math.max(income, totalOutflow);
  const scaleFactor = (value: number, total: number) => {
    if (total === 0) return minBandHeight;
    // Reduced multiplier to ensure content fits within height constraint
    return Math.max((value / total) * maxDiagramHeight * 0.55, minBandHeight);
  };
  
  // Check if we'll have subcategories (need to know this for column calculation)
  const willHaveSubcategories = mainCategories.some(cat => cat.hasSubcategories && cat.subcategories && cat.subcategories.length > 0);
  
  // Calculate node positions based on container width
  const numColumns = willHaveSubcategories ? 5 : 4;
  const totalAvailableWidth = containerWidth - 20; // Leave 10px padding on each side
  const totalGapsNeeded = numColumns - 1;
  const totalNodeWidth = nodeWidth * numColumns;
  const availableSpaceForGaps = totalAvailableWidth - totalNodeWidth - 10; // 10px total padding
  const dynamicNodeGap = Math.max(60, availableSpaceForGaps / totalGapsNeeded);
  
  // Position columns evenly across container
  const col1X = 10;
  const col1Y = 10;
  
  // Position income source nodes (Column 1)
  let currentCol1Y = col1Y;
  const incomeSourceNodes = validIncomeSources.map((source) => {
    const nodeHeight = scaleFactor(source.amount, income);
    const node = {
      ...source,
      y: currentCol1Y,
      height: nodeHeight,
    };
        currentCol1Y += nodeHeight + 1;
    return node;
  });
  const col1TotalHeight = currentCol1Y - col1Y - 2;
  
  // Column 2: Total Income
  const col2X = col1X + nodeWidth + dynamicNodeGap;
  const col2Y = col1Y;
  const col2Height = col1TotalHeight; // Total Income height = sum of income sources
  
  // Column 3: Budget and Safe to Spend - vertically aligned
  const col3X = col2X + nodeWidth + dynamicNodeGap;
  const col3Y = col2Y;
  
  // Calculate Budget height based on total outflow proportion
  const col3Height = totalOutflow > 0 
    ? scaleFactor(totalOutflow, maxAmount) 
    : minBandHeight;
  
  // Calculate Safe to Spend height - proportional to income
  const col3SafeToSpendHeight = safeToSpend > 0 
    ? scaleFactor(safeToSpend, maxAmount)
    : 0;
  
  // Gap between Budget and Safe to Spend nodes
  const budgetToSafeToSpendGap = 8;
  
  // Position Safe to Spend node vertically aligned with Budget
  // Place it directly below Budget if both exist
  const col3SafeToSpendY = col3SafeToSpendHeight > 0
    ? col3Y + col3Height + budgetToSafeToSpendGap
    : col3Y;
  
  // Column 4: Main Categories
  const col4X = col3X + nodeWidth + dynamicNodeGap;
  const col4Y = col3Y;
  
  // Column 5: Subcategories
  const col5X = col4X + nodeWidth + dynamicNodeGap;
  
  // Position main categories (Column 4) and their subcategories (Column 5)
  // Categories and subcategories should be proportional to Budget node size
  let currentCol4Y = col4Y;
  const categoryNodes: Array<{ id: string; name: string; amount: number; type: string; y: number; height: number; hasSubcategories: boolean; subcategories?: any[]; categoryId?: string }> = [];
  const subcategoryNodes: Array<{ id: string; name: string; amount: number; y: number; height: number; parentId: string; categoryId?: string }> = [];
  
  // Calculate dynamic gaps based on content density and available space
  // More categories/subcategories = smaller gaps, fewer = larger gaps for readability
  const totalCategories = mainCategories.length;
  const totalSubcategories = mainCategories.reduce((sum, cat) => {
    if (cat.hasSubcategories && cat.subcategories) {
      return sum + cat.subcategories.filter((s: any) => s.amount > 0).length;
    }
    return sum;
  }, 0);
  
  // Base gaps that scale with content density
  // Minimum gaps for readability, but adjust based on how many items we have
  const baseSubcategoryGap = Math.max(4, Math.min(8, 12 - totalSubcategories * 0.1));
  const baseCategoryGap = Math.max(6, Math.min(12, 15 - totalCategories * 0.2));
  
  // Additional spacing factor based on node size to maintain readability
  // Smaller nodes need more space, larger nodes can be closer
  const avgNodeHeight = mainCategories.length > 0 
    ? mainCategories.reduce((sum, cat) => {
        const catHeight = totalOutflow > 0 ? (cat.amount / totalOutflow) * col3Height : minBandHeight;
        return sum + catHeight;
      }, 0) / mainCategories.length
    : minBandHeight;
  const sizeAdjustmentFactor = Math.max(0.8, Math.min(1.5, minBandHeight / Math.max(avgNodeHeight, 1)));
  
  const subcategoryGap = baseSubcategoryGap * sizeAdjustmentFactor;
  const categoryGap = baseCategoryGap * sizeAdjustmentFactor;
  
  mainCategories.forEach((cat) => {
    const categoryStartY = currentCol4Y;
    
    // Calculate category height proportional to Budget node size
    const categoryHeight = totalOutflow > 0 
      ? (cat.amount / totalOutflow) * col3Height
      : minBandHeight;
    
    if (cat.hasSubcategories && cat.subcategories && cat.subcategories.length > 0) {
      // Category has subcategories: calculate total height from subcategories
      // Subcategories should be proportional to their parent category
      let categoryTotalHeight = 0;
      const validSubs = cat.subcategories.filter((s: any) => s.amount > 0);
      
      validSubs.forEach((sub: any, index: number) => {
        // Subcategory height proportional to category height
        const subHeight = cat.amount > 0 
          ? (sub.amount / cat.amount) * categoryHeight
          : minBandHeight;
        subcategoryNodes.push({
          id: sub.id,
          name: sub.name,
          amount: sub.amount,
          y: currentCol4Y,
          height: subHeight,
          parentId: cat.id,
          categoryId: sub.categoryId,
        });
        // Add gap after each subcategory except the last
        if (index < validSubs.length - 1) {
          currentCol4Y += subHeight + subcategoryGap;
          categoryTotalHeight += subHeight + subcategoryGap;
        } else {
          currentCol4Y += subHeight;
          categoryTotalHeight += subHeight;
        }
      });
      currentCol4Y += categoryGap; // Gap after category group
      
      // Use the actual subcategory total height (should match categoryHeight proportionally)
      categoryNodes.push({
        ...cat,
        y: categoryStartY,
        height: Math.max(categoryTotalHeight, categoryHeight),
      });
    } else {
      // Category without subcategories - use proportional height directly
      categoryNodes.push({
        ...cat,
        y: currentCol4Y,
        height: categoryHeight,
      });
      currentCol4Y += categoryHeight + categoryGap; // Gap between categories
    }
  });
  
  // Budget height is already calculated proportionally above
  
  // Calculate total height needed - ensure it fits in card
  const maxY = Math.max(
    currentCol4Y,
    ...subcategoryNodes.map(n => n.y + n.height),
    col1Y + col1TotalHeight,
    col2Y + col2Height,
    col3Y + col3Height,
    col3SafeToSpendHeight > 0 ? col3SafeToSpendY + col3SafeToSpendHeight : 0
  );
  // Calculate actual height needed (add padding)
  const calculatedHeight = maxY + 15; // Reduced bottom padding
  const actualHeight = calculatedHeight;
  
  // Calculate dynamic card height to fit content (add padding)
  const neededCardHeight = Math.max(baseCardHeight, actualHeight + cardPadding * 2);
  
  // Use full container width for viewBox to maximize horizontal space
  const actualWidth = containerWidth;
  
  // Helper to create curved Sankey path with smooth curves that create visual space
  const createSankeyPath = (sourceX: number, sourceY: number, sourceHeight: number, 
                            targetX: number, targetY: number, targetHeight: number) => {
    // Calculate distance for dynamic curve intensity
    const distance = targetX - (sourceX + nodeWidth);
    
    // Calculate vertical offset between source and target centers
    // This helps determine how much the flow path needs to curve vertically
    const sourceCenterY = sourceY + sourceHeight / 2;
    const targetCenterY = targetY + targetHeight / 2;
    const verticalOffset = Math.abs(targetCenterY - sourceCenterY);
    
    // Dynamic curve based on distance - larger gaps need more curve
    // Adjusted for smoother, more gradual curves
    const baseCurveIntensity = Math.max(60, Math.min(distance * 0.5, 100));
    
    // Increase curve intensity for larger vertical offsets to create smoother curves
    // Slightly increased adjustment for smoother transitions
    const verticalCurveAdjustment = Math.min(verticalOffset * 0.2, 35);
    const curveIntensity = baseCurveIntensity + verticalCurveAdjustment;
    
    // Control points positioned for smooth curves that create visual space
    // Reduced control point distance for smoother, more gradual curves
    const sourceControlX = sourceX + nodeWidth + curveIntensity * 0.7;
    const targetControlX = targetX - curveIntensity * 0.7;
    
    // For vertical offsets, adjust control points to guide the curve smoothly
    // More aggressive vertical curve factor to ensure paths curve out clearly
    const verticalCurveFactor = Math.min(verticalOffset * 0.5, 50);
    let adjustedTopSourceControlY = sourceY;
    let adjustedTopTargetControlY = targetY;
    
    // If target is below source, curve downward; if above, curve upward
    // Use smoother vertical transitions for more elegant curves
    if (targetCenterY > sourceCenterY) {
      // Target below source - curve flows downward smoothly
      adjustedTopSourceControlY = sourceY + verticalCurveFactor * 0.75;
      adjustedTopTargetControlY = targetY - verticalCurveFactor * 0.75;
    } else if (targetCenterY < sourceCenterY) {
      // Target above source - curve flows upward smoothly
      adjustedTopSourceControlY = sourceY - verticalCurveFactor * 0.75;
      adjustedTopTargetControlY = targetY + verticalCurveFactor * 0.75;
    }
    
    // Bottom edge control points - maintain same vertical relationship as top
    const bottomSourceControlY = (sourceY + sourceHeight) + (adjustedTopSourceControlY - sourceY);
    const bottomTargetControlY = (targetY + targetHeight) + (adjustedTopTargetControlY - targetY);
    
    // Smooth cubic bezier curves with vertical offset handling
    // Flow paths can now curve smoothly above/below Budget node when categories extend beyond
    return `
      M ${sourceX + nodeWidth} ${sourceY}
      C ${sourceControlX} ${adjustedTopSourceControlY},
        ${targetControlX} ${adjustedTopTargetControlY},
        ${targetX} ${targetY}
      L ${targetX} ${targetY + targetHeight}
      C ${targetControlX} ${bottomTargetControlY},
        ${sourceControlX} ${bottomSourceControlY},
        ${sourceX + nodeWidth} ${sourceY + sourceHeight}
      Z
    `;
  };
  
  // Flow 1: Income Sources → Total Income
  let cumulativeIncomeProportion = 0;
  const incomeToTotalIncomePaths = incomeSourceNodes.map((source) => {
    const proportion = income > 0 ? source.amount / income : 0;
    const flowTargetY = col2Y + (cumulativeIncomeProportion * col2Height);
    const flowTargetHeight = col2Height * proportion;
    cumulativeIncomeProportion += proportion;
    
    return createSankeyPath(
      col1X, source.y, source.height,
      col2X, flowTargetY, flowTargetHeight
    );
  });
  
  // Flow 2: Total Income → Budget (proportional split)
  // Calculate the proportion of income going to Budget vs Safe to Spend
  const totalAllocated = totalOutflow + safeToSpend;
  const budgetProportion = totalAllocated > 0 ? totalOutflow / totalAllocated : 1;
  const safeToSpendProportion = totalAllocated > 0 ? safeToSpend / totalAllocated : 0;
  
  // Calculate flow positions on Total Income node
  let cumulativeIncomeOutflow = 0;
  const budgetFlowHeight = col2Height * budgetProportion;
  const budgetFlowY = col2Y + cumulativeIncomeOutflow * col2Height;
  cumulativeIncomeOutflow += budgetProportion;
  
  const safeToSpendFlowHeight = col2Height * safeToSpendProportion;
  const safeToSpendFlowY = col2Y + cumulativeIncomeOutflow * col2Height;
  
  const totalIncomeToBudgetPath = createSankeyPath(
    col2X, budgetFlowY, budgetFlowHeight,
    col3X, col3Y, col3Height
  );
  
  // Flow 2b: Total Income → Safe to Spend (if exists)
  const totalIncomeToSafeToSpendPath = col3SafeToSpendHeight > 0 ? createSankeyPath(
    col2X, safeToSpendFlowY, safeToSpendFlowHeight,
    col3X, col3SafeToSpendY, col3SafeToSpendHeight
  ) : null;
  
  // Flow 3: Budget → Main Categories
  let cumulativeOutflowProportion = 0;
  const budgetToCategoryPaths = categoryNodes.map((node) => {
    const proportion = totalOutflow > 0 ? node.amount / totalOutflow : 0;
    const flowSourceY = col3Y + (cumulativeOutflowProportion * col3Height);
    const flowSourceHeight = col3Height * proportion;
    cumulativeOutflowProportion += proportion;
    
    const color = node.categoryId ? getCategoryColor(node.categoryId, undefined) : 
                  node.type === 'subscription' ? 'hsl(280, 70%, 55%)' :
                  node.type === 'savings' ? 'hsl(142, 70%, 55%)' :
                  node.type === 'loan' ? 'hsl(340, 70%, 55%)' :
                  'hsl(var(--destructive))';
    
    return {
      path: createSankeyPath(
        col3X, flowSourceY, flowSourceHeight,
        col4X, node.y, node.height
      ),
      color,
      categoryId: node.id,
    };
  });
  
  // Flow 4: Main Categories → Subcategories
  const categoryToSubcategoryPaths: Array<{ path: string; color: string }> = [];
  
  categoryNodes.forEach((cat) => {
    if (cat.hasSubcategories) {
      const categorySubs = subcategoryNodes.filter(sub => sub.parentId === cat.id);
      if (categorySubs.length > 0) {
        let cumulativeSubProportion = 0;
        categorySubs.forEach((sub) => {
          const subProportion = cat.amount > 0 ? sub.amount / cat.amount : 0;
          const flowSourceY = cat.y + (cumulativeSubProportion * cat.height);
          const flowSourceHeight = cat.height * subProportion;
          cumulativeSubProportion += subProportion;
          
          // Use parent category color for subcategories
          const parentPath = budgetToCategoryPaths.find(p => p.categoryId === cat.id);
          const color = parentPath?.color || getCategoryColor(cat.categoryId || '', undefined);
          
          categoryToSubcategoryPaths.push({
            path: createSankeyPath(
              col4X, flowSourceY, flowSourceHeight,
              col5X, sub.y, sub.height
            ),
            color,
          });
        });
      }
    }
  });

  return (
    <div ref={containerRef} className="w-full overflow-hidden" style={{ height: `${neededCardHeight}px` }}>
      <svg 
        width="100%" 
        height="100%"
        viewBox={`0 0 ${actualWidth} ${actualHeight}`}
        preserveAspectRatio="xMinYMid meet"
      >
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
        
        {/* Flow 1: Income Sources → Total Income */}
        {incomeToTotalIncomePaths.map((path, index) => (
          <path
            key={`income-to-total-${index}`}
            d={path}
            fill="hsl(var(--chart-1))"
            opacity="0.8"
            filter="url(#shadow)"
          />
        ))}
        
        {/* Flow 2: Total Income → Budget */}
        <path
          d={totalIncomeToBudgetPath}
          fill="hsl(var(--chart-1))"
          opacity="0.8"
          filter="url(#shadow)"
        />
        
        {/* Flow 2b: Total Income → Safe to Spend */}
        {totalIncomeToSafeToSpendPath && (
          <path
            d={totalIncomeToSafeToSpendPath}
            fill="hsl(var(--chart-3))"
            opacity="0.8"
            filter="url(#shadow)"
          />
        )}
        
        {/* Flow 3: Budget → Main Categories */}
        {budgetToCategoryPaths.map((pathData, index) => (
          <path
            key={`budget-to-category-${index}`}
            d={pathData.path}
            fill={pathData.color}
            opacity="0.8"
            filter="url(#shadow)"
          />
        ))}
        
        {/* Flow 4: Main Categories → Subcategories */}
        {categoryToSubcategoryPaths.map((pathData, index) => (
          <path
            key={`category-to-sub-${index}`}
            d={pathData.path}
            fill={pathData.color}
            opacity="0.7"
            filter="url(#shadow)"
          />
        ))}
        
        {/* Column 1: Income Source Nodes */}
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
              x={col1X - 5}
              y={source.y + source.height / 2 - 4}
              textAnchor="end"
              dominantBaseline="middle"
              fill="hsl(var(--foreground))"
              fontSize="10"
              fontWeight="bold"
            >
              {source.name.length > 12 ? source.name.substring(0, 12) + '...' : source.name}
            </text>
            <text
              x={col1X - 5}
              y={source.y + source.height / 2 + 6}
              textAnchor="end"
              dominantBaseline="middle"
              fill="hsl(var(--foreground))"
              fontSize="8"
            >
              {formatCurrency(source.amount)}
            </text>
          </g>
        ))}
        
        {/* Column 2: Total Income */}
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
          x={col2X - 5}
          y={col2Y + col2Height / 2 - 5}
          textAnchor="end"
          dominantBaseline="middle"
          fill="hsl(var(--foreground))"
          fontSize="10"
          fontWeight="bold"
        >
          Total Income
        </text>
        <text
          x={col2X - 5}
          y={col2Y + col2Height / 2 + 6}
          textAnchor="end"
          dominantBaseline="middle"
          fill="hsl(var(--foreground))"
          fontSize="8"
        >
          {formatCurrency(income)}
        </text>
        
        {/* Column 3: Budget */}
        <rect
          x={col3X}
          y={col3Y}
          width={nodeWidth}
          height={col3Height}
          fill="hsl(var(--chart-1))"
          rx="4"
          filter="url(#shadow)"
        />
        <text
          x={col3X - 5}
          y={col3Y + col3Height / 2 - 5}
          textAnchor="end"
          dominantBaseline="middle"
          fill="hsl(var(--foreground))"
          fontSize="10"
          fontWeight="bold"
        >
          Budget
        </text>
        <text
          x={col3X - 5}
          y={col3Y + col3Height / 2 + 6}
          textAnchor="end"
          dominantBaseline="middle"
          fill="hsl(var(--foreground))"
          fontSize="8"
        >
          {formatCurrency(totalOutflow)}
        </text>
        
        {/* Column 3: Safe to Spend (vertically aligned with Budget) */}
        {col3SafeToSpendHeight > 0 && (
          <>
            <rect
              x={col3X}
              y={col3SafeToSpendY}
              width={nodeWidth}
              height={col3SafeToSpendHeight}
              fill="hsl(var(--chart-3))"
              rx="4"
              filter="url(#shadow)"
            />
            <text
              x={col3X - 5}
              y={col3SafeToSpendY + col3SafeToSpendHeight / 2 - 5}
              textAnchor="end"
              dominantBaseline="middle"
              fill="hsl(var(--foreground))"
              fontSize="10"
              fontWeight="bold"
            >
              Safe to Spend
            </text>
            <text
              x={col3X - 5}
              y={col3SafeToSpendY + col3SafeToSpendHeight / 2 + 6}
              textAnchor="end"
              dominantBaseline="middle"
              fill="hsl(var(--foreground))"
              fontSize="8"
            >
              {formatCurrency(safeToSpend)}
            </text>
          </>
        )}
        
        {/* Column 4: Main Category Nodes */}
        {categoryNodes.map((node) => {
          const nodeColor = node.categoryId ? getCategoryColor(node.categoryId, undefined) : 
                            node.type === 'subscription' ? 'hsl(280, 70%, 55%)' :
                            node.type === 'savings' ? 'hsl(142, 70%, 55%)' :
                            node.type === 'loan' ? 'hsl(340, 70%, 55%)' :
                            'hsl(var(--destructive))';
          return (
            <g key={node.id}>
              <rect
                x={col4X}
                y={node.y}
                width={nodeWidth}
                height={node.height}
                fill={nodeColor}
                rx="4"
                filter="url(#shadow)"
              />
              <text
                x={col4X - 5}
              y={node.y + node.height / 2 - 4}
              textAnchor="end"
              dominantBaseline="middle"
              fill="hsl(var(--foreground))"
              fontSize="8"
              fontWeight="bold"
            >
              {node.name.length > 10 ? node.name.substring(0, 10) + '...' : node.name}
            </text>
            <text
              x={col4X - 5}
              y={node.y + node.height / 2 + 6}
              textAnchor="end"
              dominantBaseline="middle"
              fill="hsl(var(--foreground))"
              fontSize="7"
            >
                {formatCurrency(node.amount)}
              </text>
            </g>
          );
        })}
        
        {/* Column 5: Subcategory Nodes */}
        {subcategoryNodes.map((node) => {
          const parentCategory = categoryNodes.find(cat => cat.id === node.parentId);
          const nodeColor = node.categoryId ? getCategoryColor(node.categoryId, undefined) :
                            parentCategory?.categoryId ? getCategoryColor(parentCategory.categoryId, undefined) :
                            'hsl(var(--destructive))';
          return (
            <g key={node.id}>
              <rect
                x={col5X}
                y={node.y}
                width={nodeWidth}
                height={node.height}
                fill={nodeColor}
                rx="4"
                filter="url(#shadow)"
              />
              <text
              x={col5X - 5}
              y={node.y + node.height / 2 - 3}
              textAnchor="end"
              dominantBaseline="middle"
              fill="hsl(var(--foreground))"
              fontSize="7"
              fontWeight="bold"
            >
              {node.name.length > 10 ? node.name.substring(0, 10) + '...' : node.name}
            </text>
            <text
              x={col5X - 5}
              y={node.y + node.height / 2 + 5}
              textAnchor="end"
              dominantBaseline="middle"
              fill="hsl(var(--foreground))"
              fontSize="6"
            >
                {formatCurrency(node.amount)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function HorizontalBarChart({ data }: { data: CashFlowData }) {
  // Group expenses by main category (aggregate subcategories under their parents)
  const expensesByCategory = data.expensesByCategory || [];
  const topVendors = data.topVendors || [];

  // Build category map to find parent categories
  const categoryMap = new Map(expensesByCategory.map(cat => [cat.categoryId, cat]));
  
  // Group by main category - if a category has a parentId, group under parent
  const mainCategoryMap = new Map<string, { categoryId: string; categoryName: string; total: number; color?: string }>();
  
  expensesByCategory.forEach((cat) => {
    if (cat.parentId) {
      // This is a subcategory - add to parent category
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        const existing = mainCategoryMap.get(cat.parentId);
        if (existing) {
          existing.total += cat.total;
        } else {
          mainCategoryMap.set(cat.parentId, {
            categoryId: parent.categoryId,
            categoryName: parent.categoryName,
            total: cat.total,
            color: parent.color || cat.color,
          });
        }
      }
    } else {
      // This is a main category
      const existing = mainCategoryMap.get(cat.categoryId);
      if (existing) {
        existing.total += cat.total;
      } else {
        mainCategoryMap.set(cat.categoryId, {
          categoryId: cat.categoryId,
          categoryName: cat.categoryName,
          total: cat.total,
          color: cat.color,
        });
      }
    }
  });

  // Convert to array and sort by total (descending)
  const mainCategoryData = Array.from(mainCategoryMap.values())
    .sort((a, b) => b.total - a.total);

  // Create chart data with absolute values (positive) starting from bottom left
  // Include all categories that have transactions (value > 0)
  const chartData = mainCategoryData
    .filter((cat) => Math.abs(cat.total) > 0) // Only include categories with transactions
    .map((cat) => ({
      name: cat.categoryName,
      value: Math.abs(cat.total), // Absolute value
      categoryId: cat.categoryId,
      color: cat.color || "hsl(var(--destructive))",
    }));

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
          <XAxis 
            type="number" 
            tickFormatter={formatCurrency}
            domain={[0, 'dataMax']}
          />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={110} 
            tick={{ fontSize: 12 }}
            reversed={true}
          />
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
