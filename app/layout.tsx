import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { AppShell } from "../components/app-shell";
import { ServiceWorkerRegistration } from "../components/service-worker-registration";
import "./globals.css";

const ubuntu = localFont({
  src: "./fonts/ubuntu.ttf",
  variable: "--font-ubuntu",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SoundAtlas",
  icons: { apple: "/pwa/icon-180.png" },
  appleWebApp: { capable: true, title: "SoundAtlas" },
};

export const viewport: Viewport = { themeColor: "#010736" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={ubuntu.variable}>
      <body className="flex flex-col">
        <ServiceWorkerRegistration />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
