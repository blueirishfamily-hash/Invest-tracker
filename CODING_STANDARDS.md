# Coding Standards for NexusInvest

## Replit Design Patterns & Standards

### Replit-Specific Configuration

#### Vite Plugins
- **@replit/vite-plugin-cartographer**: Source mapping and debugging support
- **@replit/vite-plugin-dev-banner**: Development banner for Replit environment
- **@replit/vite-plugin-runtime-error-modal**: Enhanced error display in Replit
- **Conditional Loading**: Replit plugins only load in development when `REPL_ID` is defined
- **Pattern**: Use dynamic imports with conditional checks for Replit-specific features

```typescript
// Example from vite.config.ts
...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
  ? [
      await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer()),
      await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
    ]
  : [])
```

#### Replit Configuration (.replit)
- **Modules**: Define required modules (nodejs-20, web, postgresql-16)
- **Run Command**: `npm run dev` for development
- **Port Configuration**: Local port 5000, external port 80
- **Deployment**: Autoscale target with production build command
- **Workflows**: Define parallel workflow tasks for development

### Component Architecture Patterns

#### Component Structure
- **Named Exports**: Always use named exports for components (`export function ComponentName`)
- **TypeScript Interfaces**: Define props interfaces above component
- **Helper Functions**: Place utility functions (formatCurrency, formatDate) above component
- **Loading States**: Always include loading skeleton components
- **Error States**: Handle empty/null data gracefully

**Pattern:**
```typescript
// 1. Imports (React, libraries, components, types)
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import type { DataType } from "@shared/schema";

// 2. Helper functions
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

// 3. Component skeleton/loading component
function ComponentSkeleton() {
  return <Card>...</Card>;
}

// 4. Main component
export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // Hooks first
  const { data, isLoading } = useQuery(...);
  
  // Early returns for loading/error states
  if (isLoading) return <ComponentSkeleton />;
  if (!data) return null;
  
  // Main render
  return <Card>...</Card>;
}
```

#### Component Naming
- **PascalCase** for component names: `PortfolioMetricsCards`, `RecentTransactions`
- **Descriptive names**: Component name should clearly indicate its purpose
- **File naming**: Match component name exactly (`portfolio-metrics.tsx` → `PortfolioMetricsCards`)

### UI Component Library Standards

#### Shadcn/UI Pattern
- **Location**: All UI primitives in `client/src/components/ui/`
- **Composition**: Use `cn()` utility for className merging
- **Forward Refs**: All components use `React.forwardRef` for proper ref forwarding
- **Display Names**: Always set `displayName` for debugging
- **Type Safety**: Full TypeScript support with proper prop types

**Example Pattern:**
```typescript
const Component = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("base-classes", className)} {...props} />
  )
);
Component.displayName = "Component";
```

#### Card Component Pattern
- **Structure**: Card → CardHeader → CardTitle/CardDescription → CardContent
- **Spacing**: CardHeader uses `p-6`, CardContent uses `p-6 pt-0`
- **Styling**: Use `rounded-xl border bg-card` for consistent card appearance
- **Semantic HTML**: Use proper semantic elements

### Styling Standards (Replit Design System)

#### Tailwind CSS Configuration
- **Design Tokens**: Use CSS variables for colors (`hsl(var(--background))`)
- **Color System**: Semantic color tokens (background, foreground, card, primary, destructive, chart-1-5)
- **Border Radius**: Custom values (lg: 9px, md: 6px, sm: 3px)
- **Dark Mode**: Class-based dark mode (`darkMode: ["class"]`)

#### Color Usage Patterns
- **Charts**: Use `chart-1` through `chart-5` for data visualization
- **Status Colors**: 
  - Positive/Income: `text-chart-1` (green)
  - Negative/Expense: `text-destructive` (red)
  - Neutral: `text-muted-foreground`
- **Cards**: `bg-card`, `text-card-foreground`, `border-card-border`
- **Semantic Colors**: Always use semantic tokens, never hardcoded colors

#### Spacing System
- **Consistent Units**: Use Tailwind spacing scale (2, 4, 6, 8, 12, 16, 24)
- **Component Padding**: `p-6` for cards, `p-4` for compact components
- **Gaps**: `gap-4` for grids, `gap-6` for sections
- **Content Spacing**: `space-y-3` or `space-y-4` for lists

