import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Copy, Loader2, Sparkles, Wand2, Bookmark, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { JobForm, emptyJobValue, type JobFormValue } from "@/components/job-form";
import { PageHeader } from "@/components/page-header";
import { streamBid, seedBid } from "@/lib/api";
import { cleanPayload } from "@/lib/payload";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BidCraft - AI Upwork Bid Generator" },
      { name: "description", content: "Generate winning Upwork bids in seconds, tuned by your own past wins." },
      { property: "og:title", content: "BidCraft - AI Upwork Bid Generator" },
      { property: "og:description", content: "Generate winning Upwork bids in seconds, tuned by your own past wins." },
    ],
  }),
  component: Index,
});

function Index() {
  const [value, setValue] = useState<JobFormValue>(emptyJobValue);
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [ids, setIds] = useState<{ job_id?: string; bid_id?: string }>({});
  const [copied, setCopied] = useState(false);
  const [savingRef, setSavingRef] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.title.trim() || !value.description.trim()) {
      toast.error("Title and description are required.");
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setOutput("");
    setIds({});
    setStreaming(true);
    try {
      await streamBid(
        cleanPayload(value),
        (evt) => {
          if (evt.type === "chunk" && evt.content) {
            setOutput((p) => p + evt.content);
          } else if (evt.type === "done") {
            setIds({ job_id: evt.job_id, bid_id: evt.bid_id });
          }
        },
        ctrl.signal,
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error(err instanceof Error ? err.message : "Stream failed");
      }
    } finally {
      if (abortRef.current === ctrl) {
        setStreaming(false);
        abortRef.current = null;
      }
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const saveAsReference = async () => {
    if (!output.trim()) return;
    setSavingRef(true);
    try {
      const res = await seedBid({ ...cleanPayload(value), bid_text: output });
      toast.success(res.message || "Saved as reference bid");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingRef(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        icon={<Wand2 className="h-5 w-5" />}
        title="Generate a Bid"
        description="Paste a job, hit generate, and get a tailored Upwork bid in seconds."
      />
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="paper-card rounded-2xl p-6">
          <JobForm value={value} onChange={setValue} />
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={streaming} className="gap-2">
            {streaming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate Bid
              </>
            )}
          </Button>
        </div>
      </form>

      {(streaming || output) && (
        <section className="mt-8 paper-card rounded-2xl p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Your Bid</h2>
              {(ids.job_id || ids.bid_id) && (
                <p className="mt-1 text-[11px] font-mono text-muted-foreground">
                  {ids.job_id && <>job: {ids.job_id.slice(0, 8)} </>}
                  {ids.bid_id && <>· bid: {ids.bid_id.slice(0, 8)}</>}
                </p>
              )}
            </div>
            {!streaming && output && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copy} className="gap-1">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={saveAsReference}
                  disabled={savingRef}
                  className="gap-1"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  {savingRef ? "Saving..." : "Save as Reference"}
                </Button>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-border bg-background/40 p-6 leading-relaxed">
            <p className="whitespace-pre-wrap text-sm text-foreground/95">
              {output}
              {streaming && (
                <span className="cursor-blink ml-0.5 inline-block h-4 w-[2px] translate-y-[2px] bg-primary align-middle" />
              )}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
