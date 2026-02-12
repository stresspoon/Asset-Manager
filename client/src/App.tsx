import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Requests from "@/pages/requests";
import RequestDetail from "@/pages/request-detail";
import Schedules from "@/pages/schedules";
import ScheduleDetail from "@/pages/schedule-detail";
import Quotes from "@/pages/quotes";
import QuoteDetail from "@/pages/quote-detail";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/requests" component={Requests} />
      <Route path="/requests/:id" component={RequestDetail} />
      <Route path="/schedules" component={Schedules} />
      <Route path="/schedules/:id" component={ScheduleDetail} />
      <Route path="/quotes" component={Quotes} />
      <Route path="/quotes/:id" component={QuoteDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

const sidebarStyle = {
  "--sidebar-width": "17rem",
  "--sidebar-width-icon": "3.5rem",
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <SidebarProvider style={sidebarStyle as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="flex items-center justify-between gap-3 px-6 py-3 border-b sticky top-0 z-50 bg-background">
                  <div className="flex items-center gap-3 flex-1">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <div className="relative max-w-md flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="검색..."
                        className="pl-9 bg-muted/50 border-transparent focus:border-primary/30"
                        data-testid="input-global-search"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" data-testid="button-notifications">
                      <Bell className="h-4 w-4" />
                    </Button>
                    <ThemeToggle />
                  </div>
                </header>
                <main className="flex-1 overflow-auto bg-background">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
