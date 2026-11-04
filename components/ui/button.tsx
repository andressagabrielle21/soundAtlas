import type { ComponentPropsWithRef } from "react";

type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: "primary" | "secondary";
};

const variants = {
  primary: "bg-accent text-on-accent enabled:hover:bg-accent-hover",
  secondary:
    "bg-surface text-ink enabled:hover:bg-control",
};

export function Button({
  variant = "primary",
  type = "button",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg px-gutter py-2 font-semibold disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}