#### Typography Patterns
- **Numbers**: Always use `tabular-nums` for financial data alignment
- **Headings**: `text-2xl font-semibold` for card titles
- **Body**: `text-sm` or `text-base` for descriptions
- **Labels**: `text-xs text-muted-foreground` for metadata

### Data Fetching Patterns

#### React Query Usage
- **Query Keys**: Use descriptive paths (`["/api/transactions"]`, `["/api/portfolio/metrics"]`)
- **Loading States**: Always provide loading skeletons
- **Error Handling**: Graceful error states with user-friendly messages
- **Query Functions**: Use `queryFn` for custom fetch logic when needed

**Pattern:**
```typescript
const { data, isLoading } = useQuery<DataType>({
  queryKey: ["/api/endpoint"],
  // Optional: custom queryFn for complex requests
  queryFn: async () => {
    const response = await fetch("/api/endpoint", { credentials: "include" });
    if (!response.ok) throw new Error("Failed to fetch");
    return response.json();
  },
});
```

### File Organization Standards

#### Directory Structure
```
client/src/
├── components/          # Reusable UI components
│   ├── ui/             # Shadcn/UI primitives
│   └── [feature].tsx   # Feature-specific components
├── pages/              # Page-level components
├── lib/                # Utilities and helpers
└── App.tsx             # Root component with routing

server/
├── routes.ts           # API route definitions
├── storage.ts          # Data persistence layer
└── [feature].ts        # Feature-specific server logic

shared/
└── schema.ts           # Shared TypeScript types and Zod schemas
```

#### Path Aliases
- **@/**: Points to `client/src/`
- **@shared/**: Points to `shared/`
- **@assets/**: Points to `attached_assets/`
- Always use path aliases instead of relative imports when possible

### Type Safety Patterns

#### Schema Definition
- **Zod Schemas**: Define validation schemas in `shared/schema.ts`
- **Drizzle ORM**: Table definitions alongside Zod schemas
- **Type Inference**: Use `z.infer<typeof schema>` for TypeScript types
- **Shared Types**: Export types from shared schema for consistency

**Pattern:**
```typescript
// Zod schema
export const entitySchema = z.object({
  id: z.string(),
  name: z.string(),
  // ...
});

// Type inference
export type Entity = z.infer<typeof entitySchema>;

// Drizzle table (if using database)
export const entities = pgTable("entities", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  // ...
});
```

### Error Handling Patterns

#### Server-Side
- **Try-Catch**: Always wrap async operations
- **Error Responses**: Return consistent JSON error format
- **Status Codes**: Use appropriate HTTP status codes
- **Logging**: Log errors server-side for debugging

#### Client-Side
- **Query Errors**: React Query handles errors automatically
- **User Feedback**: Show user-friendly error messages
- **Fallback UI**: Provide fallback content for error states
- **Loading States**: Always show loading indicators

### Performance Patterns

#### Component Optimization
- **Memoization**: Use `useMemo` for expensive calculations
- **Lazy Loading**: Use dynamic imports for large components
- **Skeleton Loading**: Show skeletons instead of blank screens
- **Pagination**: Limit data displayed (e.g., top 5, recent 10)

#### Data Processing
- **Client-Side Filtering**: Filter/sort in `useMemo` hooks
- **Efficient Queries**: Only fetch needed data
- **Caching**: Leverage React Query's caching

### Accessibility Standards

#### ARIA & Semantic HTML
- **Semantic Elements**: Use proper HTML5 semantic elements
- **ARIA Labels**: Add labels for screen readers on interactive elements
- **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
- **Focus States**: Visible focus indicators on all focusable elements

#### Data Tables
- **Tabular Numbers**: Use `tabular-nums` for number alignment
- **Table Structure**: Proper `<thead>`, `<tbody>`, `<th>`, `<td>` structure
- **Sortable Headers**: Indicate sortable columns clearly

### Chart & Visualization Patterns

#### Recharts Integration
- **ResponsiveContainer**: Always wrap charts in ResponsiveContainer
- **Consistent Heights**: Use fixed heights (`h-[200px]`, `h-[175px]`) for consistency
- **Color Tokens**: Use chart color tokens (`chart-1` through `chart-5`)
- **Tooltips**: Custom tooltip formatters for currency/percentage formatting
- **Legends**: Consistent legend styling and positioning

**Pattern:**
```typescript
<ResponsiveContainer width="100%" height="100%">
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
    <XAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
    <YAxis tickFormatter={(value) => formatCurrency(value)} />
    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
    <Line dataKey="value" stroke="hsl(var(--chart-1))" />
  </LineChart>
</ResponsiveContainer>
```

## Development Workflow

### Communication and Clarification
**REQUIRED**: Always ask for clarification or questions when needed, even if not in plan mode.

- If requirements are ambiguous or unclear, ask for clarification before implementing
- If multiple valid implementations are possible, ask which approach is preferred
- If you encounter edge cases or unexpected scenarios, ask how to handle them
- Don't make assumptions about user intent - ask questions to ensure correct implementation
- Questions should be clear, concise, and focused on the specific issue

### Automatic Server Restarts
**REQUIRED**: The development server MUST automatically restart whenever code changes are detected.

#### Implementation
- ✅ **IMPLEMENTED**: Uses `tsx watch` for automatic restarts during development
- ✅ Server automatically watches for changes in:
  - `server/**/*.ts` - All server-side TypeScript files
  - `shared/**/*.ts` - Shared schema and types
- Client-side code uses Vite HMR (Hot Module Replacement) - no restart needed
- Server-side changes trigger automatic full server restart on file save
- Configuration: `nodemon.json` for additional watch configuration (optional)

#### Running the Server
```bash
# Development mode with auto-restart (RECOMMENDED)
npm run dev
# This uses: cross-env NODE_ENV=development tsx watch server/index.ts
# - Automatically restarts on server code changes
# - Vite handles client-side HMR automatically
# - Port: 5000 (or PORT env variable)

