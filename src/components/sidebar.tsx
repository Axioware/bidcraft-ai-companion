import { useState } from "react";
import {
  ChevronDown,
  FileText,
  Folder,
  MessageSquarePlus,
  Pencil,
  Plus,
  UserCircle,
} from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Job, Profile } from "@/lib/api";

interface SidebarProps {
  profiles: Profile[];
  activeProfileId: string | null;
  jobs: Job[];
  selectedJobId: string | null;
  onSelectProfile: (id: string) => void;
  onSelectJob: (id: string) => void;
  onNewBid: () => void;
  onNewProfile: () => void;
  onEditProfile: (profile: Profile) => void;
  onOpenProjects: () => void;
  onOpenPrompts: () => void;
}

function groupJobs(jobs: Job[]) {
  const now = new Date();
  const weekAgo = subDays(now, 7);

  const groups: { label: string; jobs: Job[] }[] = [];
  const todayJobs = jobs.filter((j) => isToday(new Date(j.created_at)));
  const yesterdayJobs = jobs.filter((j) =>
    isYesterday(new Date(j.created_at)),
  );
  const weekJobs = jobs.filter((j) => {
    const d = new Date(j.created_at);
    return d >= weekAgo && !isToday(d) && !isYesterday(d);
  });
  const olderJobs = jobs.filter((j) => new Date(j.created_at) < weekAgo);

  if (todayJobs.length) groups.push({ label: "Today", jobs: todayJobs });
  if (yesterdayJobs.length)
    groups.push({ label: "Yesterday", jobs: yesterdayJobs });
  if (weekJobs.length) groups.push({ label: "Last 7 days", jobs: weekJobs });
  if (olderJobs.length) groups.push({ label: "Older", jobs: olderJobs });

  return groups;
}

export function Sidebar({
  profiles,
  activeProfileId,
  jobs,
  selectedJobId,
  onSelectProfile,
  onSelectJob,
  onNewBid,
  onNewProfile,
  onEditProfile,
  onOpenProjects,
  onOpenPrompts,
}: SidebarProps) {
  const [profileOpen, setProfileOpen] = useState(false);

  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const jobGroups = groupJobs(jobs);

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-sidebar border-r border-sidebar-border overflow-hidden">
      {/* Profile selector */}
      <div className="p-2 border-b border-sidebar-border">
        <Popover open={profileOpen} onOpenChange={setProfileOpen}>
          <PopoverTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
              <UserCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-left">
                {activeProfile?.name ?? "Select profile"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-56 p-1"
            side="bottom"
            align="start"
          >
            {profiles.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-1 rounded-sm hover:bg-accent"
              >
                <button
                  className="flex-1 px-2 py-1.5 text-left text-sm truncate"
                  onClick={() => {
                    onSelectProfile(p.id);
                    setProfileOpen(false);
                  }}
                >
                  {p.id === activeProfileId ? (
                    <span className="font-medium">{p.name}</span>
                  ) : (
                    p.name
                  )}
                </button>
                <button
                  className="mr-1 rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditProfile(p);
                    setProfileOpen(false);
                  }}
                  aria-label={`Edit ${p.name}`}
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            ))}
            {profiles.length > 0 && (
              <div className="my-1 border-t border-border" />
            )}
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              onClick={() => {
                onNewProfile();
                setProfileOpen(false);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              New Profile
            </button>
          </PopoverContent>
        </Popover>
      </div>

      {/* New Bid button */}
      <div className="px-2 pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={onNewBid}
        >
          <MessageSquarePlus className="h-4 w-4" />
          New Bid
        </Button>
      </div>

      {/* Job list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-sidebar-border">
        {jobGroups.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            No bids yet.
            <br />
            Click "New Bid" to get started.
          </p>
        ) : (
          jobGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.jobs.map((job) => {
                  const active = job.id === selectedJobId;
                  return (
                    <li key={job.id}>
                      <button
                        onClick={() => onSelectJob(job.id)}
                        className={`w-full rounded-md px-2 py-2 text-left transition-colors ${
                          active
                            ? "bg-sidebar-accent text-sidebar-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                        }`}
                      >
                        <p className="truncate text-sm leading-snug">
                          {job.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(job.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      {/* Bottom actions */}
      <div className="border-t border-sidebar-border p-2 space-y-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={onOpenProjects}
        >
          <Folder className="h-4 w-4" />
          Reference Projects
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={onOpenPrompts}
        >
          <FileText className="h-4 w-4" />
          Prompts
        </Button>
      </div>
    </aside>
  );
}
