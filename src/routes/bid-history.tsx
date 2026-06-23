import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Check,
  ChevronDown,
  Copy,
  FileClock,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PageHeader } from "@/components/page-header";
import {
  fetchJobs,
  fetchJobBids,
  streamRevision,
  type Bid,
  type Job,
} from "@/lib/api";

export const Route = createFileRoute("/bid-history")({
  head: () => ({ meta: [{ title: "Bid History - BidCraft" }] }),
  component: BidHistoryPage,
});

const PAGE = 20;

function BidHistoryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [bidsError, setBidsError] = useState<string | null>(null);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);

  const [instruction, setInstruction] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [copied, setCopied] = useState(false);
  const [jobDetailsOpen, setJobDetailsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );
  const selectedBid = useMemo(
    () => bids.find((b) => b.id === selectedBidId) ?? null,
    [bids, selectedBidId],
  );

  const loadJobs = async (skip: number) => {
    try {
      const data = await fetchJobs(skip, PAGE);
      setJobs((prev) => (skip === 0 ? data : [...prev, ...data]));
      setHasMore(data.length === PAGE);
      setJobsError(null);
    } catch (e) {
      setJobsError(e instanceof Error ? e.message : "Failed to load jobs");
    }
  };

  useEffect(() => {
    setJobsLoading(true);
    loadJobs(0).finally(() => setJobsLoading(false));
  }, []);

  const loadBids = async (jobId: string, preferBidId?: string) => {
    setBidsLoading(true);
    setBidsError(null);
    try {
      const data = await fetchJobBids(jobId);
      setBids(data);
      if (data.length > 0) {
        const pick = preferBidId && data.find((b) => b.id === preferBidId)
          ? preferBidId
          : data[0].id;
        setSelectedBidId(pick);
      } else {
        setSelectedBidId(null);
      }
    } catch (e) {
      setBidsError(e instanceof Error ? e.message : "Failed to load bids");
    } finally {
      setBidsLoading(false);
    }
  };

  const selectJob = (job: Job) => {
    if (job.id === selectedJobId) return;
    abortRef.current?.abort();
    setSelectedJobId(job.id);
    setBids([]);
    setSelectedBidId(null);
    setInstruction("");
    setStreamText("");
    setJobDetailsOpen(false);
    void loadBids(job.id);
  };

  const onLoadMore = async () => {
    setLoadingMore(true);
    await loadJobs(jobs.length);
    setLoadingMore(false);
  };

  const copy = async () => {
    if (!selectedBid) return;
    await navigator.clipboard.writeText(selectedBid.bid_text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };

  const cancelStream = () => {
    abortRef.current?.abort();
  };

  const submitRevision = async () => {
    if (!selectedJobId || !selectedBidId || !instruction.trim()) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStreamText("");
    setStreaming(true);
    const jobId = selectedJobId;
    try {
      let newBidId: string | undefined;
      await streamRevision(
        jobId,
        selectedBidId,
        instruction.trim(),
        (evt) => {
          if (evt.type === "chunk" && evt.content) {
            setStreamText((p) => p + evt.content);
          } else if (evt.type === "done") {
            newBidId = evt.bid_id;
          }
        },
        ctrl.signal,
      );
      await loadBids(jobId, newBidId);
      setInstruction("");
      setStreamText("");
      toast.success("Revision saved");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error(err instanceof Error ? err.message : "Revision failed");
      }
    } finally {
      if (abortRef.current === ctrl) {
        setStreaming(false);
        abortRef.current = null;
      }
    }
  };

  const canSubmit = !!selectedBidId && instruction.trim().length > 0 && !streaming;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        icon={<FileClock className="h-5 w-5" />}
        title="Bid History"
        description="Browse every version of a job's bid and ask AI to revise it."
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Jobs column */}
        <aside className="paper-card rounded-lg p-3 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
          <h2 className="px-2 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Jobs
          </h2>
          {jobsLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : jobsError ? (
            <div className="space-y-3 p-3 text-sm">
              <p className="text-destructive">{jobsError}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setJobsLoading(true);
                  loadJobs(0).finally(() => setJobsLoading(false));
                }}
              >
                Retry
              </Button>
            </div>
          ) : jobs.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No jobs yet.</p>
          ) : (
            <ul className="space-y-1">
              {jobs.map((job) => {
                const active = job.id === selectedJobId;
                return (
                  <li key={job.id}>
                    <button
                      onClick={() => selectJob(job)}
                      className={`w-full rounded-md border px-3 py-2.5 text-left transition-colors ${
                        active
                          ? "border-primary/40 bg-primary/10"
                          : "border-transparent hover:bg-accent/40"
                      }`}
                    >
                      <div className="truncate text-sm font-medium">{job.title}</div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate">{job.budget || "No budget"}</span>
                        <span>{format(new Date(job.created_at), "MMM d")}</span>
                      </div>
                      {job.skills.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {job.skills.slice(0, 3).map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="bg-primary/10 text-[10px] text-primary"
                            >
                              {s}
                            </Badge>
                          ))}
                          {job.skills.length > 3 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{job.skills.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {hasMore && jobs.length > 0 && (
            <div className="p-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={onLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </aside>

        {/* Workspace */}
        <section className="space-y-4">
          {!selectedJob ? (
            <div className="paper-card rounded-lg p-10 text-center text-sm text-muted-foreground">
              Select a job on the left to view its bid versions.
            </div>
          ) : (
            <>
              <div className="paper-card rounded-lg p-5">
                <Collapsible open={jobDetailsOpen} onOpenChange={setJobDetailsOpen}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">
                        {selectedJob.title}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{selectedJob.budget || "No budget"}</span>
                        <span>·</span>
                        <span>
                          {format(new Date(selectedJob.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1">
                        Job details
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${jobDetailsOpen ? "rotate-180" : ""}`}
                        />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
                    {selectedJob.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedJob.skills.map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="bg-primary/15 text-primary"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap text-foreground/90">
                      {selectedJob.description}
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Versions */}
              <div className="paper-card rounded-lg p-3">
                <div className="flex items-center justify-between px-2 pb-2">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Versions
                  </h3>
                  {bids.length > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      {bids.length} total
                    </span>
                  )}
                </div>
                {bidsLoading ? (
                  <div className="flex gap-2 overflow-x-auto p-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-44 shrink-0" />
                    ))}
                  </div>
                ) : bidsError ? (
                  <div className="space-y-2 p-3 text-sm">
                    <p className="text-destructive">{bidsError}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => selectedJobId && loadBids(selectedJobId)}
                    >
                      Retry
                    </Button>
                  </div>
                ) : bids.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    No bid versions yet for this job.
                  </p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto p-1">
                    {bids.map((bid, idx) => {
                      const versionNum = bids.length - idx;
                      const active = bid.id === selectedBidId;
                      return (
                        <button
                          key={bid.id}
                          onClick={() => setSelectedBidId(bid.id)}
                          className={`shrink-0 rounded-md border px-3 py-2 text-left transition-colors ${
                            active
                              ? "border-primary/50 bg-primary/10"
                              : "border-border hover:bg-accent/40"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              v{versionNum}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] ${
                                bid.is_manual
                                  ? "bg-amber-500/15 text-amber-400"
                                  : "bg-primary/15 text-primary"
                              }`}
                            >
                              {bid.is_manual ? "Manual" : "AI"}
                            </Badge>
                          </div>
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            {format(new Date(bid.created_at), "MMM d, HH:mm")}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Document panel */}
              {selectedBid && (
                <div className="paper-card rounded-lg p-5">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">Bid</h3>
                      <Badge
                        variant="secondary"
                        className={
                          selectedBid.is_manual
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-primary/15 text-primary"
                        }
                      >
                        {selectedBid.is_manual ? "Manual Reference" : "AI Generated"}
                      </Badge>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={copy}
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="rounded-md border border-border bg-background/40 p-5 leading-relaxed">
                    <p className="whitespace-pre-wrap text-sm text-foreground/95">
                      {selectedBid.bid_text}
                    </p>
                  </div>
                </div>
              )}

              {/* Streaming revision preview */}
              {streaming && (
                <div className="paper-card rounded-lg p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <h3 className="text-sm font-semibold">New version (drafting)</h3>
                  </div>
                  <div className="rounded-md border border-border bg-background/40 p-5 leading-relaxed">
                    <p className="whitespace-pre-wrap text-sm text-foreground/95">
                      {streamText}
                      <span className="cursor-blink ml-0.5 inline-block h-4 w-[2px] translate-y-[2px] bg-primary align-middle" />
                    </p>
                  </div>
                </div>
              )}

              {/* Edit with AI */}
              <div className="paper-card rounded-lg p-5">
                <label className="text-sm font-semibold">Edit with AI</label>
                <p className="mt-1 text-xs text-muted-foreground">
                  What should change?
                </p>
                <Textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="Make the opening more direct and mention my Shopify migration experience."
                  className="mt-3 min-h-[100px] resize-y"
                  disabled={streaming}
                />
                <div className="mt-3 flex items-center justify-end gap-2">
                  {streaming && (
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={cancelStream}
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    onClick={submitRevision}
                    disabled={!canSubmit}
                    className="gap-2"
                  >
                    {streaming ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Revising...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Generate revision
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}