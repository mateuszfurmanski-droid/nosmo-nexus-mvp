import { FileText, FileSpreadsheet, FileImage, Presentation, File, User, FolderKanban, Tag, Clock, Lock } from "lucide-react";
import { getDocument, getPerson, getProject } from "@/demo/data";
import { format, formatDistanceToNow } from "date-fns";
import { FocusableEntity } from "../focusable-entity";

const kindIcon: Record<string, typeof FileText> = {
  PDF: FileText,
  Doc: FileText,
  Spreadsheet: FileSpreadsheet,
  Slide: Presentation,
  Image: FileImage,
};

export function DocumentView({ documentId }: { documentId: string }) {
  const doc = getDocument(documentId);
  if (!doc) return <div className="p-8 text-center text-muted-foreground">Document not found</div>;

  const owner = getPerson(doc.ownerPersonId);
  const project = doc.projectId ? getProject(doc.projectId) : undefined;
  const Icon = kindIcon[doc.kind] ?? File;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <Icon className="w-7 h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">{doc.title}</h1>
            <p className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{doc.kind}</span>
              <span>•</span>
              <span>{doc.sizeLabel}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</span>
            </p>
          </div>
        </div>

        {doc.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {doc.tags.map((tag) => (
              <span key={tag} className="text-xs px-2.5 py-1 bg-secondary text-secondary-foreground rounded-md border border-border inline-flex items-center gap-1">
                <Tag className="w-3 h-3" /> {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {owner && (
          <FocusableEntity
            target={{ type: "person", id: owner.id }}
            ariaLabel={`Open person ${owner.name}`}
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors group"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Owner</p>
            <p className="font-medium text-sm group-hover:text-primary transition-colors">{owner.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{owner.title}</p>
          </FocusableEntity>
        )}
        {project && (
          <FocusableEntity
            target={{ type: "project", id: project.id }}
            ariaLabel={`Open project ${project.name}`}
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors group"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><FolderKanban className="w-3.5 h-3.5" /> Project</p>
            <p className="font-medium text-sm group-hover:text-primary transition-colors">{project.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{project.client}</p>
          </FocusableEntity>
        )}
      </div>

      <div className="bg-secondary/30 border border-border rounded-xl p-4 flex items-center gap-3 text-sm text-muted-foreground">
        <Lock className="w-4 h-4 shrink-0" />
        Preview and download arrive in V1. This investor demo links the document into the workspace graph without storing file contents.
      </div>
    </div>
  );
}
