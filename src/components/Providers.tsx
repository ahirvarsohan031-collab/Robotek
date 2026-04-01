"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./ToastProvider";
import { LoaderProvider } from "./LoaderProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <ToastProvider>
          <LoaderProvider>
            {children}
          </LoaderProvider>
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
