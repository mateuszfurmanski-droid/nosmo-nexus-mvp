import { useState } from "react";
import {
  useListNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  getListNotesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, StickyNote, Clock } from "lucide-react";

type NoteFormData = { title: string; content: string };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

export function NotesTab({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editNote, setEditNote] = useState<{ id: number; title: string; content: string } | null>(null);
  const [form, setForm] = useState<NoteFormData>({ title: "", content: "" });

  const { data: notes, isLoading } = useListNotes(projectId, {
    query: { queryKey: getListNotesQueryKey(projectId) },
  });
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListNotesQueryKey(projectId) });
  }

  function openCreate() {
    setForm({ title: "", content: "" });
    setCreateOpen(true);
  }

  function openEdit(note: { id: number; title: string; content: string }) {
    setEditNote(note);
    setForm({ title: note.title, content: note.content });
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    createNote.mutate(
      { id: projectId, data: { title: form.title.trim(), content: form.content } },
      {
        onSuccess: () => { invalidate(); toast({ title: "Note created" }); setCreateOpen(false); },
        onError: () => toast({ title: "Failed to create note", variant: "destructive" }),
      }
    );
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editNote || !form.title.trim()) return;
    updateNote.mutate(
      { id: editNote.id, data: { title: form.title.trim(), content: form.content } },
      {
        onSuccess: () => { invalidate(); toast({ title: "Note saved" }); setEditNote(null); },
        onError: () => toast({ title: "Failed to save note", variant: "destructive" }),
      }
    );
  }

  function handleDelete(id: number, title: string) {
    deleteNote.mutate(
      { id },
      {
        onSuccess: () => { invalidate(); toast({ title: `"${title}" deleted` }); },
        onError: () => toast({ title: "Failed to delete note", variant: "destructive" }),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {notes?.length ?? 0} note{notes?.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" variant="outline" onClick={openCreate} className="gap-1.5 h-7 text-xs">
          <Plus className="w-3 h-3" /> Add Note
        </Button>
      </div>

      {notes && notes.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {notes.map(note => (
            <div
              key={note.id}
              data-testid={`note-card-${note.id}`}
              className="rounded-xl border border-border bg-card p-4 space-y-2 group hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <StickyNote className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <h3 className="text-sm font-semibold truncate">{note.title}</h3>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(note)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id, note.title)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {note.content ? (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 whitespace-pre-wrap">
                  {note.content}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic">No content</p>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground/60 pt-1">
                <Clock className="w-3 h-3" />
                <span>{formatDate(note.updatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl border border-dashed border-border py-10 text-center cursor-pointer hover:border-primary/40 transition-colors"
          onClick={openCreate}
        >
          <StickyNote className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">No notes yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add notes, specs, or meeting minutes for this project.</p>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Note</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <Input
              placeholder="Title *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
            />
            <Textarea
              placeholder="Note content, specs, meeting minutes…"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              className="min-h-[120px] resize-y"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createNote.isPending || !form.title.trim()}>
                {createNote.isPending ? "Saving…" : "Create Note"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editNote} onOpenChange={v => !v && setEditNote(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Note</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-3">
            <Input
              placeholder="Title *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
            />
            <Textarea
              placeholder="Note content…"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              className="min-h-[120px] resize-y"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditNote(null)}>Cancel</Button>
              <Button type="submit" disabled={updateNote.isPending || !form.title.trim()}>
                {updateNote.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
