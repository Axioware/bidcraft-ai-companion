import { useState, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import type { ClientInfo, JobPayload } from "@/lib/api";

export type JobFormValue = JobPayload;

interface JobFormProps {
  value: JobFormValue;
  onChange: (v: JobFormValue) => void;
  children?: ReactNode;
}

export function JobForm({ value, onChange, children }: JobFormProps) {
  const [skillDraft, setSkillDraft] = useState("");
  const [openClient, setOpenClient] = useState(false);

  const update = (patch: Partial<JobFormValue>) => onChange({ ...value, ...patch });
  const updateClient = (patch: Partial<ClientInfo>) =>
    onChange({ ...value, client_info: { ...value.client_info, ...patch } });

  const addSkill = () => {
    const s = skillDraft.trim();
    if (!s) return;
    if (value.skills.includes(s)) {
      setSkillDraft("");
      return;
    }
    update({ skills: [...value.skills, s] });
    setSkillDraft("");
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Job Title <span className="text-destructive">*</span></Label>
        <Input
          id="title"
          required
          value={value.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="e.g. Full-stack developer for SaaS dashboard"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="desc">Job Description <span className="text-destructive">*</span></Label>
        <Textarea
          id="desc"
          required
          rows={7}
          value={value.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Paste the Upwork job description here..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget">Budget</Label>
        <Input
          id="budget"
          value={value.budget ?? ""}
          onChange={(e) => update({ budget: e.target.value })}
          placeholder="$500-800"
        />
      </div>

      <div className="space-y-2">
        <Label>Required Skills</Label>
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-input bg-input/40 p-2 focus-within:ring-2 focus-within:ring-ring">
          {value.skills.map((s) => (
            <Badge
              key={s}
              variant="secondary"
              className="gap-1 bg-primary/15 text-primary hover:bg-primary/25"
            >
              {s}
              <button
                type="button"
                onClick={() => update({ skills: value.skills.filter((x) => x !== s) })}
                aria-label={`Remove ${s}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <input
            value={skillDraft}
            onChange={(e) => setSkillDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addSkill();
              } else if (e.key === "Backspace" && !skillDraft && value.skills.length) {
                update({ skills: value.skills.slice(0, -1) });
              }
            }}
            onBlur={addSkill}
            placeholder={value.skills.length ? "" : "Type a skill, hit Enter"}
            className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <Collapsible open={openClient} onOpenChange={setOpenClient}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border bg-card/40 px-4 py-3 text-sm font-medium hover:bg-card/70 transition-colors">
          <span>Client Info <span className="text-muted-foreground font-normal">(optional)</span></span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${openClient ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="grid gap-4 pt-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={value.client_info?.country ?? ""}
              onChange={(e) => updateClient({ country: e.target.value })}
              placeholder="United States"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hire">Hire Rate</Label>
            <Input
              id="hire"
              value={value.client_info?.hire_rate ?? ""}
              onChange={(e) => updateClient({ hire_rate: e.target.value })}
              placeholder="85%"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reviews">Reviews</Label>
            <Input
              id="reviews"
              type="number"
              step="0.1"
              value={value.client_info?.reviews ?? ""}
              onChange={(e) =>
                updateClient({
                  reviews: e.target.value === "" ? null : parseFloat(e.target.value),
                })
              }
              placeholder="4.8"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="spent">Total Spent</Label>
            <Input
              id="spent"
              value={value.client_info?.total_spent ?? ""}
              onChange={(e) => updateClient({ total_spent: e.target.value })}
              placeholder="$12,000"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {children}
    </div>
  );
}

export const emptyJobValue: JobFormValue = {
  title: "",
  description: "",
  budget: "",
  skills: [],
  client_info: {},
};