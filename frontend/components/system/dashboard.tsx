import * as React from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pill, IconBadge, SectionHeader } from "@/components/system/primitives";

/* ------------------------------------------------------------------ */
/* HeroCard                                                            */
/* ------------------------------------------------------------------ */
export interface HeroCardBadge {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export interface HeroCardProps {
  title: string;
  description?: string;
  badges?: HeroCardBadge[];
  illustration?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}

export function HeroCard({
  title,
  description,
  badges,
  illustration,
  meta,
  className,
}: HeroCardProps) {
  return (
    <article
      data-slot="hero-card"
      className={cn(
        "relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#ee7c8a] via-[#e26a82] to-[#a23a8a] p-6 text-white accent-glow min-h-[260px] flex flex-col justify-between",
        className
      )}
    >
      <div className="relative z-10 max-w-[55%] space-y-4">
        {badges?.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {badges.map((b, i) => (
              <IconBadge
                key={i}
                icon={b.icon}
                label={b.label}
                active={b.active}
                onClick={b.onClick}
              />
            ))}
          </div>
        ) : null}

        <h2 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {title}
        </h2>

        {description ? (
          <p className="text-sm leading-relaxed text-white/85 sm:text-base">
            {description}
          </p>
        ) : null}

        {meta ? <div className="pt-2">{meta}</div> : null}
      </div>

      {illustration ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-0 w-2/3 overflow-hidden">
          {illustration}
        </div>
      ) : null}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* GameListItem (small list row used in right column of hero)          */
/* ------------------------------------------------------------------ */
export interface GameListItemProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  cover?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function GameListItem({
  title,
  subtitle,
  cover,
  trailing = <ChevronRight className="h-4 w-4 text-white/40" />,
  onClick,
  className,
}: GameListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-slot="game-list-item"
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl bg-white/[0.04] p-3 text-left ring-1 ring-white/[0.04] transition-all hover:bg-white/[0.08]",
        className
      )}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-accent/30 to-purple-500/30 text-white/70">
        {cover}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-white">{title}</div>
        {subtitle ? (
          <div className="truncate text-xs text-white/50">{subtitle}</div>
        ) : null}
      </div>
      <div className="shrink-0">{trailing}</div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* GameTile (medium tile used in "New Games" carousel)                */
