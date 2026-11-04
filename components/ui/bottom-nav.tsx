"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Diário" },
  { href: "/buscar", label: "Buscar" },
  { href: "/biblioteca", label: "Biblioteca" },
  { href: "/perfil", label: "Perfil" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="sticky bottom-0 border-t border-outline bg-surface px-gutter pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 gap-1 py-1">
        {items.flatMap(({ href, label }, index) => {
          const current = pathname === href;
          const active = current || pathname?.startsWith(`${href}/`);

          const item = (
            <li key={href}>
              <Link
                href={href}
                aria-current={
                  current ? "page" : active ? "location" : undefined
                }
                className="flex min-h-touch min-w-touch items-center justify-center rounded-lg px-1 text-center text-caption font-semibold text-muted hover:bg-control aria-current:bg-control aria-current:text-accent"
              >
                {label}
              </Link>
            </li>
          );
          return index === 1
            ? [
                item,
                <li key="registrar" className="flex justify-center">
                  <Link
                    href="/buscar?registrar=1"
                    aria-label="Registrar escuta"
                    className="flex size-touch items-center justify-center rounded-full bg-accent text-2xl font-semibold text-on-accent"
                  >
                    +
                  </Link>
                </li>,
              ]
            : [item];
        })}
      </ul>
    </nav>
  );
}
