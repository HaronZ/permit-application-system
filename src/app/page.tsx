"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { Building2, Store, ShieldCheck, LayoutList, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function check() {
      setChecking(true);
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!data.user) {
        router.replace("/login");
      } else {
        setChecking(false);
      }
    }
    check();
    return () => { mounted = false; };
  }, [router]);

  if (checking) {
    return <div className="text-sm text-gray-600">Loading…</div>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome</h1>
        <p className="text-gray-600">Apply for city permits, upload requirements, pay fees, and track status.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link href="/apply/business" className="group rounded-lg border bg-white p-5 transition-shadow hover:shadow-md">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-blue-50 p-2 text-blue-700">
              <Store size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Business Permit</h3>
                <ChevronRight className="text-gray-400 transition-transform group-hover:translate-x-0.5" size={18} />
              </div>
              <p className="text-sm text-gray-600">Apply for new or renewal</p>
            </div>
          </div>
        </Link>

        <Link href="/apply/building" className="group rounded-lg border bg-white p-5 transition-shadow hover:shadow-md">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-emerald-50 p-2 text-emerald-700">
              <Building2 size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Building Permit</h3>
                <ChevronRight className="text-gray-400 transition-transform group-hover:translate-x-0.5" size={18} />
              </div>
              <p className="text-sm text-gray-600">Apply for building-related permits</p>
            </div>
          </div>
        </Link>

        <Link href="/apply/barangay" className="group rounded-lg border bg-white p-5 transition-shadow hover:shadow-md">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-orange-50 p-2 text-orange-700">
              <ShieldCheck size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Barangay Clearance</h3>
                <ChevronRight className="text-gray-400 transition-transform group-hover:translate-x-0.5" size={18} />
              </div>
              <p className="text-sm text-gray-600">Request barangay clearance</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard" className="group rounded-lg border bg-white p-5 transition-shadow hover:shadow-md">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-violet-50 p-2 text-violet-700">
              <LayoutList size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">My Applications</h3>
                <ChevronRight className="text-gray-400 transition-transform group-hover:translate-x-0.5" size={18} />
              </div>
              <p className="text-sm text-gray-600">View statuses and payments</p>
            </div>
          </div>
        </Link>
      </section>

      <div className="flex gap-3">
        <Link href="/apply/business"><Button>Start a Business Permit</Button></Link>
        <Link href="/dashboard"><Button variant="secondary">Go to My Applications</Button></Link>
      </div>
    </div>
  );
}
