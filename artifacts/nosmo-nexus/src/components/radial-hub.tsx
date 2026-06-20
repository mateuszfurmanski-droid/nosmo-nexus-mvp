import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, FolderKanban, Users, UserPlus, CheckSquare, Layers, Sparkles, Puzzle,
  Zap, Pause, Compass, Archive, ArrowLeft,
} from "lucide-react";

/**
 * RadialHub — the graphical, expandable "Sims-style" workspace menu.
 *
 * Geometry is fully data-driven (see `radialPosition` + the node config arrays),
 * so Phase 2 can add deeper nested rings purely by adding child configs —
 * no layout refactor required. The Projects node already demonstrates this by
 * expanding into a second ring of status circles.
 */

type Tint = { text: string; glow: string; from: string; dot: string };

type HubNode = {
  key: string;
  label: string;
  hint: string;
  icon: typeof FolderKanban;
  tint: Tint;
  kind: "route" | "ask" | "expand";
  to?: string;
  expand?: "projects";
};

// Literal class strings (kept whole so Tailwind's scanner emits them).
const TINTS = {
  cyan: { text: "text-primary", glow: "shadow-[0_0_30px_rgba(0,255,255,0.25)]", from: "from-primary/25", dot: "bg-primary" },
  violet: { text: "text-purple-300", glow: "shadow-[0_0_30px_rgba(192,132,252,0.28)]", from: "from-purple-500/25", dot: "bg-purple-400" },
  green: { text: "text-green-300", glow: "shadow-[0_0_30px_rgba(74,222,128,0.26)]", from: "from-green-500/25", dot: "bg-green-400" },
  amber: { text: "text-yellow-300", glow: "shadow-[0_0_30px_rgba(250,204,21,0.26)]", from: "from-yellow-500/25", dot: "bg-yellow-400" },
  blue: { text: "text-blue-300", glow: "shadow-[0_0_30px_rgba(96,165,250,0.26)]", from: "from-blue-500/25", dot: "bg-blue-400" },
  pink: { text: "text-pink-300", glow: "shadow-[0_0_30px_rgba(244,114,182,0.26)]", from: "from-pink-500/25", dot: "bg-pink-400" },
} as const;

const HUB_NODES: HubNode[] = [
  { key: "projects", label: "Projects", hint: "Grouped by status", icon: FolderKanban, tint: TINTS.cyan, kind: "expand", expand: "projects" },
  { key: "people", label: "People", hint: "Cards & contacts", icon: Users, tint: TINTS.violet, kind: "route", to: "/people" },
  { key: "card-maker", label: "Card Maker", hint: "AI prefill", icon: UserPlus, tint: TINTS.pink, kind: "route", to: "/card-maker" },
  { key: "tasks", label: "Tasks", hint: "Kanban board", icon: CheckSquare, tint: TINTS.green, kind: "route", to: "/tasks" },
  { key: "plans", label: "Plans", hint: "Drawings & PDFs", icon: Layers, tint: TINTS.blue, kind: "route", to: "/plans" },
  { key: "ask", label: "Ask Nexus", hint: "AI assistant", icon: Sparkles, tint: TINTS.cyan, kind: "ask" },
  { key: "integrations", label: "Integrations", hint: "Connectors", icon: Puzzle, tint: TINTS.amber, kind: "route", to: "/integrations" },
];

const PROJECT_NODES: HubNode[] = [
  { key: "Active", label: "Active", hint: "In progress", icon: Zap, tint: TINTS.green, kind: "route", to: "/projects?status=Active" },
  { key: "OnHold", label: "On Hold", hint: "Paused", icon: Pause, tint: TINTS.amber, kind: "route", to: "/projects?status=On%20Hold" },
  { key: "Planning", label: "Planning", hint: "Scoping", icon: Compass, tint: TINTS.violet, kind: "route", to: "/projects?status=Planning" },
  { key: "Archived", label: "Archived", hint: "Completed", icon: Archive, tint: TINTS.blue, kind: "route", to: "/projects?status=Completed" },
];

function radialPosition(index: number, total: number, radius: number, startDeg = -90) {
  const deg = startDeg + (360 / total) * index;
  const rad = deg * (Math.PI / 180);
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius, deg };
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(el => el.offsetParent !== null);
}

