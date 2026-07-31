import { useMemo, useState } from "react";
import {
  ArrowRight,
  Clock3,
  ExternalLink,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  ShieldCheck,
  UserRound,
  Video,
  type LucideIcon,
} from "lucide-react";
import { CommunicationStrip } from "@/components/communication-strip";

type ChannelKey = "phone" | "sms" | "whatsapp" | "gmail" | "teams";

type CommunicationEvent = {
  eventType: "ACTION_OPENED";
  channel: ChannelKey;
  personId: string;
  occurredAt: string;
  sourceObject: string;
};

type ChannelAction = {
  key: ChannelKey;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  web: boolean;
};

const contact = {
  personId: "PERSON-DEMO-001",
  name: "Alex Morgan",
  role: "Site Supervisor",
  company: "Northfield Building Services",
  phone: "+447700900321",
  email: "alex.morgan@example.com",
};

const sourceObject = {
  project: "Halifax Demonstrator",
  object: "Door ID.0.5.27",
  location: "Level 0 / Corridor 5",
  action: "Confirm closer availability and installation time",
};

const eventKey = "nosmo.communicationHub.demo.events.v2";

function readEvents(): CommunicationEvent[] {
  try {
    const value = window.localStorage.getItem(eventKey);
    return value ? (JSON.parse(value) as CommunicationEvent[]) : [];
  } catch {
    return [];
  }
}

export default function CommunicationHub() {
  const initialChannel = new URLSearchParams(window.location.search).get("channel") as ChannelKey | null;
  const [selectedChannel, setSelectedChannel] = useState<ChannelKey>(initialChannel ?? "whatsapp");
  const [contextPacket, setContextPacket] = useState(
    `Project: ${sourceObject.project}\nObject: ${sourceObject.object}\nLocation: ${sourceObject.location}\nRequested action: ${sourceObject.action}`,
  );
  const [events, setEvents] = useState<CommunicationEvent[]>(readEvents);

  const encodedSubject = encodeURIComponent(`NOSMO Nexus — ${sourceObject.object}`);
  const encodedBody = encodeURIComponent(contextPacket);
  const phoneDigits = contact.phone.replace(/\D/g, "");

  const actions = useMemo<ChannelAction[]>(
    () => [
      {
        key: "phone",
        label: "Phone",
        description: "Open the device dialler for the authorised work number.",
        icon: Phone,
        href: `tel:${contact.phone}`,
        web: false,
      },
      {
        key: "sms",
        label: "SMS",
        description: "Open a text message with the editable Nexus context packet.",
        icon: MessageSquare,
        href: `sms:${contact.phone}?body=${encodedBody}`,
        web: false,
      },
      {
        key: "whatsapp",
        label: "WhatsApp",
        description: "Open WhatsApp compose with the selected person and project context.",
        icon: MessageCircle,
        href: `https://wa.me/${phoneDigits}?text=${encodedBody}`,
        web: true,
      },
      {
        key: "gmail",
        label: "Gmail",
        description: "Open Gmail compose with recipient, subject and context packet.",
        icon: Mail,
        href: `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contact.email)}&su=${encodedSubject}&body=${encodedBody}`,
        web: true,
      },
      {
        key: "teams",
        label: "Microsoft Teams",
        description: "Open a Teams chat draft for the selected Person Card.",
        icon: Video,
        href: `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(contact.email)}&message=${encodedBody}`,
        web: true,
      },
    ],
    [encodedBody, encodedSubject, phoneDigits],
  );

  const currentAction = actions.find((action) => action.key === selectedChannel) ?? actions[0];

  function launch(action: ChannelAction) {
    const event: CommunicationEvent = {
      eventType: "ACTION_OPENED",
      channel: action.key,
      personId: contact.personId,
      occurredAt: new Date().toISOString(),
      sourceObject: sourceObject.object,
    };
    const nextEvents = [event, ...events].slice(0, 12);
    setEvents(nextEvents);
    window.localStorage.setItem(eventKey, JSON.stringify(nextEvents));

    if (action.web) {
      window.open(action.href, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = action.href;
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="rounded-2xl border border-primary/20 bg-card/75 p-5 shadow-2xl backdrop-blur-xl md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/35 bg-primary/15 text-primary">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Person Card layer</p>
                <h1 className="text-2xl font-bold tracking-tight md:text-4xl">Communication Hub</h1>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground md:text-base">
              One compact communication surface for phone, SMS, WhatsApp, Gmail and Teams. Actions open the selected external channel with Nexus project context.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <span className="rounded-full border border-cyan-400/35 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">DEMO</span>
            <CommunicationStrip />
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-2xl border border-border bg-card/70 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
              <UserRound className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-primary">Selected Person Card</p>
              <h2 className="mt-1 text-xl font-semibold">{contact.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{contact.role} · {contact.company}</p>
            </div>
          </div>

          <div className="mt-5 space-y-2 text-sm">
            <div className="rounded-xl border border-border bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">Work phone</p>
              <p className="mt-1 font-medium">{contact.phone}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">Work email</p>
              <p className="mt-1 font-medium">{contact.email}</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <ShieldCheck className="h-4 w-4" /> Endpoint visibility: project team
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Synthetic contact data. A production version must resolve authorised endpoints from Person Card permissions.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card/70 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-primary">Communication action</p>
              <h2 className="mt-1 text-xl font-semibold">Choose a channel</h2>
            </div>
            <a
              href="https://nosmotechnology.co.uk/communication-hub-demo.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/45 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Open original demo <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            {actions.map((action) => {
              const Icon = action.icon;
              const active = action.key === selectedChannel;
              return (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => setSelectedChannel(action.key)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-colors ${
                    active
                      ? "border-primary/45 bg-primary/15 text-primary"
                      : "border-border bg-background/35 text-muted-foreground hover:border-primary/25 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {action.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <currentAction.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{currentAction.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{currentAction.description}</p>
              </div>
            </div>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground" htmlFor="context-packet">
              Editable context packet
            </label>
            <textarea
              id="context-packet"
              value={contextPacket}
              onChange={(event) => setContextPacket(event.target.value)}
              rows={6}
              className="mt-2 w-full rounded-xl border border-border bg-background/55 p-3 text-sm leading-relaxed outline-none transition-colors focus:border-primary/45"
            />

            <button
              type="button"
              onClick={() => launch(currentAction)}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/15 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/25"
            >
              Open {currentAction.label} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card/55 p-5">
        <div className="flex items-center gap-3">
          <Clock3 className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold">Local communication timeline</h2>
            <p className="mt-1 text-xs text-muted-foreground">The demo records ACTION_OPENED only. It does not claim SENT, DELIVERED, READ or REPLIED.</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No communication action has been opened in this browser.</div>
          ) : (
            events.map((event, index) => (
              <div key={`${event.occurredAt}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/35 p-3 text-sm">
                <div>
                  <p className="font-semibold">ACTION_OPENED · {event.channel.toUpperCase()}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{event.sourceObject} · {event.personId}</p>
                </div>
                <time className="text-xs text-muted-foreground">{new Date(event.occurredAt).toLocaleString()}</time>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
