import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Holdings from "@/pages/holdings";
import Analysis from "@/pages/analysis";
import BubbleWatchPage from "@/pages/bubble-watch";
import NewsResearch from "@/pages/news-research";
import Accounts from "@/pages/accounts";
import Dividends from "@/pages/dividends";
import RiskIndicators from "@/pages/risk-indicators";
import Assets from "@/pages/assets";
import BillsPage from "@/pages/bills";
import BudgetPage from "@/pages/budget";
import GoalsPage from "@/pages/goals";
import TransactionsPage from "@/pages/transactions";
import CashFlowPage from "@/pages/cash-flow";
import InsightsPage from "@/pages/insights";
import WhatIfPage from "@/pages/what-if";
import ExportsPage from "@/pages/exports";
import Entities from "@/pages/entities";
import Estate from "@/pages/estate";
import Family from "@/pages/family";
import AIAssistant from "@/pages/ai-assistant";
import SettingsPage from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/holdings" component={Holdings} />
      <Route path="/analysis" component={Analysis} />
      <Route path="/bubble-watch" component={BubbleWatchPage} />
      <Route path="/news" component={NewsResearch} />
      <Route path="/research" component={NewsResearch} />
      <Route path="/accounts" component={Accounts} />
      <Route path="/dividends" component={Dividends} />
      <Route path="/risk-indicators" component={RiskIndicators} />
      <Route path="/assets" component={Assets} />
      <Route path="/planning" component={Estate} />
      <Route path="/budget" component={BudgetPage} />
      <Route path="/transactions" component={TransactionsPage} />
      <Route path="/bills" component={BillsPage} />
      <Route path="/cash-flow" component={CashFlowPage} />
      <Route path="/goals" component={GoalsPage} />
      <Route path="/insights" component={InsightsPage} />
      <Route path="/what-if" component={WhatIfPage} />
      <Route path="/exports" component={ExportsPage} />
      <Route path="/entities" component={Entities} />
      <Route path="/estate" component={Estate} />
      <Route path="/family" component={Family} />
      <Route path="/ai-assistant" component={AIAssistant} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto" data-testid="main-content">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
