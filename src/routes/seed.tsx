import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JobForm, emptyJobValue, type JobFormValue } from "@/components/job-form";
import { PageHeader } from "@/components/page-header";
import { seedBid } from "@/lib/api";
import { cleanPayload } from "@/lib/payload";

export const Route = createFileRoute("/seed")({
  head: () => ({ meta: [{ title: "Add Reference Bid - BidCraft" }] }),
  component: SeedPage,
});

function SeedPage() {
  const [value, setValue] = useState<JobFormValue>(emptyJobValue);
  const [bidText, setBidText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.title.trim() || !value.description.trim() || !bidText.trim()) {
      toast.error("Title, description, and bid text are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await seedBid({ ...cleanPayload(value), bid_text: bidText });
      toast.success(res.message || "Past bid seeded successfully.");
      setValue(emptyJobValue);
      setBidText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed bid");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={<Bookmark className="h-5 w-5" />}
        title="Add a Reference Bid"
        description="Save a past job + the bid you wrote and won. Future AI-generated bids will learn from it."
      />
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="paper-card rounded-2xl p-6">
          <JobForm value={value} onChange={setValue} />
        </div>
        <div className="paper-card rounded-2xl p-6 space-y-2">
          <Label htmlFor="bid">
            The bid you wrote and won <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="bid"
            rows={10}
            value={bidText}
            onChange={(e) => setBidText(e.target.value)}
            placeholder="Paste your winning bid here..."
            required
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting} size="lg">
            {submitting ? "Saving..." : "Save Reference Bid"}
          </Button>
        </div>
      </form>
    </div>
  );
}