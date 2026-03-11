import type { Metadata } from "next";
import { Figtree, Syne } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${figtree.variable} ${syne.variable}`}>
      <body className="antialiased">
        <NuqsAdapter>
          <Providers>{children}</Providers>
        </NuqsAdapter>
      </body>
    </html>
  );
}
