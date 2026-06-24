import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "./tag-input";
import { createProject, type Profile } from "@/lib/api";

interface AddProjectModalProps {
  open: boolean;
  profiles: Profile[];
  activeProfileId: string | null;
  onClose: () => void;
  onSave: () => void;
}

export function AddProjectModal({
  open,
  profiles,
  activeProfileId,
  onClose,
  onSave,
}: AddProjectModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [techStack, setTechStack] = useState<string[]>([]);
  const [outcome, setOutcome] = useState("");
  const [profileId, setProfileId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setSkills([]);
      setTechStack([]);
      setOutcome("");
      setProfileId(activeProfileId ?? profiles[0]?.id ?? "");
    }
  }, [open, activeProfileId, profiles]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!profileId) {
      toast.error("Please select a profile");
      return;
    }
    setSaving(true);
    try {
      await createProject({
        title: title.trim(),
        description: description.trim(),
        skills,
        tech_stack: techStack,
        outcome: outcome.trim() || undefined,
        profile_id: profileId,
      });
      toast.success("Reference project added");
      onSave();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Reference Project</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Past projects are used as RAG context to improve bid quality.
        </p>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="proj-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="proj-title"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. E-commerce platform rebuild"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="proj-desc"
              value={description}
              maxLength={5000}
              rows={4}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What you built, the problem it solved, your role..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Skills Used</Label>
              <TagInput
                value={skills}
                onChange={setSkills}
                placeholder="Add skills..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tech Stack</Label>
              <TagInput
                value={techStack}
                onChange={setTechStack}
                placeholder="React, FastAPI..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proj-outcome">Outcome</Label>
            <Textarea
              id="proj-outcome"
              value={outcome}
              maxLength={1000}
              rows={2}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Results, metrics, client feedback..."
            />
          </div>

          {profiles.length > 1 && (
            <div className="space-y-1.5">
              <Label>Profile</Label>
              <Select value={profileId} onValueChange={setProfileId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Add Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
