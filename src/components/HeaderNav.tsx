"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, usePathname } from "next/navigation";
import { Building2, Menu, X, User, LogOut, Shield, Settings } from "lucide-react";
import UserMenu from "./UserMenu";
import { checkAdminStatus } from "@/lib/auth";

export default function HeaderNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Hide global header on admin routes to avoid duplication
  if (pathname && pathname.startsWith('/admin')) {
    return null;
  }

  useEffect(() => {
    let mounted = true;
    
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) {
        setUser(user);
        if (user) {
          try {
            const adminStatus = await checkAdminStatus(user.email);
            setIsAdmin(adminStatus);
          } catch (error) {
            console.error('Error checking admin status:', error);
            setIsAdmin(false);
          }
        }
        setLoading(false);
      }
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        if (session?.user) {
          try {
            const adminStatus = await checkAdminStatus(session.user.email);
            setIsAdmin(adminStatus);
          } catch (error) {
            console.error('Error checking admin status:', error);
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold gradient-text">Dipolog Permits</span>
                <p className="text-xs text-gray-500 -mt-1">City Government</p>
              </div>
            </div>
            <div className="animate-pulse">
              <div className="h-10 w-24 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg group-hover:shadow-xl transition-all duration-300">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold gradient-text">Dipolog Permits</span>
              <p className="text-xs text-gray-500 -mt-1">City Government</p>
            </div>
          </Link>

          {/* Desktop Navigation - Only show for authenticated users */}
          {user && (
            <div className="hidden md:flex items-center space-x-8">
              <Link 
                href="/apply/business" 
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200"
              >
                Business Permit
              </Link>
              <Link 
                href="/apply/building" 
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200"
              >
                Building Permit
              </Link>
              <Link 
                href="/apply/barangay" 
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200"
              >
                Barangay Clearance
              </Link>
              <Link 
                href="/dashboard" 
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200"
              >
                Dashboard
              </Link>
              {isAdmin && (
                <Link 
                  href="/admin" 
                  className="text-gray-700 hover:text-purple-600 font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Admin
                </Link>
              )}
            </div>
          )}

          {/* User Menu or Sign In */}
          <div className="flex items-center space-x-4">
            {user ? (
              <UserMenu />
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login">
                  <button className="btn-primary px-6 py-2 text-sm">
                    <Shield className="mr-2 h-4 w-4" />
                    Sign In
                  </button>
                </Link>
              </div>
            )}
            
            {/* Mobile menu button - Only show for authenticated users */}
            {user && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200/50 hover:bg-white/80 transition-all duration-200"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5 text-gray-600" />
                ) : (
                  <Menu className="h-5 w-5 text-gray-600" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation - Only show for authenticated users */}
        {user && mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200/50">
            <div className="space-y-3">
              <Link 
                href="/apply/business" 
                className="block px-4 py-3 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200/50 hover:bg-white/80 transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                Business Permit
              </Link>
              <Link 
                href="/apply/building" 
                className="block px-4 py-3 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200/50 hover:bg-white/80 transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                Building Permit
              </Link>
              <Link 
                href="/apply/barangay" 
                className="block px-4 py-3 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200/50 hover:bg-white/80 transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                Barangay Clearance
              </Link>
              <Link 
                href="/dashboard" 
                className="block px-4 py-3 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200/50 hover:bg-white/80 transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              {isAdmin && (
                <Link 
                  href="/admin" 
                  className="block px-4 py-3 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200/50 hover:bg-white/80 transition-all duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Admin
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
