# Investment Tracker Design Guidelines

## Design Approach
**System-Based: Material Design 3** - Optimal for data-dense financial applications requiring clear hierarchy and strong visual organization. Drawing inspiration from modern fintech apps like Robinhood and Personal Capital for clarity in financial data presentation.

## Core Design Principles
1. **Data Clarity First**: Numbers, charts, and financial metrics are the primary content
2. **Scannable Hierarchy**: Users must quickly parse portfolio performance and holdings
3. **Action Confidence**: Buttons and controls for financial actions need clear affordance
4. **Dashboard Efficiency**: Optimize for frequent checking and quick decision-making

## Typography System
**Font Stack**: Inter (Google Fonts) for superior number readability
- **Display**: 2xl-4xl, font-semibold (portfolio totals, main metrics)
- **Headings**: xl-2xl, font-semibold (section titles, stock names)
- **Body**: base-lg, font-normal (descriptions, labels)
- **Data/Numbers**: base-xl, font-medium, tabular-nums (prices, percentages)
- **Labels**: sm-xs, font-medium, uppercase tracking-wide (field labels)

## Layout System
**Spacing Units**: Tailwind 2, 4, 6, 8, 12, 16 for consistent rhythm
- Component padding: p-4 to p-8
- Section spacing: gap-6 to gap-8
- Card spacing: p-6
- Dashboard grid gaps: gap-4

**Layout Pattern**: Dashboard-primary with sidebar navigation
- Sidebar: Fixed width 240px (desktop), collapsible (mobile)
- Main content: max-w-7xl with responsive grid
- Cards: Rounded-lg with subtle elevation (shadow-sm)

## Component Library

**Navigation**
- **Sidebar**: Fixed left navigation with icon + label items, active state indicators
- **Top Bar**: Portfolio total value prominently displayed, quick action buttons, user profile

**Dashboard Cards**
- **Portfolio Summary**: Large card showing total value, daily change, all-time performance
- **Holdings Grid**: Table/card hybrid displaying stock symbol, quantity, current value, P/L percentage
- **Performance Chart**: Line/area chart card with time range selector (1D, 1W, 1M, 1Y, All)
- **Recent Transactions**: List card with buy/sell indicators, timestamps

**Data Display Components**
- **Metric Cards**: Compact cards for key stats (Total Holdings, Today's Gain/Loss, Portfolio Diversity)
- **Stock Cards**: Individual holding cards with symbol, company name, shares, current price, change percentage
- **Transaction Rows**: Compact list items with action type badge, stock symbol, date, amount

**Forms & Inputs**
- **Transaction Form**: Modal/slide-over for adding buy/sell actions
- **Input Fields**: Clear labels above inputs, helper text for amounts, real-time validation
- **Search**: Prominent stock symbol search with autocomplete

**Buttons**
- **Primary**: Used for main actions (Add Transaction, Buy, Sell) - font-medium, px-6, py-3
- **Secondary**: For cancel/auxiliary actions - outlined variant
- **Icon Buttons**: For quick actions in table rows

**Data Visualization**
- **Charts**: Use Chart.js or Recharts via CDN for responsive, interactive charts
- **Trend Indicators**: Arrow icons with percentage changes (green for positive, no color specification)
- **Progress Indicators**: For portfolio allocation visualization

## Responsive Breakpoints
- **Mobile (< md)**: Single column, stacked cards, collapsible sidebar to bottom nav
- **Tablet (md-lg)**: 2-column grid for metric cards, sidebar visible
- **Desktop (lg+)**: 3-4 column grid, full dashboard layout

## Images
**Hero Section**: No traditional hero image - Dashboard applications prioritize immediate data visibility
**Supporting Graphics**:
- Empty state illustrations for "No holdings yet" (illustration of upward trending graph)
- Onboarding walkthrough graphics (optional)
- Stock logos/icons from financial API if available

## Accessibility
- Ensure all data tables are keyboard navigable
- Provide ARIA labels for screen readers on chart data
- High contrast for positive/negative value indicators
- Focus states on all interactive elements
- Maintain consistent tabular-nums for number alignment

## Animation Guidelines
**Minimal & Purposeful Only**:
- Number counter animations for portfolio value updates (smooth counting)
- Subtle fade-in for new transaction rows
- Chart data point tooltips on hover
- NO scroll animations, NO decorative transitions

## Layout Specifics
**Dashboard Grid**: 3-column layout on desktop
- Left: Sidebar (240px fixed)
- Center: Main content area (2-column grid for cards)
- Cards use natural height, never forced viewport heights
- Consistent py-8 for main content padding