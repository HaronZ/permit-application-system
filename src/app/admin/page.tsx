"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import EmptyState from "@/components/ui/EmptyState";
import { isAdmin } from "@/lib/auth";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";

export default function Admin() {
  const { show } = useToast();
  const [apps, setApps] = useState<any[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<
    "all" | "submitted" | "under_review" | "approved" | "ready_for_pickup" | "rejected"
  >("all");
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalCount, setTotalCount] = useState<number>(0);

  async function load(nextPage = page, nextQ = q, nextFilter = filter) {
    setLoading(true);
    const from = (nextPage - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from("applications")
      .select("id, type, status, created_at, applicant_id", { count: "exact" })
      .order("created_at", { ascending: false });

    if (nextFilter !== "all") query = query.eq("status", nextFilter);
    if (nextQ.trim()) {
      const term = nextQ.trim();
      // PostgREST or filter: type ilike OR id ilike
      query = query.or(`type.ilike.%${term}%,id.ilike.%${term}%`);
    }

    const { data, count, error } = await query.range(from, to);
    if (!error) {
      setApps(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;
    async function init() {
      setAuthLoading(true);
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
      setAuthLoading(false);
      if (data.user?.email && isAdmin(data.user.email)) {
        load();
      }
    }
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
      if (session?.user?.email && isAdmin(session.user.email)) {
        load();
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  async function setStatus(id: string, status: string) {
    setUpdating(id);
    try {
      // previous for undo
      const prev = apps.find(a => a.id === id)?.status;
      const { error } = await supabase.from("applications").update({ status }).eq("id", id);
      if (error) throw error;
      show({
        type: "success",
        message: `Updated to ${status.replace(/_/g, " ")}`,
        actionLabel: prev ? "Undo" : undefined,
        onAction: prev
          ? async () => {
              setUpdating(id);
              try {
                const { error: rerr } = await supabase.from("applications").update({ status: prev }).eq("id", id);
                if (rerr) throw rerr;
                await load();
              } finally {
                setUpdating(null);
              }
            }
          : undefined,
      });
      await load();
    } catch (e: any) {
      show({ type: "error", message: e.message || "Failed to update" });
    } finally {
      setUpdating(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageItems = apps;

  function toggle(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function toggleSelectAll() {
    const ids = pageItems.map(a => a.id);
    const allSelected = ids.every(id => selected.has(id));
    setSelected(prev => {
      const n = new Set(prev);
      if (allSelected) {
        ids.forEach(id => n.delete(id));
      } else {
        ids.forEach(id => n.add(id));
      }
      return n;
    });
  }

  async function bulkUpdate(status: string) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setUpdating("bulk");
    try {
      // Build undo payload
      const prevMap = new Map<string, string>();
      apps.forEach(a => { if (ids.includes(a.id)) prevMap.set(a.id, a.status); });

      const { error } = await supabase.from("applications").update({ status }).in("id", ids);
      if (error) throw error;
      show({
        type: "success",
        message: `Updated ${ids.length} to ${status.replace(/_/g, " ")}`,
        actionLabel: "Undo",
        onAction: async () => {
          setUpdating("bulk");
          try {
            const restore = Array.from(prevMap.entries()).map(([id, st]) => ({ id, status: st }));
            const { error: rerr } = await supabase.from("applications").upsert(restore, { onConflict: "id" });
            if (rerr) throw rerr;
            await load();
          } finally {
            setUpdating(null);
          }
        }
      });
      setSelected(new Set());
      await load();
    } catch (e: any) {
      show({ type: "error", message: e.message || "Bulk update failed" });
    } finally {
      setUpdating(null);
    }
  }

  async function exportCSV() {
    const cols = ["id","type","status","created_at"] as const;
    let query = supabase
      .from("applications")
      .select(cols.join(","))
      .order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter);
    if (q.trim()) {
      const term = q.trim();
      query = query.or(`type.ilike.%${term}%,id.ilike.%${term}%`);
    }
    const { data, error } = await query.limit(1000);
    if (error) {
      show({ type: "error", message: "CSV export failed" });
      return;
    }
    const rows = (data || []).map((a: any) => cols.map(c => String((a as any)[c]).replaceAll('"','""')));
    const csv = [cols.join(","), ...rows.map((r: string[]) => r.map((v: string) => `"${v}` + `"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "applications.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  if (authLoading) {
    return <Card className="p-6 text-sm text-gray-600">Checking access…</Card>;
  }

  if (!email) {
    return (
      <EmptyState title="Please login" description="Admin access requires an account." actionHref="/login" actionText="Go to Login" />
    );
  }

  if (!isAdmin(email)) {
    return <EmptyState title="Not authorized" description="Your account is not allowed to access Admin." />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin Review</h1>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {(["all","submitted","under_review","approved","ready_for_pickup","rejected"] as const).map(s => (
            <button
              key={s}
              onClick={() => { setFilter(s); setPage(1); load(1, q, s); }}
              className={`rounded px-3 py-1.5 ${filter===s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}`}
            >{s.replace(/_/g, " ")}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="min-w-[240px]"><Input placeholder="Search by type or ID…" value={q} onChange={e=>{ const v=e.target.value; setQ(v); setPage(1); load(1, v, filter); }} /></div>
          <button onClick={exportCSV} className="rounded bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200">Export CSV</button>
        </div>
      </div>

      {loading ? (
        <ul className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i}><Card className="p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><Skeleton className="h-4 w-4 rounded" /><Skeleton className="h-4 w-48" /></div><Skeleton className="h-6 w-24" /></div></Card></li>
          ))}
        </ul>
      ) : totalCount === 0 ? (
        <EmptyState title="No applications" description="Try changing the filter or search." />
      ) : (
        <>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button onClick={toggleSelectAll} className="rounded bg-gray-100 px-3 py-1.5 hover:bg-gray-200">{pageItems.every(a=>selected.has(a.id)) && pageItems.length>0 ? "Unselect All" : "Select All (page)"}</button>
          <button onClick={() => bulkUpdate("under_review")} disabled={updating==="bulk" || selected.size===0} className="rounded bg-gray-100 px-3 py-1.5 hover:bg-gray-200 disabled:opacity-50">Bulk: Under Review</button>
          <button onClick={() => bulkUpdate("approved")} disabled={updating==="bulk" || selected.size===0} className="rounded bg-gray-100 px-3 py-1.5 hover:bg-gray-200 disabled:opacity-50">Bulk: Approve</button>
          <button onClick={() => bulkUpdate("ready_for_pickup")} disabled={updating==="bulk" || selected.size===0} className="rounded bg-gray-100 px-3 py-1.5 hover:bg-gray-200 disabled:opacity-50">Bulk: Ready for Pickup</button>
          <button onClick={() => bulkUpdate("rejected")} disabled={updating==="bulk" || selected.size===0} className="rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700 disabled:opacity-50">Bulk: Reject</button>
        </div>
        <ul className="space-y-2">
          {pageItems.map((a) => (
            <li key={a.id}>
              <Card className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold capitalize">
                    <input type="checkbox" aria-label="select" checked={selected.has(a.id)} onChange={() => toggle(a.id)} />
                    <Link href={`/applications/${a.id}`} className="hover:underline">{a.type} — {a.id.slice(0,8)}…</Link>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setStatus(a.id, "under_review")} disabled={updating===a.id}>Under Review</button>
                  <button onClick={() => setStatus(a.id, "approved")} disabled={updating===a.id}>Approve</button>
                  <button onClick={() => setStatus(a.id, "ready_for_pickup")} disabled={updating===a.id}>Ready for Pickup</button>
                  <button onClick={() => setStatus(a.id, "rejected")} disabled={updating===a.id} className="bg-red-600 hover:bg-red-700">Reject</button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between pt-2 text-sm">
          <div>Page {page} of {totalPages} • Total {totalCount}</div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={()=>{ const n=Math.max(1,page-1); setPage(n); load(n); }} className="rounded bg-gray-100 px-3 py-1.5 hover:bg-gray-200 disabled:opacity-50">Prev</button>
            <button disabled={page>=totalPages} onClick={()=>{ const n=Math.min(totalPages,page+1); setPage(n); load(n); }} className="rounded bg-gray-100 px-3 py-1.5 hover:bg-gray-200 disabled:opacity-50">Next</button>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
