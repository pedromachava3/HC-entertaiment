import { cn } from "@/lib/utils";

export function Container({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-7xl px-5 sm:px-8", className)} {...p} />;
}

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-white/[0.07] bg-coal/80 backdrop-blur-sm", className)}
      {...p}
    />
  );
}

const BADGE_TONES = {
  red: "bg-hc-red/15 text-hc-red ring-hc-red/30",
  white: "bg-white/10 text-white ring-white/20",
  grey: "bg-white/5 text-mute ring-white/10",
  green: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
} as const;

export function Badge({
  tone = "white",
  className,
  ...p
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof BADGE_TONES }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset",
        BADGE_TONES[tone],
        className,
      )}
      {...p}
    />
  );
}

export function Eyebrow({ className, ...p }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-hc-red sm:text-xs sm:tracking-[0.3em]", className)}
      {...p}
    />
  );
}

export function SectionTitle({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("font-display text-4xl uppercase leading-[0.95] sm:text-6xl", className)} {...p} />;
}

export const inputClass =
  "block w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-white placeholder:text-white/30 transition focus:border-hc-red focus:outline-none focus:ring-2 focus:ring-hc-red/30 disabled:opacity-50 aria-[invalid=true]:border-hc-red";

export function Input({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...p} />;
}

export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "min-h-28", className)} {...p} />;
}

export function Select({ className, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputClass, "appearance-none pr-10", className)} {...p} />;
}

export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mute", className)} {...p} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-xs text-hc-red">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-white/40">{hint}</p>
      ) : null}
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "warning" | "error";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-white/10 bg-white/[0.03]",
    success: "border-emerald-500/30 bg-emerald-500/10",
    warning: "border-amber-500/30 bg-amber-500/10",
    error: "border-hc-red/40 bg-hc-red/10",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl border p-4 text-sm", tones[tone], className)}>
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      {children ? <div className="text-white/80">{children}</div> : null}
    </div>
  );
}