# Production mode (no auto-restart)
npm run start
```

### Code Application Standards

1. **When New Code is Applied:**
   - Server MUST automatically restart to reflect changes
   - Client-side changes hot-reload via Vite HMR (no restart needed)
   - Server-side changes require full server restart (automatic via watch mode)
   - Test changes immediately after saving

2. **File Watching:**
   - Watch all TypeScript/TSX files in `server/`, `client/src/`, and `shared/`
   - Exclude `node_modules/`, `.git/`, and build artifacts
   - Use efficient file watching (native Node.js fs.watch or chokidar)

3. **Development Server Configuration:**
   - Development server runs on port 5000 (or PORT env variable)
   - Enable hot module replacement (HMR) for client-side code
   - Full server restart only when server code changes
   - Log restart events to console with timestamp

## Code Quality Standards

### TypeScript
- Strict mode enabled in `tsconfig.json`
- All files must have proper TypeScript types
- Avoid `any` type; use `unknown` when type is truly unknown
- Use interfaces for object shapes, types for unions/intersections

### React/Component Standards
- Functional components with hooks only
- Use TypeScript for all component props
- Extract reusable logic into custom hooks
- Use React Query for all API calls
- Proper error boundaries for component error handling

### File Organization
- Components: `client/src/components/`
- Pages: `client/src/pages/`
- Server routes: `server/routes.ts`
- Shared types: `shared/schema.ts`
- Utilities: `client/src/lib/` or `server/utils/`

### Naming Conventions
- Components: PascalCase (`PortfolioMetrics.tsx`)
- Files: Match component name exactly
- Functions: camelCase (`formatCurrency`, `getCompanyLogoUrl`)
- Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)
- Types/Interfaces: PascalCase (`Holding`, `PortfolioMetrics`)

### Import Organization
1. React and framework imports first
2. Third-party library imports
3. Internal component imports
4. Type imports (using `type` keyword)
5. Relative imports last

Example:
```typescript
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { Holding } from "@shared/schema";
```

## Testing Standards

### Before Committing
- Test all changes in the browser
- Verify server restarts work correctly
- Check console for errors
- Test on different screen sizes (responsive)

### Code Review Checklist
- [ ] TypeScript types are correct
- [ ] No console errors or warnings
- [ ] Components follow naming conventions
- [ ] Imports are organized properly
- [ ] Error handling is implemented
- [ ] Loading states are handled
- [ ] Accessibility considerations (ARIA labels, keyboard navigation)

## API Standards

### Server Routes
- RESTful API design
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Return consistent JSON response format
- Include proper error handling with status codes

### Error Handling
- Always use try-catch blocks for async operations
- Return meaningful error messages
- Log errors server-side for debugging
- Display user-friendly error messages client-side

## Styling Standards

### Tailwind CSS
- Use utility classes primarily
- Extract repeated patterns into component classes when needed
- Follow design system from `design_guidelines.md`
- Use semantic color tokens (`text-chart-1`, `bg-card`, etc.)

### Responsive Design
- Mobile-first approach
- Test on multiple breakpoints (sm, md, lg, xl)
- Use responsive utilities (`md:`, `lg:`, etc.)
- Ensure touch targets are at least 44x44px on mobile

## Performance Standards

### Optimization
- Lazy load components when appropriate
- Optimize images and assets
- Use React.memo for expensive components
- Debounce search/filter inputs
- Implement proper loading states to avoid layout shifts

### Bundle Size
- Keep bundle size reasonable
- Use dynamic imports for large dependencies
- Tree-shake unused code
- Monitor bundle size with build tools

## Security Standards

### Environment Variables
- Never commit `.env` files
- Use `.env.example` as template
- Validate environment variables on server startup
- Use secure defaults

### API Keys
- Store API keys in environment variables
- Never hardcode sensitive data
- Use different keys for development/production
- Rotate keys periodically

## Git Standards

### Commit Messages
- Use descriptive commit messages
- Format: `type: description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Branching
- Main branch: `main` or `cursor2` (current)
- Feature branches: `feature/description`
- Bug fixes: `fix/description`

