import * as React from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Greeting                                                            */
/* ------------------------------------------------------------------ */
export interface GreetingProps {
  prefix?: string;
  name: string;
  className?: string;
}

export function Greeting({
  prefix = "Good evening,",
  name,
  className,
}: GreetingProps) {
  return (
    <h1
      data-slot="greeting"
      className={cn(
        "font-display text-xl font-semibold tracking-tight text-white sm:text-2xl",
        className
      )}
    >
      {prefix}{" "}
      <span className="font-bold uppercase tracking-wide text-white">
        {name}
      </span>
    </h1>
  );
}

/* ------------------------------------------------------------------ */
/* SearchBar                                                           */
/* ------------------------------------------------------------------ */
export interface SearchBarProps
  extends Omit<React.ComponentProps<"input">, "size"> {
  icon?: React.ReactNode;
  wrapperClassName?: string;
}

export function SearchBar({
  icon,
  className,
  wrapperClassName,
  ...props
}: SearchBarProps) {
  return (
    <div
      data-slot="search-bar"
      className={cn(
        "relative flex h-11 w-full items-center rounded-full bg-white/[0.06] ring-1 ring-white/[0.06] transition-colors focus-within:bg-white/[0.09] focus-within:ring-white/15",
        wrapperClassName
      )}
    >
      <span className="pointer-events-none absolute left-4 text-white/50">
        {icon}
      </span>
      <input
        type="search"
        className={cn(
          "h-full w-full bg-transparent pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none",
          className
        )}
        {...props}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TopBarActionButton                                                  */
/* ------------------------------------------------------------------ */
export interface TopBarActionButtonProps
  extends React.ComponentProps<"button"> {
  icon: React.ReactNode;
  label: string;
  badge?: boolean;
}

export function TopBarActionButton({
  icon,
  label,
  badge = false,
  className,
  ...props
}: TopBarActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      data-slot="top-bar-action"
      className={cn(
        "relative flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-white/80 ring-1 ring-white/[0.06] transition-all hover:bg-white/[0.12] hover:text-white",
        className
      )}
      {...props}
    >
      {icon}
      {badge ? (
        <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-accent ring-2 ring-frame" />
      ) : null}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */
export interface AvatarProps {
  src?: string;
  name: string;
  online?: boolean;
  size?: "sm" | "md" | "lg";
  ring?: boolean;
  className?: string;
}

const avatarSize: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
};

export function Avatar({
  src,
  name,
  online,
  size = "md",
  ring = false,
  className,
}: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      data-slot="avatar"
      data-online={online ? "true" : undefined}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-purple-500 font-semibold text-white",
        ring && "ring-2 ring-white/20",
        avatarSize[size],
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initials || "?"}</span>
      )}
      {online ? (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-frame" />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SectionHeader                                                       */
/* ------------------------------------------------------------------ */
export interface SectionHeaderProps
  extends Omit<React.ComponentProps<"div">, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  align?: "between" | "start";
}

export function SectionHeader({
  title,
  description,
  action,
  align = "between",
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      data-slot="section-header"
      className={cn(
        "flex flex-wrap items-end gap-2",
        align === "between" ? "justify-between" : "justify-start",
        className
      )}
      {...props}
    >
      <div className="space-y-0.5">
        <h2 className="font-display text-xl font-semibold tracking-tight text-white">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="text-sm">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pill / Tag                                                          */
/* ------------------------------------------------------------------ */
export interface PillProps extends React.ComponentProps<"span"> {
  tone?: "default" | "accent" | "soft" | "outline";
}

export function Pill({
  tone = "default",
  className,
  ...props
}: PillProps) {
  return (
    <span
      data-slot="pill"
      data-tone={tone}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "default" && "bg-white/[0.08] text-white",
        tone === "soft" && "bg-white/[0.05] text-white/70",
        tone === "accent" && "bg-accent text-accent-foreground",
        tone === "outline" && "border border-white/15 text-white/80",
        className
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* IconBadge (rounded chip with icon)                                  */
/* ------------------------------------------------------------------ */
export interface IconBadgeProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function IconBadge({ icon, label, active, onClick }: IconBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-slot="icon-badge"
      data-active={active ? "true" : undefined}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-all",
        active
          ? "bg-white text-[#1a070b]"
          : "bg-white/[0.06] text-white/80 ring-1 ring-white/10 hover:bg-white/[0.1]"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* StatPill (small KPI used in top bar pricing strip)                 */
/* ------------------------------------------------------------------ */
export interface StatPillProps {
  label: string;
  value: React.ReactNode;
  separator?: boolean;
  className?: string;
}

export function StatPill({
  label,
  value,
  separator = false,
  className,
}: StatPillProps) {
  return (
    <div
      data-slot="stat-pill"
      className={cn(
        "flex items-center gap-2 text-sm text-white/60",
        separator && "pl-4 border-l border-white/10",
        className
      )}
    >
      <span>{label}:</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
