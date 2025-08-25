"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import UserMenu from "@/components/UserMenu";

export default function HeaderNav() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setAuthed(!!data.user);
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session?.user);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
      <div className="font-semibold tracking-tight">
        <Link href="/" className="hover:opacity-90">Dipolog City Permits</Link>
      </div>
      <nav className="flex items-center gap-1 text-sm text-gray-700">
        {authed && (
          <>
            <Link href="/" className="rounded px-3 py-2 hover:bg-gray-100">Home</Link>
            <Link href="/apply/business" className="rounded px-3 py-2 hover:bg-gray-100">Apply</Link>
            <Link href="/dashboard" className="rounded px-3 py-2 hover:bg-gray-100">Dashboard</Link>
            <Link href="/admin" className="rounded px-3 py-2 hover:bg-gray-100">Admin</Link>
          </>
        )}
      </nav>
      <UserMenu />
    </div>
  );
}