/* ------------------------------------------------------------------ */
export interface GameTileProps {
  title: string;
  description?: string;
  cover?: React.ReactNode;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function GameTile({
  title,
  description,
  cover,
  badge,
  meta,
  onClick,
  className,
}: GameTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-slot="game-tile"
      className={cn(
        "group relative flex h-72 w-full flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br from-[#3a1520] to-[#1c0a0e] text-left ring-1 ring-white/[0.04] transition-all hover:ring-white/15",
        className
      )}
    >
      {cover ? (
        <div className="pointer-events-none absolute inset-0">
          {cover}
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      {badge ? (
        <div className="absolute top-3 left-3 z-10">{badge}</div>
      ) : null}
      <div className="relative z-10 space-y-1.5 p-4">
        <h3 className="font-display text-lg font-semibold leading-tight text-white">
          {title}
        </h3>
        {description ? (
          <p className="line-clamp-3 text-xs text-white/70">{description}</p>
        ) : null}
        {meta ? <div className="pt-1.5">{meta}</div> : null}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Carousel (horizontal scroll for GameTile list)                      */
/* ------------------------------------------------------------------ */
export interface CarouselProps extends React.ComponentProps<"div"> {
  gap?: "sm" | "md" | "lg";
}

export function Carousel({
  className,
  children,
  gap = "md",
  ...props
}: CarouselProps) {
  return (
    <div
      data-slot="carousel"
      className={cn(
        "relative -mx-2 overflow-x-auto px-2 scrollbar-thin",
        gap === "sm" && "space-x-3",
        gap === "md" && "space-x-4",
        gap === "lg" && "space-x-6",
        className
      )}
      {...props}
    >
      <div className="flex">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StatBlock (large stat with 3D blob visualization)                  */
/* ------------------------------------------------------------------ */
export interface StatBlockProps {
  totalLabel?: string;
  totalValue: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function StatBlock({
  totalLabel = "Total hours",
  totalValue,
  children,
  className,
}: StatBlockProps) {
  return (
    <div
      data-slot="stat-block"
      className={cn(
        "relative flex h-72 flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#2c0e15] to-[#1a070b] ring-1 ring-white/[0.06] surface-ring",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute h-56 w-56 blob-stat rounded-full"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute h-36 w-36 rounded-full bg-gradient-to-br from-accent to-purple-500 opacity-20 blur-3xl"
      />
      <div className="relative z-10 text-center">
        <p className="text-xs uppercase tracking-wider text-white/50">
          {totalLabel}
        </p>
        <p className="font-display text-4xl font-bold tracking-tight text-white">
          {totalValue}
        </p>
      </div>
      {children ? (
        <div className="absolute inset-x-0 bottom-0 z-10 p-4">{children}</div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StatTile (small KPI with icon and value)                           */
/* ------------------------------------------------------------------ */
export interface StatTileProps {
  icon: React.ReactNode;
  iconClassName?: string;
  label: string;
  value: React.ReactNode;
  tone?: "accent" | "warning" | "info" | "success";
  className?: string;
}

const toneMap: Record<NonNullable<StatTileProps["tone"]>, string> = {
  accent: "from-accent/40 to-accent/0 text-accent",
  warning: "from-amber-400/40 to-amber-400/0 text-amber-300",
  info: "from-sky-400/40 to-sky-400/0 text-sky-300",
  success: "from-emerald-400/40 to-emerald-400/0 text-emerald-300",
};

export function StatTile({
  icon,
  iconClassName,
  label,
  value,
  tone = "accent",
  className,
}: StatTileProps) {
  return (
    <div
      data-slot="stat-tile"
      className={cn(
        "relative flex flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl bg-white/[0.04] px-4 py-4 text-center ring-1 ring-white/[0.04]",
        className
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-6 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full bg-gradient-to-br opacity-70 blur-xl",
          toneMap[tone]
        )}
      />
      <div className={cn("relative", iconClassName)}>{icon}</div>
      <div className="relative font-display text-base font-bold text-white">
        {value}
      </div>
      <div className="relative text-[10px] uppercase tracking-wider text-white/40">
        {label}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DownloadItem (row used in "Last Downloads")                        */
/* ------------------------------------------------------------------ */
export interface DownloadItemProps {
  title: string;
  tag?: string;
  meta?: React.ReactNode;
  cover?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function DownloadItem({
  title,
  tag,
  meta,
  cover,
  onClick,
  className,
}: DownloadItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-slot="download-item"
      className={cn(
        "group flex w-full items-center gap-4 rounded-2xl bg-gradient-to-r from-accent/40 to-[#1c0a0e] p-3 text-left ring-1 ring-white/[0.06] transition-all hover:ring-white/15",
        className
      )}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/40 text-white">
        {cover}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-display text-base font-semibold text-white">
            {title}
          </span>
          {tag ? <Pill tone="soft">{tag}</Pill> : null}
        </div>
        {meta ? (
          <div className="mt-1 text-xs text-white/60">{meta}</div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#1a070b]">
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* SeeMoreLink (helper for SectionHeader.action)                       */
/* ------------------------------------------------------------------ */
export interface SeeMoreLinkProps extends React.ComponentProps<"button"> {
  label?: string;
}

export function SeeMoreLink({
  label = "See More",
  className,
  ...props
}: SeeMoreLinkProps) {
  return (
    <button
      type="button"
      data-slot="see-more"
      className={cn(
        "text-sm font-medium text-white/50 transition-colors hover:text-white",
        className
      )}
      {...props}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Re-export for convenience                                           */
/* ------------------------------------------------------------------ */
export { SectionHeader, Pill, IconBadge };
export type { LucideIcon };
