import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout";
import { FocusProvider } from "@/focus/focus-context";
import { FocusOverlay } from "@/focus/focus-overlay";

// Pages
import Dashboard from "@/pages/dashboard";
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

function Router() {
  return (
    <>
      <AppLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
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
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
      <FocusOverlay />
    </>
  );
}

function App() {
  return (
    <TooltipProvider>
      <FocusProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </FocusProvider>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
