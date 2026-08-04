import { Link } from "wouter";
import {
  AppWindow,
  BadgeCheck,
  BriefcaseBusiness,
  ClipboardCheck,
  DoorOpen,
  FolderKanban,
  Network,
  ShieldCheck,
  Smartphone,
  Zap,
  type LucideIcon,
} from "lucide-react";

type InternalDockItem = {
  label: string;
  kind: "internal";
  href: string;
  icon: LucideIcon;
};

type StaticDockItem = {
  label: string;
  kind: "static";
  path: string;
  icon: LucideIcon;
};

type ActiveDockItem = {
  label: string;
  kind: "active";
  icon: LucideIcon;
};

type DockItem = InternalDockItem | StaticDockItem | ActiveDockItem;

const base = import.meta.env.BASE_URL;

const items: DockItem[] = [
  { label: "Tree", kind: "active", icon: Network },
  { label: "Work Mode", kind: "internal", href: "/first-run", icon: Smartphone },
  { label: "Projects", kind: "internal", href: "/projects", icon: FolderKanban },
  { label: "Trades", kind: "internal", href: "/trades", icon: BriefcaseBusiness },
  { label: "DoorFlow", kind: "static", path: "doorflow-demo/", icon: DoorOpen },
  { label: "Fire Register", kind: "static", path: "fire-door-register-demo/", icon: ClipboardCheck },
  { label: "Electrical", kind: "static", path: "electrical-commissioning/", icon: Zap },
  { label: "InfoCard", kind: "internal", href: "/person-card-demo", icon: BadgeCheck },
  { label: "Work Wallet", kind: "internal", href: "/safety-connector", icon: ShieldCheck },
  { label: "Apps", kind: "internal", href: "/external-tools", icon: AppWindow },
];

const itemClass =
  "group flex min-w-[68px] shrink-0 flex-col items-center gap-1 rounded-2xl border px-2 py-2 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

function DockIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-slate-300 transition-colors group-hover:border-cyan-300/30 group-hover:bg-cyan-300/10 group-hover:text-cyan-100">
      <Icon className="h-4.5 w-4.5" />
    </span>
  );
}

export function RelationshipTreeDock() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] px-2 pb-[calc(8px+env(safe-area-inset-bottom))] md:px-4 md:pb-4">
      <nav
        aria-label="Nexus functions"
        className="pointer-events-auto mx-auto flex w-full max-w-[920px] items-center gap-1 overflow-x-auto rounded-[22px] border border-white/10 bg-[#07101d]/94 p-1.5 shadow-[0_22px_70px_rgba(0,0,0,.55)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const Icon = item.icon;

          if (item.kind === "active") {
            return (
              <div
                key={item.label}
                aria-current="page"
                className={`${itemClass} border-cyan-300/35 bg-cyan-300/10 text-cyan-100`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/15 text-cyan-100 shadow-[0_0_22px_rgba(103,232,249,.12)]">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span>{item.label}</span>
              </div>
            );
          }

          if (item.kind === "static") {
            return (
              <a
                key={item.label}
                href={`${base}${item.path}`}
                className={`${itemClass} border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-100`}
              >
                <DockIcon icon={Icon} />
                <span>{item.label}</span>
              </a>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`${itemClass} border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-100`}
            >
              <DockIcon icon={Icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
