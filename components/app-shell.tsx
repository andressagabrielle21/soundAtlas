"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BottomNav } from "./ui/bottom-nav";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/entrar" || pathname === "/cadastrar";
  const largeBrand = isAuthPage || pathname === "/";

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-10 focus:flex focus:min-h-touch focus:items-center focus:rounded-lg focus:bg-surface focus:px-3 focus:text-accent"
      >
        Ir para o conteúdo
      </a>
      <main
        id="conteudo"
        tabIndex={-1}
        className={
          isAuthPage
            ? "mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-10 sm:px-8 sm:py-16"
            : "mx-auto w-full max-w-lg flex-1 px-gutter py-panel"
        }
      >
        <div className={isAuthPage ? "w-full max-w-sm" : undefined}>
          <header className={isAuthPage ? "mb-10" : "mb-panel"}>
            <p
              className={
                isAuthPage
                  ? "text-lg font-semibold tracking-tight text-accent"
                  : largeBrand
                    ? "text-4xl font-bold tracking-tight text-accent"
                    : "text-heading font-semibold text-accent"
              }
            >
              SoundAtlas
            </p>
          </header>
          {children}
        </div>
      </main>
      {!isAuthPage && <BottomNav />}
    </>
  );
}
