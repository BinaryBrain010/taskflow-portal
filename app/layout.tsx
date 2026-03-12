import type { Metadata } from "next";
import { Figtree, Syne } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SettingsApply } from "@/components/providers/SettingsApply";
import { Providers } from "./providers";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TaskFlow — Micro-task Marketplace",
  description: "Task management platform for admins and workers",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${figtree.variable} ${syne.variable}`} suppressHydrationWarning>
      <body className="antialiased min-h-screen w-full overflow-x-hidden">
        <ThemeProvider>
          <SettingsApply />
          <NuqsAdapter>
            <Providers>{children}</Providers>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
