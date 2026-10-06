import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolPart,
} from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import mark from "@/assets/concierge-mark.png";

interface HotelChatProps {
  api: string;
  storageKey: string;
  title: string;
  subtitle: string;
  placeholder: string;
  suggestions: string[];
  className?: string;
}

function loadMessages(key: string): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as UIMessage[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Reusable AI chat surface, saved in this browser (one ongoing conversation). */
export function HotelChat({
  api,
  storageKey,
  title,
  subtitle,
  placeholder,
  suggestions,
  className,
}: HotelChatProps) {
  const initial = useMemo(() => loadMessages(storageKey), [storageKey]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api,
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [api],
  );

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    id: storageKey,
    messages: initial,
    transport,
    onError: (err) => {
      const msg = err.message || "";
      if (msg.includes("402")) toast.error("AI credits are used up for this workspace.");
      else if (msg.includes("429")) toast.error("The assistant is busy — try again in a moment.");
      else if (msg.includes("401")) toast.error("Please sign in again.");
      else toast.error("The assistant could not reply. Please try again.");
    },
  });

  useEffect(() => {
    if (status === "ready" || status === "error") {
      window.localStorage.setItem(storageKey, JSON.stringify(messages));
      textareaRef.current?.focus();
    }
  }, [messages, status, storageKey]);

  const busy = status === "submitted" || status === "streaming";

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    void sendMessage({ text: t });
  };

  const reset = () => {
    setMessages([]);
    window.localStorage.removeItem(storageKey);
    textareaRef.current?.focus();
  };

  return (
    <div className={`flex h-full min-h-0 flex-col rounded-xl border bg-card ${className ?? ""}`}>
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <img src={mark} alt="" className="h-9 w-9 rounded-lg bg-muted p-1" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> New chat
          </Button>
        )}
      </div>

      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<img src={mark} alt="" className="h-16 w-16" />}
              title={title}
              description={subtitle}
            >
              <div className="flex flex-col items-center gap-3">
                <img src={mark} alt="" className="h-16 w-16" />
                <p className="text-sm text-muted-foreground">{subtitle}</p>
                <div className="flex max-w-lg flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <Button key={s} variant="outline" size="sm" onClick={() => send(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent>
                  {m.parts.map((part, i) => {
                    if (part.type === "text") {
                      return m.role === "assistant" ? (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      ) : (
                        <p key={i} className="whitespace-pre-wrap">
                          {part.text}
                        </p>
                      );
                    }
                    if (part.type.startsWith("tool-")) {
                      const tp = part as ToolPart;
                      return (
                        <Tool key={i} defaultOpen={false}>
                          <ToolHeader
                            type={tp.type as `tool-${string}`}
                            state={tp.state}
                            title={tp.type.replace("tool-", "").replaceAll("_", " ")}
                          />
                          <ToolContent>
                            <ToolInput input={tp.input} />
                            <ToolOutput output={tp.output} errorText={tp.errorText} />
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-3">
        <PromptInput onSubmit={(msg) => send(msg.text ?? "")}>
          <PromptInputTextarea ref={textareaRef} placeholder={placeholder} autoFocus />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} disabled={status === "ready" ? false : !busy} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
