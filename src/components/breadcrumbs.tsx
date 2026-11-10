import Link from "next/link";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return <nav aria-label="Breadcrumb" className="mb-6"><ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">{items.map((item, index) => {
    const last = index === items.length - 1;
    return <li key={`${index}:${item.label}`} className="flex min-w-0 items-center gap-2">
      {index > 0 ? <span aria-hidden="true" className="text-fg-muted">/</span> : null}
      {last || !item.href ? <span aria-current={last ? "page" : undefined} className="max-w-[32ch] truncate font-medium text-fg">{item.label}</span> : <Link href={item.href} className="max-w-[32ch] truncate text-fg-secondary transition-colors hover:text-accent">{item.label}</Link>}
    </li>;
  })}</ol></nav>;
}
