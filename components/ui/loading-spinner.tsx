export function LoadingSpinner() {
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-0 z-50 grid place-items-center"
    >
      <span
        aria-hidden="true"
        className="size-9 animate-spin rounded-full border-[3px] border-muted/25 border-t-accent motion-reduce:animate-[spin_2s_linear_infinite]"
      />
      <span className="sr-only">Carregando?</span>
    </div>
  );
}
