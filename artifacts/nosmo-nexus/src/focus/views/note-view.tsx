import { StickyNote, User, FolderKanban, Tag, Clock } from "lucide-react";
import { getNote, getPerson, getProject } from "@/demo/data";
import { formatDistanceToNow } from "date-fns";
import { FocusableEntity } from "../focusable-entity";

export function NoteView({ noteId }: { noteId: string }) {
  const note = getNote(noteId);
  if (!note) return <div className="p-8 text-center text-muted-foreground">Note not found</div>;

  const person = note.personId ? getPerson(note.personId) : undefined;
  const project = note.projectId ? getProject(note.projectId) : undefined;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <StickyNote className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">{note.title}</h1>
            <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>By {note.author}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
            </p>
          </div>
        </div>

        <p className="text-sm text-foreground leading-relaxed mt-5">{note.snippet}</p>

        {note.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {note.tags.map((tag) => (
              <span key={tag} className="text-xs px-2.5 py-1 bg-secondary text-secondary-foreground rounded-md border border-border inline-flex items-center gap-1">
                <Tag className="w-3 h-3" /> {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {person && (
          <FocusableEntity
            target={{ type: "person", id: person.id }}
            ariaLabel={`Open person ${person.name}`}
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors group"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Person</p>
            <p className="font-medium text-sm group-hover:text-primary transition-colors">{person.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{person.title}</p>
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
    </div>
  );
}