## Documentation

### Code Comments
- Comment complex logic or algorithms
- Use JSDoc for function documentation
- Keep comments up-to-date with code changes
- Don't comment obvious code

### README
- Keep README.md updated with setup instructions
- Include environment variable setup
- Document API endpoints
- Include troubleshooting section

## Replit Deployment Standards

### Environment Configuration
- **Port**: Always use PORT environment variable (defaults to 5000)
- **Database**: Use DATABASE_URL for PostgreSQL connections
- **Secrets**: Store sensitive data in Replit Secrets, never in code
- **Environment Detection**: Check `process.env.REPL_ID` for Replit-specific features

### Build & Deployment
- **Build Command**: `npm run build` for production builds
- **Start Command**: `node dist/index.cjs` for production
- **Development**: `npm run dev` uses `tsx watch` for auto-restart
- **Static Assets**: Serve from `dist/public` in production

### Development Experience
- **Hot Reload**: Vite HMR for client-side changes (no restart needed)
- **Auto-Restart**: Server automatically restarts on server code changes
- **Error Overlays**: Replit runtime error modal for better error visibility
- **Source Maps**: Cartographer plugin for enhanced debugging

## Code Review Checklist (Replit Standards)

### Component Review
- [ ] Uses named export pattern
- [ ] Includes loading skeleton component
- [ ] Handles empty/null data states
- [ ] Uses semantic color tokens (not hardcoded colors)
- [ ] Includes proper TypeScript types
- [ ] Uses path aliases (@/, @shared/)
- [ ] Follows component structure pattern (helpers → skeleton → main component)

### Styling Review
- [ ] Uses Tailwind utility classes
- [ ] Uses `cn()` utility for className merging
- [ ] Uses semantic color tokens (chart-1, destructive, etc.)
- [ ] Includes `tabular-nums` for financial data
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] Consistent spacing using Tailwind scale

### Data Fetching Review
- [ ] Uses React Query for all API calls
- [ ] Proper query keys following path pattern
- [ ] Loading states implemented
- [ ] Error handling included
- [ ] Type-safe data fetching

### Type Safety Review
- [ ] All components have TypeScript types
- [ ] Shared types used from @shared/schema
- [ ] No `any` types (use `unknown` if needed)
- [ ] Proper interface definitions for props

### Performance Review
- [ ] Expensive calculations use `useMemo`
- [ ] Large lists are paginated or limited
- [ ] Images/assets are optimized
- [ ] No unnecessary re-renders
