import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Clock, CircleSlash2, HelpCircle, type LucideIcon } from "lucide-react";
import { PEOPLE } from "@/demo/data";

/**
 * Self-reported availability for the demo workspace.
 *
 * Each person controls their own status (available / busy / unavailable).
 * "unknown" is never stored — it is derived by the failsafe when a person's
 * last activity goes stale, so the board reflects real behaviour instead of a
 * forced, possibly out-of-date self-report.
 *
 * State is persisted to localStorage so changes survive a refresh. There is no
 * backend for people in this investor demo, so this is deliberately client-side.
 */

export type Availability = "available" | "busy" | "unavailable" | "unknown";
export type AvailabilitySource = "self" | "manager";

/** Statuses a person (or a manager) can actually set. "unknown" is derived. */
export type ReportedStatus = Exclude<Availability, "unknown">;

export const REPORTABLE: readonly ReportedStatus[] = ["available", "busy", "unavailable"];

export interface AvailabilityRecord {
  status: ReportedStatus;
  setBy: AvailabilitySource;
  /** ms epoch — when the status value last changed. */
  updatedAt: number;
  /** ms epoch — last activity from this person (a status change counts). */
  lastActivityAt: number;
}

/**
 * After this much inactivity a person's status is shown as "unknown": the
 * system stops trusting a stale self-report rather than forcing an update.
 */
export const STALE_MS = 12 * 60 * 60 * 1000; // 12 hours

const STORAGE_KEY = "nosmo:availability:v1";

export const STATUS_META: Record<
  Availability,
  { label: string; Icon: LucideIcon; badge: string; dot: string }
> = {
  available: {
    label: "Available",
    Icon: CheckCircle2,
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  busy: {
    label: "Busy",
    Icon: Clock,
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400",
  },
  unavailable: {
    label: "Unavailable",
    Icon: CircleSlash2,
    badge: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    dot: "bg-rose-400",
  },
  unknown: {
    label: "Unknown",
    Icon: HelpCircle,
    badge: "bg-slate-500/10 text-slate-400 border-slate-500/30",
    dot: "bg-slate-400",
  },
};

type RecordMap = Record<string, AvailabilityRecord>;

function buildSeed(): RecordMap {
  const t = Date.now();
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  // Deterministic starting point with real variety: available / busy /
  // unavailable, plus one deliberately stale person (p2) to show the failsafe
  // surfacing "unknown" without waiting 12h.
  const seed: Record<string, { status: ReportedStatus; ago: number }> = {
    p1: { status: "available", ago: 5 * min },
    p2: { status: "busy", ago: 2 * day },
    p3: { status: "available", ago: 3 * hr },
    p4: { status: "unavailable", ago: 90 * min },
    p5: { status: "busy", ago: 25 * min },
    p6: { status: "available", ago: 70 * min },
    p7: { status: "busy", ago: 4 * hr },
    p8: { status: "available", ago: 6 * hr },
    p9: { status: "unavailable", ago: 8 * hr },
  };
  const out: RecordMap = {};
  for (const p of PEOPLE) {
    const s = seed[p.id] ?? { status: "available" as ReportedStatus, ago: 30 * min };
    out[p.id] = {
      status: s.status,
      setBy: "self",
      updatedAt: t - s.ago,
      lastActivityAt: t - s.ago,
    };
  }
  return out;
}

/** Coerce arbitrary parsed JSON into valid records, dropping anything malformed. */
function normalize(raw: unknown): RecordMap {
  const out: RecordMap = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const r = v as Record<string, unknown>;
    const status = r.status;
    if (status !== "available" && status !== "busy" && status !== "unavailable") continue;
    const setBy = r.setBy === "manager" ? "manager" : "self";
    const updatedAt = typeof r.updatedAt === "number" ? r.updatedAt : Date.now();
    const lastActivityAt = typeof r.lastActivityAt === "number" ? r.lastActivityAt : updatedAt;
    out[id] = { status, setBy, updatedAt, lastActivityAt };
  }
  return out;
}

function loadRecords(): RecordMap {
  if (typeof window === "undefined") return buildSeed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildSeed();
    const stored = normalize(JSON.parse(raw));
    // Merge seed defaults so any person without a stored record still has one.
    return { ...buildSeed(), ...stored };
  } catch {
    return buildSeed();
  }
}

interface AvailabilityContextValue {
  managerMode: boolean;
  setManagerMode: (v: boolean) => void;
  getRecord: (personId: string) => AvailabilityRecord | undefined;
  /** Status after applying the inactivity failsafe. */
  getEffective: (personId: string) => Availability;
  /** Set a status; recorded as manager-set when manager mode is on. */
  setStatus: (personId: string, status: ReportedStatus) => void;
  /** Ticking clock (ms) so staleness + relative times re-render over time. */
  now: number;
}

const AvailabilityContext = createContext<AvailabilityContextValue | null>(null);

export function AvailabilityProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<RecordMap>(() => loadRecords());
  const [managerMode, setManagerMode] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // ignore quota / privacy-mode failures — demo still works in-memory.
    }
  }, [records]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const value = useMemo<AvailabilityContextValue>(() => {
    const getRecord = (personId: string) => records[personId];
    const getEffective = (personId: string): Availability => {
      const r = records[personId];
      if (!r) return "unknown";
      if (now - r.lastActivityAt > STALE_MS) return "unknown";
      return r.status;
    };
    const setStatus = (personId: string, status: ReportedStatus) => {
      const ts = Date.now();
      setRecords((prev) => ({
        ...prev,
        [personId]: {
          status,
          setBy: managerMode ? "manager" : "self",
          updatedAt: ts,
          lastActivityAt: ts,
        },
      }));
      setNow(ts);
    };
    return { managerMode, setManagerMode, getRecord, getEffective, setStatus, now };
  }, [records, managerMode, now]);

  return <AvailabilityContext.Provider value={value}>{children}</AvailabilityContext.Provider>;
}

export function useAvailability() {
  const ctx = useContext(AvailabilityContext);
  if (!ctx) throw new Error("useAvailability must be used within an AvailabilityProvider");
  return ctx;
}
