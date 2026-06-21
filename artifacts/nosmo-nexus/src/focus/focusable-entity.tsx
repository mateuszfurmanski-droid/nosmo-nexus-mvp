import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useFocus } from "./focus-context";
import type { FocusTarget } from "./focus-types";

interface FocusableEntityProps {
  target: FocusTarget;
  children: ReactNode;
  className?: string;
  title?: string;
  ariaLabel?: string;
  testId?: string;
  /** Fired after the entity is opened — e.g. to close a panel the trigger lives in. */
  onActivate?: () => void;
}

/**
 * Wraps any content so clicking (or Enter/Space) opens that entity in the focus
 * overlay. Rendered as a role="button" element so it can nest inside other
 * focusable cards without producing invalid nested <button> DOM.
 */
export function FocusableEntity({
  target,
  children,
  className,
  title,
  ariaLabel,
  testId,
  onActivate,
}: FocusableEntityProps) {
  const { openFocus } = useFocus();

  const activate = () => {
    openFocus(target);
    onActivate?.();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      activate();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      title={title}
      aria-label={ariaLabel}
      data-testid={testId}
      onClick={(e) => {
        e.stopPropagation();
        activate();
      }}
      onKeyDown={onKeyDown}
      className={cn("cursor-pointer outline-none", className)}
    >
      {children}
    </div>
  );
}
