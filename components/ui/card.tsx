import type { ComponentPropsWithRef } from "react";

export function Card({
  className = "",
  ...props
}: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={`rounded-xl bg-surface p-panel ${className}`}
    />
  );
}
