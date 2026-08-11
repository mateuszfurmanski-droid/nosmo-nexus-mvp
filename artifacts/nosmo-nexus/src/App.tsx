import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout";
import { FocusProvider } from "@/focus/focus-context";
import { FocusOverlay } from "@/focus/focus-overlay";
import { AvailabilityProvider } from "@/availability/availability-context";
import { NexusFileLoaderCloudBridge } from "@/cloud-data/file-loader-cloud-bridge";
import { NexusWorkModeAiHandoffReceiver } from "@/cloud-data/work-mode-ai-handoff-receiver";

// Pages
import NexusLaunchpad from "@/pages/nexus-launchpad";
import SystemMap from "@/pages/system-map";
import PlanReview from "@/pages/plan-review";
import FirstRun from "@/pages/first-run";
import RelationshipTreeExport from "@/pages/relationship-tree-export";
import EsafeProjectWorld from "@/pages/esafe-project-world";
import PersonCardDemo from "@/pages/person-card-demo";
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
import TradeWorkspace from "@/pages/trade-workspace";
import CommunicationHub from "@/pages/communication-hub";
import BimOverlay from "@/pages/bim-overlay";
import ExternalTools from "@/pages/external-tools";

function Router() {
  return (
    <Switch>
      {/* Relationship Tree + Nexus shell is the canonical full-screen home. */}
      <Route path="/" component={RelationshipTreeExport} />
      <Route path="/relationship-tree" component={RelationshipTreeExport} />
      <Route path="/workspace" component={RelationshipTreeExport} />

      {/* Source-native Project Worlds run full-screen and return to the canonical tree. */}
      <Route path="/project-worlds/esafe" component={EsafeProjectWorld} />
      <Route path="/apps/nexus-esafe-demo/" component={EsafeProjectWorld} />
      <Route path="/apps/nexus-esafe-demo" component={EsafeProjectWorld} />

      {/* Specialist full-screen workflows intentionally run without the standard app layout. */}
      <Route path="/first-run" component={FirstRun} />
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
          {/* Legacy launchpad remains a secondary catalogue, never a second Nexus home. */}
          <Route path="/menu" component={NexusLaunchpad} />
          <Route path="/modules" component={NexusLaunchpad} />
          <Route path="/trades/:tradeId" component={TradeWorkspace} />
          <Route path="/trades" component={Trades} />
          <Route path="/system-map" component={SystemMap} />
          <Route path="/communication-hub" component={CommunicationHub} />
          <Route path="/bim-overlay" component={BimOverlay} />
          <Route path="/external-tools" component={ExternalTools} />

          <Route path="/projects/:id" component={ProjectDetail} />
          <Route path="/projects" component={Projects} />
          <Route path="/person-card-demo" component={PersonCardDemo} />
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
              <NexusFileLoaderCloudBridge />
              <NexusWorkModeAiHandoffReceiver />
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