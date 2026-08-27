import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { GripHorizontal, Minus, Square } from "lucide-react";

type Point = { x: number; y: number };
type DragState = {
  pointerId: number;
  clientX: number;
  clientY: number;
  originX: number;
  originY: number;
};

let topWindowZ = 2200;

function clampPosition(point: Point, width: number, height: number): Point {
  if (typeof window === "undefined") return point;
  const margin = 8;
  const visibleTitle = 56;
  const maxX = Math.max(margin, window.innerWidth - visibleTitle);
  const maxY = Math.max(margin, window.innerHeight - visibleTitle);
  return {
    x: Math.min(maxX, Math.max(margin - Math.max(0, width - visibleTitle), point.x)),
    y: Math.min(maxY, Math.max(margin, point.y)),
  };
}

export function NexusFloatingWindow({
  id,
  title,
  children,
  defaultPosition,
  widthClass = "w-[min(420px,calc(100vw-16px))]",
  heightClass = "max-h-[72dvh]",
  onClose,
  defaultMinimized = false,
}: {
  id: string;
  title: string;
  children: ReactNode;
  defaultPosition: Point;
  widthClass?: string;
  heightClass?: string;
  onClose?: () => void;
  defaultMinimized?: boolean;
}) {
  const storageKey = `nosmo:nexus-window:${id}:position`;
  const [position, setPosition] = useState<Point>(() => {
    if (typeof window === "undefined") return defaultPosition;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as Point | null;
      return saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) ? saved : defaultPosition;
    } catch {
      return defaultPosition;
    }
  });
  const [minimized, setMinimized] = useState(defaultMinimized);
  const [zIndex, setZIndex] = useState(() => ++topWindowZ);
  const positionRef = useRef(position);
  positionRef.current = position;
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const bringToFront = () => setZIndex(++topWindowZ);

  const persist = (next: Point) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Position persistence is optional.
    }
  };

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button,input,textarea,select,a")) return;
    bringToFront();
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      originX: positionRef.current.x,
      originY: positionRef.current.y,
    };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* optional */ }
    event.preventDefault();
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = rootRef.current?.getBoundingClientRect();
    const next = clampPosition(
      {
        x: drag.originX + event.clientX - drag.clientX,
        y: drag.originY + event.clientY - drag.clientY,
      },
      rect?.width ?? 360,
      rect?.height ?? 100,
    );
    positionRef.current = next;
    setPosition(next);
    event.preventDefault();
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    persist(positionRef.current);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* optional */ }
  };

  useEffect(() => {
    const handleResize = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      setPosition((current) => clampPosition(current, rect?.width ?? 360, rect?.height ?? 100));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <section
      ref={rootRef}
      data-control
      data-nexus-floating-window={id}
      className={`fixed overflow-hidden rounded-2xl border border-cyan-300/25 bg-[#07131f]/96 text-slate-100 shadow-2xl backdrop-blur-xl ${widthClass}`}
      style={{ left: position.x, top: position.y, zIndex }}
      onPointerDown={bringToFront}
    >
      <div
        data-nexus-window-handle
        className="flex h-10 touch-none cursor-grab items-center gap-2 border-b border-slate-700/70 bg-slate-950/88 px-3 active:cursor-grabbing"
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <GripHorizontal className="h-4 w-4 text-cyan-300" />
        <strong className="min-w-0 flex-1 truncate text-[10px] font-black uppercase tracking-[.14em] text-cyan-100">
          {title}
        </strong>
        <button
          type="button"
          onClick={() => setMinimized((value) => !value)}
          className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label={minimized ? `Restore ${title}` : `Minimize ${title}`}
        >
          {minimized ? <Square className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
        </button>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-red-950 hover:text-red-200"
            aria-label={`Close ${title}`}
          >
            ×
          </button>
        ) : null}
      </div>
      {!minimized ? <div className={`overflow-auto ${heightClass}`}>{children}</div> : null}
    </section>
  );
}
