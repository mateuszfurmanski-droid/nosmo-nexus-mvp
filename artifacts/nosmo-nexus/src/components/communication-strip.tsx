import { Link } from "wouter";
import { Mail, MessageCircle, MessageSquare, Phone, Video } from "lucide-react";

const channels = [
  { key: "phone", label: "Phone", icon: Phone },
  { key: "sms", label: "SMS", icon: MessageSquare },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "gmail", label: "Gmail", icon: Mail },
  { key: "teams", label: "Teams", icon: Video },
] as const;

export function CommunicationStrip({ floating = false }: { floating?: boolean }) {
  return (
    <div
      className={
        floating
          ? "flex items-center gap-1 rounded-2xl border border-primary/25 bg-background/92 p-1.5 shadow-2xl backdrop-blur-xl"
          : "flex items-center gap-1 rounded-xl border border-border bg-secondary/35 p-1"
      }
      aria-label="Person Card communication channels"
      data-testid="communication-strip"
    >
      {channels.map((channel) => {
        const Icon = channel.icon;
        return (
          <Link
            key={channel.key}
            href={`/communication-hub?channel=${channel.key}`}
            title={channel.label}
            aria-label={`Open ${channel.label} communication action`}
            data-testid={`communication-${channel.key}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
          >
            <Icon className="h-4 w-4" />
          </Link>
        );
      })}
    </div>
  );
}
