"use client";

import { useId, type ComponentPropsWithRef } from "react";

type InputProps = ComponentPropsWithRef<"input"> & {
  label: string;
  error?: string;
};

export function Input({
  id,
  label,
  error,
  className = "",
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const description = [describedBy, error ? errorId : undefined]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="grid min-w-0 gap-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        aria-describedby={description || undefined}
        aria-invalid={error ? true : invalid}
        className={`min-h-touch w-full min-w-0 rounded-lg bg-control px-gutter py-2 text-body placeholder:text-muted aria-invalid:ring-2 aria-invalid:ring-danger disabled:opacity-50 ${className}`}
      />
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
