"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { User, LogOut, Settings, ChevronDown } from "lucide-react";
import Button from "@/components/ui/Button";

export default function UserMenu() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) {
        setUser(user);
        setLoading(false);
      }
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    router.push("/");
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 w-24 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => router.push("/login")}
        className="btn-secondary"
      >
        <User className="mr-2 h-4 w-4" />
        Sign In
      </Button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200/50 hover:bg-white/80 transition-all duration-200"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
          <User className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-medium text-gray-700 hidden sm:block">
          {user.email}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 z-50">
            <div className="glass-card rounded-2xl p-4 shadow-2xl border border-white/20">
              <div className="space-y-3">
                {/* User Info */}
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                  <p className="text-xs text-gray-500">Signed in</p>
                </div>
                
                <div className="border-t border-gray-200/50"></div>
                
                {/* Menu Items */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/dashboard");
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-white/60 rounded-xl transition-colors duration-200"
                >
                  <User className="h-4 w-4" />
                  <span>Dashboard</span>
                </button>
                
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // Add settings route when available
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-white/60 rounded-xl transition-colors duration-200"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </button>
                
                <div className="border-t border-gray-200/50"></div>
                
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
