import { cn, statusLabel, type ItemStatus } from "@/lib/utils";

export function StatusBadge({ status }: { status: ItemStatus }) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  const cls =
    status === "available" ? "bg-emerald-100 text-emerald-700"
    : status === "reserved" ? "bg-amber-100 text-amber-800"
    : status === "sold" ? "bg-slate-200 text-slate-700"
    : status === "review" ? "bg-sky-100 text-sky-700"
    : "bg-slate-100 text-slate-700";

  return <span className={cn(base, cls)}>{statusLabel(status)}</span>;
}
