import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, History as HistoryIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { fetchJobs, fetchJobBid, type Bid, type Job } from "@/lib/api";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "History - BidCraft" }] }),
  component: HistoryPage,
});

const PAGE = 20;

function HistoryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bids, setBids] = useState<Record<string, Bid | "loading" | "error">>({});

  const load = async (skip: number) => {
    try {
      const data = await fetchJobs(skip, PAGE);
      setJobs((prev) => (skip === 0 ? data : [...prev, ...data]));
      setHasMore(data.length === PAGE);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  };

  useEffect(() => {
    setLoading(true);
    load(0).finally(() => setLoading(false));
  }, []);

  const onLoadMore = async () => {
    setLoadingMore(true);
    await load(jobs.length);
    setLoadingMore(false);
  };

  const toggle = async (job: Job) => {
    const next = expanded === job.id ? null : job.id;
    setExpanded(next);
    if (next && !bids[job.id]) {
      setBids((p) => ({ ...p, [job.id]: "loading" }));
      try {
        const b = await fetchJobBid(job.id);
        setBids((p) => ({ ...p, [job.id]: b }));
      } catch {
        setBids((p) => ({ ...p, [job.id]: "error" }));
      }
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={<HistoryIcon className="h-5 w-5" />}
        title="Job History"
        description="Every job you've analyzed and the bids generated for them."
      />

      {loading ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="paper-card rounded-xl p-6 text-sm text-destructive">{error}</div>
      ) : jobs.length === 0 ? (
        <div className="paper-card rounded-xl p-10 text-center text-muted-foreground">
          No jobs yet. Generate your first bid to see it here.
        </div>
      ) : (
        <div className="paper-card overflow-hidden rounded-2xl">
          <div className="hidden grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:grid">
            <div className="col-span-5">Title</div>
            <div className="col-span-2">Budget</div>
            <div className="col-span-3">Skills</div>
            <div className="col-span-2">Date</div>
          </div>
          <ul className="divide-y divide-border">
            {jobs.map((job) => {
              const isOpen = expanded === job.id;
              const bid = bids[job.id];
              return (
                <li key={job.id}>
                  <button
                    onClick={() => toggle(job)}
                    className="grid w-full grid-cols-1 gap-2 px-5 py-4 text-left transition-colors hover:bg-accent/30 sm:grid-cols-12 sm:gap-4 sm:items-center"
                  >
                    <div className="col-span-5 flex items-center gap-2 font-medium">
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                      <span className="truncate">{job.title}</span>
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground">
                      {job.budget || "-"}
                    </div>
                    <div className="col-span-3 flex flex-wrap gap-1">
                      {job.skills.slice(0, 3).map((s) => (
                        <Badge key={s} variant="secondary" className="bg-primary/15 text-primary">
                          {s}
                        </Badge>
                      ))}
                      {job.skills.length > 3 && (
                        <Badge variant="outline">+{job.skills.length - 3}</Badge>
                      )}
                    </div>
                    <div className="col-span-2 text-xs text-muted-foreground">
                      {format(new Date(job.created_at), "MMM d, yyyy")}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-border bg-background/40 px-5 py-5 space-y-4">
                      <div>
                        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                          Job Description
                        </h3>
                        <p className="whitespace-pre-wrap text-sm text-foreground/90">
                          {job.description}
                        </p>
                      </div>
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Bid
                          </h3>
                          {typeof bid === "object" && bid !== null && (
                            <Badge
                              variant="secondary"
                              className={
                                bid.is_manual
                                  ? "bg-amber-500/15 text-amber-400"
                                  : "bg-primary/15 text-primary"
                              }
                            >
                              {bid.is_manual ? "Manual Reference" : "AI Generated"}
                            </Badge>
                          )}
                        </div>
                        {bid === "loading" ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : bid === "error" ? (
                          <p className="text-sm text-destructive">Failed to load bid.</p>
                        ) : bid ? (
                          <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-card/40 p-4 text-sm font-sans text-foreground/90">
                            {bid.bid_text}
                          </pre>
                        ) : null}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {hasMore && jobs.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}