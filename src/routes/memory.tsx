import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, Database, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { fetchMemory, type MemoryEntry } from "@/lib/api";

export const Route = createFileRoute("/memory")({
  head: () => ({ meta: [{ title: "Memory - BidCraft" }] }),
  component: MemoryPage,
});

const PAGE = 20;

function preview(text: string, n = 140) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function MemoryPage() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async (skip: number) => {
    try {
      const data = await fetchMemory(skip, PAGE);
      setEntries((prev) => (skip === 0 ? data : [...prev, ...data]));
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
    await load(entries.length);
    setLoadingMore(false);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={<Database className="h-5 w-5" />}
        title="AI Memory"
        description="Stored conversations the AI uses for context across bids."
      />

      {loading ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="paper-card rounded-xl p-6 text-sm text-destructive">{error}</div>
      ) : entries.length === 0 ? (
        <div className="paper-card rounded-xl p-10 text-center text-muted-foreground">
          No memory entries yet.
        </div>
      ) : (
        <div className="paper-card overflow-hidden rounded-2xl">
          <ul className="divide-y divide-border">
            {entries.map((m) => {
              const isOpen = expanded === m.id;
              return (
                <li key={m.id}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : m.id)}
                    className="w-full px-5 py-4 text-left transition-colors hover:bg-accent/30"
                  >
                    <div className="flex items-start gap-3">
                      <ChevronDown
                        className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-primary/15 text-primary font-mono"
                          >
                            {m.memory_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(m.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm">
                            <span className="text-muted-foreground">User: </span>
                            <span className="text-foreground/90">{preview(m.user_message)}</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-muted-foreground">AI: </span>
                            <span className="text-foreground/90">{preview(m.ai_response)}</span>
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-3 text-[11px] font-mono text-muted-foreground">
                          {m.job_id && <span>job: {m.job_id.slice(0, 8)}</span>}
                          {m.bid_id && <span>bid: {m.bid_id.slice(0, 8)}</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="space-y-4 border-t border-border bg-background/40 px-5 py-5">
                      <div>
                        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          User Message
                        </h3>
                        <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-card/40 p-4 text-sm font-sans text-foreground/90">
                          {m.user_message}
                        </pre>
                      </div>
                      <div>
                        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          AI Response
                        </h3>
                        <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-card/40 p-4 text-sm font-sans text-foreground/90">
                          {m.ai_response}
                        </pre>
                      </div>
                      {m.metadata && Object.keys(m.metadata).length > 0 && (
                        <div>
                          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Metadata
                          </h3>
                          <pre className="overflow-x-auto rounded-lg border border-border bg-card/40 p-4 text-xs font-mono text-foreground/80">
                            {JSON.stringify(m.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {hasMore && entries.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}