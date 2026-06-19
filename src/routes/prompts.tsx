import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Plus, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createPrompt, fetchPrompts, updatePrompt, type Prompt } from "@/lib/api";

export const Route = createFileRoute("/prompts")({
  head: () => ({ meta: [{ title: "Prompts - BidCraft" }] }),
  component: PromptsPage,
});

function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newType, setNewType] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchPrompts();
      setPrompts(data);
      setDrafts(Object.fromEntries(data.map((p) => [p.id, p.prompt])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSave = async (p: Prompt) => {
    const draft = drafts[p.id] ?? "";
    if (draft === p.prompt) return;
    setSaving(p.id);
    try {
      const updated = await updatePrompt(p.id, draft);
      setPrompts((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
      setDrafts((prev) => ({ ...prev, [p.id]: updated.prompt }));
      toast.success(`Saved ${updated.type} prompt`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  const onReset = (p: Prompt) => {
    setDrafts((prev) => ({ ...prev, [p.id]: p.prompt }));
  };

  const onCreate = async () => {
    if (!newType.trim() || !newPrompt.trim()) {
      toast.error("Type and prompt are required");
      return;
    }
    setCreating(true);
    try {
      const created = await createPrompt(newType.trim(), newPrompt);
      setPrompts((prev) => [...prev, created]);
      setDrafts((prev) => ({ ...prev, [created.id]: created.prompt }));
      toast.success("Prompt created");
      setCreateOpen(false);
      setNewType("");
      setNewPrompt("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          icon={<SlidersHorizontal className="h-5 w-5" />}
          title="Prompts"
          description="Edit the system and bid generation prompts used by the AI."
        />
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> New Prompt
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new prompt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="type">Type</Label>
                <Input
                  id="type"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  placeholder="custom_type"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  className="min-h-[180px] font-mono text-xs"
                  placeholder="Write the prompt..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={onCreate} disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="paper-card rounded-xl p-6 text-sm text-destructive">{error}</div>
      ) : prompts.length === 0 ? (
        <div className="paper-card rounded-xl p-10 text-center text-muted-foreground">
          No prompts yet.
        </div>
      ) : (
        <div className="space-y-5">
          {prompts.map((p) => {
            const draft = drafts[p.id] ?? "";
            const dirty = draft !== p.prompt;
            const isSaving = saving === p.id;
            return (
              <div
                key={p.id}
                className={`paper-card rounded-2xl p-6 transition-colors ${
                  dirty ? "ring-1 ring-amber-500/40" : ""
                }`}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-primary/15 text-primary font-mono">
                      {p.type}
                    </Badge>
                    {dirty && (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                        Unsaved changes
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Updated {format(new Date(p.updated_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <Textarea
                  value={draft}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                  className="min-h-[260px] resize-y font-mono text-xs leading-relaxed bg-background/40"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReset(p)}
                    disabled={!dirty || isSaving}
                    className="gap-1"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onSave(p)}
                    disabled={!dirty || isSaving}
                    className="gap-1"
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}