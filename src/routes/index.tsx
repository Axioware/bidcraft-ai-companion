import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Sidebar } from "@/components/sidebar";
import { NewBidForm } from "@/components/new-bid-form";
import { ChatView } from "@/components/chat-view";
import { ProfileModal } from "@/components/profile-modal";
import { ProjectsModal } from "@/components/projects-modal";
import { PromptsModal } from "@/components/prompts-modal";
import {
  fetchProfiles,
  fetchJobs,
  fetchJobConversation,
  streamGenerateBid,
  streamRevision,
  type Profile,
  type Job,
  type Conversation,
  type GenerateBidPayload,
} from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "BidCraft — AI Bid Generator" }],
  }),
  component: ChatApp,
});

function ChatApp() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("activeProfileId");
    } catch {
      return null;
    }
  });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversationLoading, setConversationLoading] = useState(false);

  const [showNewBidForm, setShowNewBidForm] = useState(true);

  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [streamingUserMessage, setStreamingUserMessage] = useState("");

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);
  const [promptsModalOpen, setPromptsModalOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // ── Persistence ────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      if (activeProfileId) localStorage.setItem("activeProfileId", activeProfileId);
      else localStorage.removeItem("activeProfileId");
    } catch { /* ignore */ }
  }, [activeProfileId]);

  // ── Data loading ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchProfiles()
      .then((data) => {
        setProfiles(data);
        // If stored profile no longer exists, fallback to first
        if (data.length > 0) {
          setActiveProfileId((prev) => {
            if (prev && data.find((p) => p.id === prev)) return prev;
            return data[0].id;
          });
        }
      })
      .catch(() => toast.error("Failed to load profiles"));
  }, []);

  useEffect(() => {
    if (!activeProfileId) return;
    fetchJobs(activeProfileId)
      .then(setJobs)
      .catch(() => toast.error("Failed to load jobs"));
  }, [activeProfileId]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const loadConversation = async (jobId: string) => {
    setConversationLoading(true);
    try {
      const conv = await fetchJobConversation(jobId);
      setConversation(conv);
    } catch {
      toast.error("Failed to load conversation");
    } finally {
      setConversationLoading(false);
    }
  };

  const reloadJobs = async () => {
    if (!activeProfileId) return;
    try {
      const data = await fetchJobs(activeProfileId);
      setJobs(data);
    } catch { /* silent */ }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSelectProfile = (id: string) => {
    abortRef.current?.abort();
    setActiveProfileId(id);
    setSelectedJobId(null);
    setConversation(null);
    setShowNewBidForm(true);
    setStreaming(false);
    setStreamText("");
    setStreamingUserMessage("");
  };

  const handleSelectJob = (jobId: string) => {
    if (streaming) abortRef.current?.abort();
    setSelectedJobId(jobId);
    setConversation(null);
    setShowNewBidForm(false);
    setStreaming(false);
    setStreamText("");
    setStreamingUserMessage("");
    loadConversation(jobId);
  };

  const handleNewBid = () => {
    if (streaming) abortRef.current?.abort();
    setSelectedJobId(null);
    setConversation(null);
    setShowNewBidForm(true);
    setStreaming(false);
    setStreamText("");
    setStreamingUserMessage("");
  };

  const handleGenerateBid = async (payload: GenerateBidPayload) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setShowNewBidForm(false);
    setSelectedJobId(null);
    setConversation(null);
    setStreaming(true);
    setStreamText("");
    setStreamingUserMessage(`Generate bid for: ${payload.title}`);

    let finalJobId: string | undefined;

    try {
      await streamGenerateBid(
        payload,
        (evt) => {
          if (evt.type === "chunk" && evt.content) {
            setStreamText((prev) => prev + evt.content);
          } else if (evt.type === "done") {
            finalJobId = evt.job_id;
          }
        },
        ctrl.signal,
      );

      if (finalJobId) {
        setSelectedJobId(finalJobId);
        await reloadJobs();
        const conv = await fetchJobConversation(finalJobId);
        setConversation(conv);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error(err instanceof Error ? err.message : "Failed to generate bid");
        setShowNewBidForm(true);
      }
    } finally {
      if (abortRef.current === ctrl) {
        setStreaming(false);
        setStreamText("");
        setStreamingUserMessage("");
        abortRef.current = null;
      }
    }
  };

  const handleRevise = async (instruction: string) => {
    if (!selectedJobId || !conversation) return;
    const latestBid =
      conversation.messages[conversation.messages.length - 1]?.bid;
    if (!latestBid) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStreaming(true);
    setStreamText("");
    setStreamingUserMessage(instruction);

    try {
      await streamRevision(
        selectedJobId,
        latestBid.id,
        instruction,
        (evt) => {
          if (evt.type === "chunk" && evt.content) {
            setStreamText((prev) => prev + evt.content);
          }
        },
        ctrl.signal,
      );

      const jobId = selectedJobId;
      const conv = await fetchJobConversation(jobId);
      setConversation(conv);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error(err instanceof Error ? err.message : "Revision failed");
      }
    } finally {
      if (abortRef.current === ctrl) {
        setStreaming(false);
        setStreamText("");
        setStreamingUserMessage("");
        abortRef.current = null;
      }
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const latestBidId =
    conversation?.messages[conversation.messages.length - 1]?.bid?.id ?? null;

  const showChat = !showNewBidForm || streaming || !!selectedJobId;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        profiles={profiles}
        activeProfileId={activeProfileId}
        jobs={jobs}
        selectedJobId={selectedJobId}
        onSelectProfile={handleSelectProfile}
        onSelectJob={handleSelectJob}
        onNewBid={handleNewBid}
        onNewProfile={() => {
          setEditingProfile(null);
          setProfileModalOpen(true);
        }}
        onEditProfile={(p) => {
          setEditingProfile(p);
          setProfileModalOpen(true);
        }}
        onOpenProjects={() => setProjectsModalOpen(true)}
        onOpenPrompts={() => setPromptsModalOpen(true)}
      />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {showChat ? (
          <ChatView
            conversation={conversation}
            conversationLoading={conversationLoading}
            streaming={streaming}
            streamText={streamText}
            streamingUserMessage={streamingUserMessage}
            latestBidId={latestBidId}
            onRevise={handleRevise}
            onCancelStream={() => abortRef.current?.abort()}
          />
        ) : (
          <NewBidForm
            profiles={profiles}
            activeProfileId={activeProfileId}
            onSubmit={handleGenerateBid}
            isSubmitting={streaming}
          />
        )}
      </div>

      <ProfileModal
        open={profileModalOpen}
        profile={editingProfile}
        onClose={() => setProfileModalOpen(false)}
        onSave={(saved) => {
          setProfiles((prev) =>
            editingProfile
              ? prev.map((p) => (p.id === saved.id ? saved : p))
              : [...prev, saved],
          );
          if (!editingProfile) setActiveProfileId(saved.id);
          setProfileModalOpen(false);
        }}
        onDelete={(id) => {
          setProfiles((prev) => prev.filter((p) => p.id !== id));
          if (activeProfileId === id) {
            const remaining = profiles.filter((p) => p.id !== id);
            setActiveProfileId(remaining[0]?.id ?? null);
          }
          setProfileModalOpen(false);
        }}
      />

      <ProjectsModal
        open={projectsModalOpen}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onClose={() => setProjectsModalOpen(false)}
      />

      <PromptsModal
        open={promptsModalOpen}
        onClose={() => setPromptsModalOpen(false)}
      />
    </div>
  );
}
