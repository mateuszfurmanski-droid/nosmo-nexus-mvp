import { AppLayout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Puzzle } from "lucide-react";

const integrations = [
  {
    name: "Procore",
    description: "Construction management — sync projects, RFIs, submittals, and daily logs.",
    letter: "P",
    iconBg: "bg-red-500/20 text-red-400",
    category: "Construction",
  },
  {
    name: "Autodesk Construction Cloud",
    description: "Sync BIM models, issues, and drawing sheets from ACC/BIM 360.",
    letter: "A",
    iconBg: "bg-orange-500/20 text-orange-400",
    category: "Construction",
  },
  {
    name: "Bluebeam Revu",
    description: "Pull markup sessions and PDF annotations directly into NOSMO Nexus.",
    letter: "B",
    iconBg: "bg-blue-500/20 text-blue-400",
    category: "Plans",
  },
  {
    name: "Fieldwire",
    description: "Sync field tasks, punch list items, and inspection records.",
    letter: "F",
    iconBg: "bg-yellow-500/20 text-yellow-400",
    category: "Field",
  },
  {
    name: "Microsoft Excel",
    description: "Import project schedules, cost sheets, and quantity take-offs from Excel.",
    letter: "X",
    iconBg: "bg-green-500/20 text-green-400",
    category: "Data",
  },
  {
    name: "Google Drive",
    description: "Connect Google Drive to automatically sync uploaded plans and documents.",
    letter: "G",
    iconBg: "bg-blue-400/20 text-blue-300",
    category: "Storage",
  },
  {
    name: "Microsoft OneDrive",
    description: "Sync documents and drawings from OneDrive and SharePoint.",
    letter: "O",
    iconBg: "bg-blue-600/20 text-blue-400",
    category: "Storage",
  },
];

const categoryColor: Record<string, string> = {
  Construction: "bg-primary/10 text-primary",
  Plans: "bg-purple-500/10 text-purple-400",
  Field: "bg-yellow-500/10 text-yellow-400",
  Data: "bg-green-500/10 text-green-400",
  Storage: "bg-blue-500/10 text-blue-400",
};

export default function Integrations() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground mt-1">Connect NOSMO Nexus with your existing construction tools.</p>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <Puzzle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-primary">Integrations launching in V1</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              These connectors are built and scheduled for the V1 release. Priority access available for early teams.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {integrations.map(integration => (
            <div
              key={integration.name}
              data-testid={`integration-card-${integration.name.toLowerCase().replace(/\s+/g, "-")}`}
              className="rounded-xl border border-border bg-card p-5 flex items-start gap-4 hover:border-primary/20 transition-colors"
            >
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 font-bold text-lg ${integration.iconBg}`}>
                {integration.letter}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{integration.name}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{integration.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor[integration.category]}`}>
                    {integration.category}
                  </span>
                  <Badge variant="outline" className="text-xs text-muted-foreground border-border">
                    Coming Soon
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
