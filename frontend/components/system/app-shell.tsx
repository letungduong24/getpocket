import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* AppShell                                                            */
/* ------------------------------------------------------------------ */
/**
 * Outermost surface. Renders the full-bleed maroon canvas.
 *
 * Use this once at the page (or layout) level. It is intentionally
 * edge-to-edge — children compose the rail + main area via the
 * DashboardFrame layout slots (leftRail + main).
 */
export interface AppShellProps extends React.ComponentProps<"div"> {
  children: React.ReactNode;
}

export function AppShell({ className, children, ...props }: AppShellProps) {
  return (
    <div
      data-slot="app-shell"
      className={cn(
        "relative min-h-screen w-full bg-background text-foreground font-sans animate-page-fade",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DashboardFrame                                                      */
/* ------------------------------------------------------------------ */
/**
 * The two-column layout: a raised rail on the left and the main content
 * area on the right. The whole frame spans the full viewport.
 */
export interface DashboardFrameProps {
  leftRail?: React.ReactNode;
  main: React.ReactNode;
  className?: string;
}

export function DashboardFrame({
  leftRail,
  main,
  className,
}: DashboardFrameProps) {
  return (
    <div
      data-slot="dashboard-frame"
      className={cn("flex min-h-screen w-full flex-col lg:flex-row", className)}
    >
      {leftRail ? (
        <aside
          data-slot="left-rail"
          className="shrink-0 rail-raised lg:w-[var(--rail-left-width)] lg:sticky lg:top-0 lg:h-screen"
        >
          {leftRail}
        </aside>
      ) : null}

      <main
        data-slot="dashboard-main"
        className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8"
      >
        {main}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LeftRail                                                            */
/* ------------------------------------------------------------------ */
/**
 * Sidebar content. Renders horizontally on mobile (topbar) and
 * vertically on `lg` (left rail). The visual "raised block" effect
 * comes from the DashboardFrame wrapper.
 */
export interface LeftRailProps extends React.ComponentProps<"nav"> {
  brand?: React.ReactNode;
  top?: React.ReactNode;
  bottom?: React.ReactNode;
}

export function LeftRail({
  brand,
  top,
  bottom,
  className,
  ...props
}: LeftRailProps) {
  return (
    <nav
      data-slot="left-rail-inner"
      className={cn(
        "flex w-full items-center gap-1.5 px-3 py-3 overflow-x-auto scrollbar-thin",
        "lg:h-screen lg:flex-col lg:items-center lg:gap-1.5 lg:overflow-visible lg:px-2 lg:py-6",
        className
      )}
      {...props}
    >
      {brand ? (
        <div className="mb-0 flex shrink-0 items-center justify-center lg:mb-6">
          {brand}
        </div>
      ) : null}
      <div className="flex shrink-0 flex-row items-center gap-1.5 lg:flex-1 lg:flex-col lg:items-center lg:gap-1.5">
        {top}
      </div>
      {bottom ? (
        <div className="ml-auto flex shrink-0 flex-row items-center gap-1.5 lg:ml-0 lg:mt-6 lg:flex-col lg:items-center lg:gap-2">
          {bottom}
        </div>
      ) : null}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* NavIcon                                                             */
/* ------------------------------------------------------------------ */
export interface NavIconProps {
  href?: string;
  active?: boolean;
  label: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
}

export function NavIcon({
  href,
  active = false,
  label,
  icon,
  badge,
  onClick,
}: NavIconProps) {
  const baseClass = cn(
    "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white/60 transition-all",
    "hover:bg-white/[0.06] hover:text-white",
    active && "bg-white/[0.08] text-white ring-1 ring-white/10",
    "lg:h-12 lg:w-12"
  );

  const content = (
    <>
      {icon}
      {badge ? (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
          {badge}
        </span>
      ) : null}
      <span className="sr-only">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={baseClass} aria-current={active ? "page" : undefined}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={baseClass}
      aria-current={active ? "page" : undefined}
    >
      {content}
    </button>
  );
}
