import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout";
import { FocusProvider } from "@/focus/focus-context";
import { FocusOverlay } from "@/focus/focus-overlay";
import { AvailabilityProvider } from "@/availability/availability-context";

// Pages
import InteractiveWorkspace from "@/components/interactive-workspace";
import NexusLaunchpad from "@/pages/nexus-launchpad";
import SystemMap from "@/pages/system-map";
import PlanReview from "@/pages/plan-review";
import People from "@/pages/people";
import PersonDetail from "@/pages/person-detail";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Knowledge from "@/pages/knowledge";
import Tasks from "@/pages/tasks";
import Timeline from "@/pages/timeline";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import CardMaker from "@/pages/card-maker";
import Plans from "@/pages/plans";
import Integrations from "@/pages/integrations";
import SafetyConnector from "@/pages/safety-connector";
import WorkWalletBridge from "@/pages/work-wallet-bridge";
import Trades from "@/pages/trades";
import CommunicationHub from "@/pages/communication-hub";

function WorkspaceRoute() {
  return (
    <div className="relative min-h-[100dvh]">
      <a
        href={import.meta.env.BASE_URL}
        className="fixed left-3 top-3 z-50 rounded-full border border-primary/30 bg-background/85 px-3 py-2 text-xs font-semibold text-primary shadow-lg backdrop-blur transition-colors hover:bg-primary/10 md:left-5 md:top-5"
      >
        ← Nexus menu
      </a>
      <InteractiveWorkspace />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Specialist full-screen workflows intentionally run without the app shell. */}
      <Route path="/workspace" component={WorkspaceRoute} />
      <Route path="/plan-review" component={PlanReview} />
      <Route>
        <AppLayoutRoutes />
      </Route>
    </Switch>
  );
}

function AppLayoutRoutes() {
  return (
    <>
      <AppLayout>
        <Switch>
          {/* One canonical menu. /modules is retained as a compatibility alias. */}
          <Route path="/" component={NexusLaunchpad} />
          <Route path="/modules" component={NexusLaunchpad} />
          <Route path="/trades" component={Trades} />
          <Route path="/system-map" component={SystemMap} />
          <Route path="/communication-hub" component={CommunicationHub} />

          <Route path="/projects/:id" component={ProjectDetail} />
          <Route path="/projects" component={Projects} />
          <Route path="/people/:id" component={PersonDetail} />
          <Route path="/people" component={People} />
          <Route path="/card-maker" component={CardMaker} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/plans" component={Plans} />
          <Route path="/knowledge" component={Knowledge} />
          <Route path="/timeline" component={Timeline} />
          <Route path="/integrations" component={Integrations} />
          <Route path="/safety-connector" component={WorkWalletBridge} />
          <Route path="/safety-connector-demo" component={SafetyConnector} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
      <FocusOverlay />
    </>
  );
}

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <FocusProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AvailabilityProvider>
              <Router />
            </AvailabilityProvider>
          </WouterRouter>
        </FocusProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
