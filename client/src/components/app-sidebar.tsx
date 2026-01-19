import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  PieChart,
  TrendingUp,
  AlertTriangle,
  Settings,
  Newspaper,
  Link2,
  DollarSign,
  Gauge,
  Wallet,
  Target,
  Building2,
  Users,
  FileHeart,
  MessageCircle,
  CalendarDays,
  Activity,
  PiggyBank,
  Zap,
  FileText,
  ReceiptText,
  BarChart3,
  CreditCard,
} from "lucide-react";
import { Link, useLocation } from "wouter";

const navItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Budget",
    url: "/budget",
    icon: CreditCard,
  },
  {
    title: "Assets",
    url: "/assets",
    icon: Wallet,
  },
  {
    title: "Investment Analysis",
    url: "/analysis",
    icon: PieChart,
  },
  {
    title: "Bubble Watch",
    url: "/bubble-watch",
    icon: AlertTriangle,
  },
  {
    title: "News & Research",
    url: "/news",
    icon: Newspaper,
  },
  {
    title: "Goals",
    url: "/goals",
    icon: PiggyBank,
  },
  {
    title: "What-If",
    url: "/what-if",
    icon: AlertTriangle,
  },
  {
    title: "Exports",
    url: "/exports",
    icon: FileText,
  },
  {
    title: "Entities",
    url: "/entities",
    icon: Building2,
  },
  {
    title: "Estate",
    url: "/estate",
    icon: FileHeart,
  },
  {
    title: "Family",
    url: "/family",
    icon: Users,
  },
  {
    title: "Sila",
    url: "/ai-assistant",
    icon: MessageCircle,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Accounts",
    url: "/accounts",
    icon: Link2,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold">Sila</span>
            <span className="text-xs text-muted-foreground">Portfolio Tracker</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(' ', '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Settings className="h-4 w-4" />
          <span>Demo Mode Active</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
