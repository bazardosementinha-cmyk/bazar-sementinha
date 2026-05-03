import Link from "next/link";
import type { HelpTopic } from "@/lib/admin-help";

type Props = {
  topic: HelpTopic;
  className?: string;
};

export default function ContextHelp({ topic, className = "" }: Props) {
  return (
    <aside className={`rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-bold uppercase tracking-wide text-amber-800">Ajuda do processo</div>
          <h2 className="mt-1 text-lg font-bold">{topic.title}</h2>
          <p className="mt-1 text-sm text-amber-900">{topic.description}</p>
        </div>
        {topic.ctaHref && topic.ctaLabel ? (
          <Link
            href={topic.ctaHref}
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-amber-300 bg-white px-3 py-1 text-sm font-semibold text-amber-950 hover:bg-amber-100"
          >
            {topic.ctaLabel}
          </Link>
        ) : null}
      </div>

      <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {topic.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-700" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
