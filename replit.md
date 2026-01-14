# NexusInvest - AI-Driven Investment Portfolio Tracker

## Overview
NexusInvest is a comprehensive investment portfolio tracking application that helps users monitor their holdings, analyze performance, and detect potential market bubbles. Built with React + TypeScript frontend and Express backend.

## Features
- **Portfolio Dashboard**: Overview of total portfolio value, cost basis, and returns
- **Holdings Management**: View detailed information about each stock position
- **S&P 500 Benchmarking**: Compare portfolio performance against SPY
- **Industry Analysis**: Interactive charts showing sector allocation
- **Bubble Watch**: Intelligent alerts for overheating sectors based on concentration and velocity metrics
- **Dark/Light Mode**: Theme toggle for user preference

## Project Structure
```
├── client/               # React frontend
│   └── src/
│       ├── components/   # Reusable UI components
│       │   ├── app-sidebar.tsx
│       │   ├── benchmark-chart.tsx
│       │   ├── bubble-watch.tsx
│       │   ├── holdings-table.tsx
│       │   ├── industry-chart.tsx
│       │   ├── portfolio-metrics.tsx
│       │   └── theme-toggle.tsx
│       ├── pages/        # Page components
│       │   ├── dashboard.tsx
│       │   ├── holdings.tsx
│       │   ├── analysis.tsx
│       │   └── bubble-watch.tsx
│       └── App.tsx       # Main app with routing
├── server/               # Express backend
│   ├── routes.ts         # API endpoints
│   └── storage.ts        # In-memory storage
└── shared/               # Shared types
    └── schema.ts         # Data models and demo data
```

## API Endpoints
- `GET /api/holdings` - Get all portfolio holdings
- `GET /api/holdings/:id` - Get a specific holding
- `POST /api/holdings` - Create a new holding
- `PATCH /api/holdings/:id` - Update a holding
- `DELETE /api/holdings/:id` - Delete a holding
- `GET /api/portfolio/metrics` - Get portfolio metrics (TWR, total return)
- `GET /api/benchmark` - Get benchmark comparison data
- `GET /api/industry-analysis` - Get industry breakdown
- `GET /api/bubble-watch` - Get bubble warning alerts

## Bubble Detection Algorithm
A sector is flagged as "overheating" when:
1. **Concentration**: The sector makes up >30% of total portfolio value
2. **Velocity**: The sector's 30-day growth rate exceeds 1.5x the S&P 500 growth rate

Both conditions must be met to trigger an alert.

## Tech Stack
- Frontend: React, TypeScript, TanStack Query, Recharts, Shadcn/UI, Tailwind CSS
- Backend: Express, Node.js
- Data: In-memory storage with demo data

## Running the Project
The application runs on port 5000 with `npm run dev`.
