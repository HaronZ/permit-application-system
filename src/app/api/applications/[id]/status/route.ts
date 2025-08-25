import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { json, error, readJson } from "@/lib/http";
import { sendSms } from "@/lib/sms";

// PATCH /api/applications/[id]/status
// Body: { status: 'under_review'|'approved'|'ready_for_pickup'|'rejected', notify?: boolean }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await readJson<any>(req);
  const { status, notify } = body || {};
  if (!status) return error("Missing status", 422);

  const { data, error: uerr } = await supabaseAdmin
    .from("applications")
    .update({ status })
    .eq("id", id)
    .select("id, status, applicant_id")
    .single();
  if (uerr) return error(uerr.message, 500);

  if (notify) {
    const { data: applicant } = await supabaseAdmin
      .from("applicants").select("phone, full_name").eq("id", data.applicant_id).single();
    if (applicant?.phone) {
      const msg = `Dipolog Permits: Your application ${id.slice(0,8)} status is now ${status}.`;
      try { await sendSms(applicant.phone, msg); } catch {}
    }
  }

  return json({ ok: true, id, status });
}
