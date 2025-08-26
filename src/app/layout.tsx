import "../../styles/globals.css";
import React from "react";
import { Inter } from "next/font/google";
import HeaderNav from "@/components/HeaderNav";
import ToastProvider from "@/components/ui/ToastProvider";

const inter = Inter({ 
  subsets: ["latin"], 
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: "Dipolog City Permit Application System",
  description: "Apply for business permits, building permits, and barangay clearances online. Track your application status and manage documents easily.",
  keywords: "permit, application, business permit, building permit, barangay clearance, dipolog city",
  authors: [{ name: "Dipolog City Government" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 antialiased">
        <ToastProvider>
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
              <HeaderNav />
            </header>
            
            <main className="flex-1">
              <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {children}
              </div>
            </main>
            
            <footer className="border-t border-gray-200 bg-white/50 backdrop-blur-sm">
              <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                  <div className="text-center sm:text-left">
                    <p className="text-sm text-gray-600">
                      © {new Date().getFullYear()} Dipolog City Government. All rights reserved.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Streamlined permit application system for better public service.
                    </p>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <a href="#" className="hover:text-gray-700 transition-colors">Privacy Policy</a>
                    <a href="#" className="hover:text-gray-700 transition-colors">Terms of Service</a>
                    <a href="#" className="hover:text-gray-700 transition-colors">Contact</a>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
