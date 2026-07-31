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
import NexusDock from "@/pages/nexus-dock";
import NexusLaunchpad from "@/pages/nexus-launchpad";
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

function WorkspaceRoute() {
  return (
    <div className="relative min-h-[100dvh]">
      <a
        href={import.meta.env.BASE_URL}
        className="fixed left-3 top-3 z-50 rounded-full border border-primary/30 bg-background/85 px-3 py-2 text-xs font-semibold text-primary shadow-lg backdrop-blur transition-colors hover:bg-primary/10 md:left-5 md:top-5"
      >
        ← Nexus Dock
      </a>
      <InteractiveWorkspace />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* One-screen icon dock — proposed primary Nexus entry point */}
      <Route path="/" component={NexusDock} />
      <Route path="/dock" component={NexusDock} />
      {/* The previous card launchpad remains available for technical review */}
      <Route path="/launchpad" component={NexusLaunchpad} />
      {/* Existing person-centred workspace retained as a separate full-screen module */}
      <Route path="/workspace" component={WorkspaceRoute} />
      {/* Full-screen plan-review workflow — no app chrome */}
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
          <Route path="/people" component={People} />
          <Route path="/people/:id" component={PersonDetail} />
          <Route path="/projects" component={Projects} />
          <Route path="/card-maker" component={CardMaker} />
          <Route path="/projects/:id" component={ProjectDetail} />
          <Route path="/knowledge" component={Knowledge} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/timeline" component={Timeline} />
          <Route path="/plans" component={Plans} />
          <Route path="/integrations" component={Integrations} />
          <Route path="/safety-connector" component={SafetyConnector} />
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
