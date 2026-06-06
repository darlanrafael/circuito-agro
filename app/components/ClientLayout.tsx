"use client";

import { ThemeProvider } from "./ThemeProvider";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
