"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import StatusBadge from "@/components/StatusBadge";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<any>(null);
  const [docs, setDocs] = useState<{ kind: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: application } = await supabase
        .from("applications")
        .select("id, type, status, reference_no, fee_amount, applicant_id, created_at")
        .eq("id", id)
        .single();
      setApp(application);

      const { data: rows } = await supabase
        .from("documents")
        .select("kind, file_path")
        .eq("application_id", id)
        .order("created_at", { ascending: false });

      const signed: { kind: string; url: string }[] = [];
      if (rows) {
        for (const r of rows) {
          const { data } = await supabase.storage.from("documents").createSignedUrl(r.file_path, 60 * 10);
          if (data?.signedUrl) signed.push({ kind: r.kind, url: data.signedUrl });
        }
      }
      setDocs(signed);
      setLoading(false);
    }
    load();
  }, [id]);

  async function startPayment() {
    if (!app) return;
    try {
      setPaying(true);
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: app.id, amount: app.fee_amount || 100, email: undefined }),
      });
      const json = await res.json();
      const url = json?.invoice?.invoice_url || json?.invoice?.checkout_url;
      if (url) window.location.href = url;
    } finally {
      setPaying(false);
    }
  }

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="mb-2 h-6 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-28" />
      </div>
      <Card className="p-4">
        <Skeleton className="mb-3 h-4 w-32" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded border">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ))}
        </div>
      </Card>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
  if (!app) return <div>Not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Application {app.reference_no}</h1>
          <div className="text-sm text-gray-600">Type: {app.type}</div>
        </div>
        <StatusBadge status={app.status} />
      </div>

      {/* Status timeline */}
      <Card className="p-4">
        <h2 className="mb-2 font-semibold">Status Timeline</h2>
        <Timeline status={app.status} createdAt={app.created_at} />
      </Card>

      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 font-semibold">Documents</h2>
        {docs.length === 0 && <div className="text-sm text-gray-600">No documents uploaded.</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          {docs.map((d, i) => (
            <a key={i} href={d.url} target="_blank" className="block overflow-hidden rounded border">
              <div className="bg-gray-50 px-3 py-2 text-sm">{d.kind}</div>
              <img src={d.url} className="h-48 w-full object-cover" alt={d.kind} />
            </a>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={startPayment} disabled={paying}>
          {paying ? "Redirecting..." : "Pay Fees"}
        </button>
      </div>
    </div>
  );
}

function Timeline({ status, createdAt }: { status: string; createdAt?: string }) {
  const steps = [
    { key: "submitted", label: "Submitted" },
    { key: "under_review", label: "Under Review" },
    { key: "approved", label: "Approved" },
    { key: "ready_for_pickup", label: "Ready for Pickup" },
  ] as const;

  const currentIndex = Math.max(0, steps.findIndex(s => s.key === status));
  const rejected = status === "rejected";

  return (
    <ol className="relative ml-4 border-l pl-6">
      <li className="mb-4 last:mb-0">
        <div className="absolute -left-2.5 h-5 w-5 rounded-full border-2 border-emerald-500 bg-white" />
        <div className="text-sm"><span className="font-medium">Created</span>{createdAt ? ` — ${new Date(createdAt).toLocaleString()}` : ""}</div>
      </li>
      {steps.map((s, i) => {
        const done = !rejected && i <= currentIndex;
        const current = !rejected && i === currentIndex;
        return (
          <li key={s.key} className="mb-4 last:mb-0">
            <div className={`absolute -left-2.5 h-5 w-5 rounded-full border-2 ${done ? "border-emerald-500 bg-emerald-50" : "border-gray-300 bg-white"}`} />
            <div className={`text-sm ${current ? "font-semibold" : ""}`}>{s.label}</div>
          </li>
        );
      })}
      {rejected && (
        <li className="mb-0">
          <div className="absolute -left-2.5 h-5 w-5 rounded-full border-2 border-red-500 bg-red-50" />
          <div className="text-sm font-semibold text-red-700">Rejected</div>
        </li>
      )}
    </ol>
  );
}
