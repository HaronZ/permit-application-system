import "../../styles/globals.css";
import React from "react";
import { Inter } from "next/font/google";
import HeaderNav from "@/components/HeaderNav";
import ToastProvider from "@/components/ui/ToastProvider";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata = {
  title: "Dipolog City Permit Application System",
  description: "MVP for digital permits",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`min-h-screen bg-gray-50 text-gray-900 ${inter.className}`}>
        <ToastProvider>
          <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <HeaderNav />
          </header>
          <main className="mx-auto max-w-5xl p-4">{children}</main>
          <footer className="mx-auto max-w-5xl px-4 py-6 text-sm text-gray-500"> {new Date().getFullYear()} Dipolog City</footer>
        </ToastProvider>
      </body>
    </html>
  );
}
