import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { focusKey, type FocusTarget } from "./focus-types";

interface FocusContextValue {
  stack: FocusTarget[];
  current: FocusTarget | null;
  depth: number;
  isOpen: boolean;
  openFocus: (target: FocusTarget) => void;
  back: () => void;
  close: () => void;
}

const FocusContext = createContext<FocusContextValue | null>(null);

export function FocusProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<FocusTarget[]>([]);

  const openFocus = useCallback((target: FocusTarget) => {
    setStack((prev) => {
      const top = prev[prev.length - 1];
      // Ignore re-opening the object already in focus.
      if (top && focusKey(top) === focusKey(target)) return prev;
      // If the target is already an ancestor in the stack, jump back to it
      // instead of appending — prevents A→B→A→B loops from growing the stack.
      const existingIdx = prev.findIndex((t) => focusKey(t) === focusKey(target));
      if (existingIdx >= 0) return prev.slice(0, existingIdx + 1);
      return [...prev, target];
    });
  }, []);

  const back = useCallback(() => {
    setStack((prev) => prev.slice(0, -1));
  }, []);

  const close = useCallback(() => {
    setStack([]);
  }, []);

  const value = useMemo<FocusContextValue>(() => {
    const current = stack.length > 0 ? stack[stack.length - 1] : null;
    return {
      stack,
      current,
      depth: stack.length,
      isOpen: stack.length > 0,
      openFocus,
      back,
      close,
    };
  }, [stack, openFocus, back, close]);

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be used within a FocusProvider");
  return ctx;
}
