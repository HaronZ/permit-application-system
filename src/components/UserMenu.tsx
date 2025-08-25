"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
      setLoading(false);
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (loading) return <div className="text-sm text-gray-600">…</div>;

  return email ? (
    <div className="flex items-center gap-2 text-sm">
      <span className="hidden sm:inline text-gray-700">{email}</span>
      <button onClick={signOut} className="rounded px-3 py-2 hover:bg-gray-100">Logout</button>
    </div>
  ) : (
    <Link href="/login" className="rounded px-3 py-2 hover:bg-gray-100 text-sm">Login</Link>
  );
}
