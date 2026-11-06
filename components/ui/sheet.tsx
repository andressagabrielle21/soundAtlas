"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./button";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
};

export function Sheet({ open, onOpenChange, title, children }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      className="open:enter-content fixed inset-x-0 top-auto bottom-0 mx-auto max-h-[85dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl bg-surface p-panel pb-[calc(var(--spacing-panel)+env(safe-area-inset-bottom))] text-ink backdrop:bg-canvas/80"
    >
      <header className="mb-gutter flex items-center justify-between gap-gutter">
        <h2 id={titleId} className="text-heading font-semibold">
          {title}
        </h2>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Fechar
        </Button>
      </header>
      {children}
    </dialog>
  );
}
