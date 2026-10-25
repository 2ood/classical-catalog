import type { Metadata } from "next";
import { IM_Fell_English, Inter } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import AuthStatus from "@/components/AuthStatus";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const imFell = IM_Fell_English({
  variable: "--font-im-fell",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Classical Catalog",
  description: "A personal library of classical scores and recordings",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${imFell.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="h-12 shrink-0 flex items-center justify-between px-6 border-b border-border text-sm">
          <Link href="/" className="font-serif text-lg">
            Classical Catalog
          </Link>
          <Suspense>
            <AuthStatus />
          </Suspense>
        </header>
        {children}
      </body>
    </html>
  );
}
