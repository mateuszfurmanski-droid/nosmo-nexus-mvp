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

function Router() {
  return (
    <Switch>
      {/* Clean, full-screen interactive workspace — no app chrome */}
      <Route path="/" component={InteractiveWorkspace} />
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
