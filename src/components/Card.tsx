import Link from "next/link";
import { formatBRL, type ItemStatus } from "@/lib/utils";
import { StatusBadge } from "@/components/Badge";

export function ItemCard(props: {
  shortId: string;
  title: string;
  category: string;
  condition: string;
  price: number;
  priceFrom?: number | null;
  status: ItemStatus;
  imageUrl?: string | null;
}) {
  const { shortId, title, category, condition, price, priceFrom, status, imageUrl } = props;
  return (
    <Link href={`/i/${shortId}`} className="group block rounded-2xl border bg-white p-3 shadow-sm hover:shadow-md transition">
      <div className="flex gap-3">
        <div className="h-20 w-20 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-slate-500">Sem foto</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-tight line-clamp-2">{title}</h3>
            <StatusBadge status={status} />
          </div>
          <div className="mt-1 text-xs text-slate-600">{category} • {condition}</div>
          <div className="mt-2 flex items-baseline gap-2">
            {priceFrom ? <span className="text-xs text-slate-500 line-through">{formatBRL(priceFrom)}</span> : null}
            <span className="text-base font-bold">{formatBRL(price)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
