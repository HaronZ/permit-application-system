"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";

type Application = {
  id: string;
  type: string;
  status: string;
  created_at: string;
};

export default function Dashboard() {
  const [apps, setApps] = useState<Application[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("applications")
        .select("id, type, status, created_at")
        .order("created_at", { ascending: false });
      setApps(data || []);
      setLoading(false);
    }
    load();
  }, []);

  function timeAgo(iso: string) {
    const d = new Date(iso).getTime();
    const diff = Math.floor((Date.now() - d) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  }

  const filtered = apps.filter(a =>
    a.id.toLowerCase().includes(q.toLowerCase()) || a.type.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Applications</h1>
      <div className="flex items-center gap-3">
        <Input placeholder="Search by type or ID…" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {loading ? (
        <ul className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Skeleton className="mb-2 h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        <EmptyState title="No applications yet" description="Start a new application from the Home page." actionHref="/apply/business" actionText="Start Business Permit" />
      ) : (
        <ul className="space-y-2">
          {filtered.map((a) => (
            <li key={a.id}>
              <Card className="p-4">
                <Link href={`/applications/${a.id}`} className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold capitalize">{a.type}</div>
                    <div className="text-xs text-gray-600">ID: {a.id.slice(0, 8)}… • {timeAgo(a.created_at)}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
