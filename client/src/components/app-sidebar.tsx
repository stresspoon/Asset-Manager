import { LayoutDashboard, FileText, CalendarDays, Receipt, Building2 } from "lucide-react";
import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "대시보드", url: "/", icon: LayoutDashboard },
  { title: "상담 신청 목록", url: "/requests", icon: FileText },
  { title: "상담 일정 관리", url: "/schedules", icon: CalendarDays },
  { title: "견적서 관리", url: "/quotes", icon: Receipt },
];

export function AppSidebar() {
  const [location] = useLocation();

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-5 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground" data-testid="text-app-title">
              천지세무법인
            </span>
            <span className="text-[11px] text-sidebar-foreground/60" data-testid="text-app-subtitle">경리아웃소싱 상담관리</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-wider font-semibold px-5">
            메뉴
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2 mt-1">
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.url.replace("/", "") || "dashboard"}`}>
                      <item.icon className="h-[18px] w-[18px]" />
                      <span className="text-[13px] font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="rounded-md bg-sidebar-accent/50 p-3">
          <p className="text-[11px] text-sidebar-foreground/50 leading-relaxed" data-testid="text-sidebar-footer">
            Powered by Notion API
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
