# Coding Standards for NexusInvest

## Development Workflow

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
