import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEO } from "@/components/seo";
import { Wallet, ReceiptText, BarChart3, CalendarDays, TrendingDown } from "lucide-react";
import { CashFlowContent } from "./cash-flow";
import { TransactionsContent } from "./transactions";
import { BillsContent } from "./bills";
import { InsightsContent } from "./insights";
import { DebtPayoffContent } from "./debt-payoff";

export default function BudgetPage() {
  return (
    <div className="p-6 space-y-6" data-testid="page-budget">
      <SEO
        title="Budget"
        description="Manage cash flow, transactions, bills, and spending insights."
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Budget
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Manage cash flow, transactions, bills, and spending insights.
        </p>
      </div>

      <Tabs defaultValue="cash-flow" className="w-full">
        <TabsList>
          <TabsTrigger value="cash-flow">
            <Wallet className="h-4 w-4 mr-2" />
            Cash Flow
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <ReceiptText className="h-4 w-4 mr-2" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="bills">
            <CalendarDays className="h-4 w-4 mr-2" />
            Bills
          </TabsTrigger>
          <TabsTrigger value="insights">
            <BarChart3 className="h-4 w-4 mr-2" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="debt-payoff">
            <TrendingDown className="h-4 w-4 mr-2" />
            Debt Payoff
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cash-flow" className="mt-6">
          <CashFlowContent />
        </TabsContent>
        <TabsContent value="transactions" className="mt-6">
          <TransactionsContent />
        </TabsContent>
        <TabsContent value="bills" className="mt-6">
          <BillsContent />
        </TabsContent>
        <TabsContent value="insights" className="mt-6">
          <InsightsContent />
        </TabsContent>
        <TabsContent value="debt-payoff" className="mt-6">
          <DebtPayoffContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
