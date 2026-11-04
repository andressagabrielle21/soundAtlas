import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return <div className="enter-content w-full">{children}</div>;
}
