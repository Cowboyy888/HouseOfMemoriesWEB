"use client";

import { ArrowUpRight, Loader2, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { ChatMessage } from "@drivehub/contracts";
import { Button } from "@/components/ui/button";
import { useChatMutation } from "@/features/ai/hooks";

const starterPrompts = [
  "What cars are available today?",
  "Can I rent a vehicle for a weekend?",
  "What payment methods do you accept?",
];

export function AiAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I can help with available cars, rental policies, payments, and booking options.",
    },
  ]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const chatMutation = useChatMutation();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending) {
      return;
    }

    const nextUserMessage: ChatMessage = { role: "user", content: trimmed };
    const requestMessages = [...messages, nextUserMessage];

    setMessages((current) => [...current, nextUserMessage]);
    setInput("");
    setError(null);

    try {
      const data = await chatMutation.mutateAsync(requestMessages);
      setMessages((current) => [...current, { role: "assistant", content: data.reply || "I’m not sure how to answer that yet." }]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The assistant could not answer right now.");
    }
  }

  return (
    <section className="mt-10 w-full rounded-3xl border bg-background/80 p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Ask DriveHub</h2>
          <p className="text-sm text-muted-foreground">A quick guide for fleet questions, policies, and next steps.</p>
        </div>
      </div>

      <div className="mt-5 space-y-3 rounded-2xl border bg-muted/30 p-3">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`rounded-xl px-3 py-2 text-sm ${message.role === "assistant" ? "bg-background" : "bg-primary/10 text-primary"}`}>
            <p className="font-medium">{message.role === "assistant" ? "DriveHub" : "You"}</p>
            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{message.content}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {starterPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => setInput(prompt)}
            className="rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <label className="sr-only" htmlFor="ai-assistant-input">
          Ask a question
        </label>
        <textarea
          id="ai-assistant-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about available cars, booking terms, or payments..."
          className="min-h-24 w-full rounded-2xl border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{error ?? "Responses are grounded in the current catalog and policies."}</p>
          <Button type="submit" disabled={chatMutation.isPending || !input.trim()}>
            {chatMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Thinking
              </>
            ) : (
              <>
                Ask
                <ArrowUpRight className="ml-2 size-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}