export function RadialHub({
  open,
  onOpenChange,
  onOpenAskNexus,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOpenAskNexus: () => void;
}) {
  const [, navigate] = useLocation();
  const [ring, setRing] = useState<"main" | "projects">("main");
  const [geo, setGeo] = useState({ radius: 190, node: 80 });
  const containerRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function calc() {
      const m = Math.min(window.innerWidth, window.innerHeight);
      const radius = Math.max(108, Math.min(200, m * 0.3));
      const node = m < 600 ? 60 : 80;
      setGeo({ radius, node });
    }
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  useEffect(() => {
    if (!open) return;
    setRing("main");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    openerRef.current = (document.activeElement as HTMLElement) ?? null;
    const id = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      (getFocusable(container)[0] ?? container).focus();
    });
    return () => {
      window.cancelAnimationFrame(id);
      openerRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setRing(r => {
          if (r === "projects") return "main";
          onOpenChange(false);
          return r;
        });
        return;
      }
      if (e.key === "Tab") {
        const container = containerRef.current;
        if (!container) return;
        const focusable = getFocusable(container);
        if (focusable.length === 0) {
          e.preventDefault();
          container.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && (active === first || !container.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (active === last || !container.contains(active))) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const nodes = ring === "projects" ? PROJECT_NODES : HUB_NODES;
  const NODE = geo.node;

  function handleNode(node: HubNode) {
    if (node.kind === "expand") {
      setRing("projects");
      return;
    }
    if (node.kind === "ask") {
      onOpenChange(false);
      onOpenAskNexus();
      return;
    }
    if (node.to) {
      onOpenChange(false);
      navigate(node.to);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={containerRef}
          tabIndex={-1}
          className="fixed inset-0 z-[60] flex items-center justify-center outline-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="NOSMO workspace hub"
          data-testid="radial-hub"
        >
          <div
            className="absolute inset-0 bg-background/85 backdrop-blur-xl"
            onClick={() => onOpenChange(false)}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.08]"
            style={{ backgroundImage: "radial-gradient(circle at 50% 50%, var(--primary, #22d3ee) 0, transparent 55%)" }}
          />

          <div className="absolute top-0 inset-x-0 h-16 flex items-center justify-between px-5 md:px-8 z-10">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold tracking-tight text-foreground">NOSMO Nexus™</span>
              <span className="text-muted-foreground hidden sm:inline">· Workspace Hub</span>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close hub"
              data-testid="button-close-hub"
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Radial stage — a 1px anchor point centred on screen. */}
          <div className="relative z-[1]" style={{ width: 1, height: 1 }}>
            <motion.div
              key={ring + "-orbit"}
              className="absolute rounded-full border border-dashed border-primary/15"
              style={{ width: geo.radius * 2, height: geo.radius * 2, left: -geo.radius, top: -geo.radius }}
              initial={{ opacity: 0, scale: 0.85, rotate: -15 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            />

            {nodes.map((n, i) => {
              const { deg } = radialPosition(i, nodes.length, geo.radius);
              return (
                <motion.div
                  key={ring + "-" + n.key + "-line"}
                  className="absolute h-px origin-left bg-gradient-to-r from-primary/0 via-primary/25 to-primary/0"
                  style={{ width: geo.radius, left: 0, top: 0, rotate: `${deg}deg` }}
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: 0.05 + i * 0.04, duration: 0.3 }}
                />
              );
            })}

            <motion.button
              type="button"
              onClick={() => (ring === "projects" ? setRing("main") : onOpenChange(false))}
              aria-label={ring === "projects" ? "Back to hub" : "Close hub"}
              data-testid="button-hub-core"
              className="absolute flex flex-col items-center justify-center rounded-full bg-card border border-primary/30 text-center shadow-[0_0_40px_rgba(0,255,255,0.18)]"
              style={{ width: NODE + 8, height: NODE + 8, left: -(NODE + 8) / 2, top: -(NODE + 8) / 2 }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 180, damping: 16 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
            >
              <motion.span
                className="absolute inset-0 rounded-full bg-primary/10"
                animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              />
              {ring === "projects" ? (
                <ArrowLeft className="w-5 h-5 text-primary relative z-10" />
              ) : (
                <span className="text-primary font-extrabold text-xl relative z-10">N</span>
              )}
              <span className="text-[10px] text-muted-foreground mt-0.5 relative z-10">
                {ring === "projects" ? "Back" : "Nexus"}
              </span>
            </motion.button>

            <AnimatePresence>
              {nodes.map((node, i) => {
                const { x, y } = radialPosition(i, nodes.length, geo.radius);
                const Icon = node.icon;
                return (
                  <motion.div
                    key={ring + "-" + node.key}
                    className="absolute"
                    style={{ left: 0, top: 0, marginLeft: -NODE / 2, marginTop: -NODE / 2 }}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                    animate={{ x, y, scale: 1, opacity: 1 }}
                    exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 160, damping: 18, delay: 0.04 * i }}
                  >
                    <motion.button
                      type="button"
                      onClick={() => handleNode(node)}
                      data-testid={`hub-node-${node.key}`}
                      className="group flex flex-col items-center"
                      style={{ width: NODE }}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.94 }}
                    >
                      <span
                        className={`relative flex items-center justify-center rounded-full bg-card border border-border transition-colors group-hover:border-primary/50 ${node.tint.glow}`}
                        style={{ width: NODE, height: NODE }}
                      >
                        <span className={`absolute inset-0 rounded-full bg-gradient-to-b ${node.tint.from} to-transparent opacity-70`} />
                        <Icon className={`relative z-10 ${node.tint.text}`} style={{ width: NODE * 0.36, height: NODE * 0.36 }} />
                      </span>
                      <span className="mt-2 text-xs font-semibold text-foreground whitespace-nowrap">{node.label}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:block">{node.hint}</span>
                    </motion.button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="absolute bottom-5 inset-x-0 text-center text-[11px] text-muted-foreground z-10">
            {ring === "projects" ? "Pick a status group · Esc to go back" : "Tap a node to jump in · Esc to close"}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
