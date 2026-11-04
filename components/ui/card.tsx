import type { ComponentPropsWithRef } from "react";

export function Card({
  className = "",
  ...props
}: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={`rounded-xl border border-outline bg-surface p-panel ${className}`}
    />
  );
}
