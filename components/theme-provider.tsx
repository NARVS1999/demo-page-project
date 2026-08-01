"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes wiring per UI-SPEC: attribute="class", defaultTheme="system",
// enableSystem, disableTransitionOnChange (no flash, no transition flash).
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
