import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { json, error, readJson } from "@/lib/http";

// GET /api/applications?email=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  const query = supabaseAdmin.from("applications").select("id,type,status,created_at,applicant_id,reference_no,fee_amount").order("created_at", { ascending: false });
  let data;
  if (email) {
    const { data: applicant, error: aerr } = await supabaseAdmin
      .from("applicants")
      .select("id").eq("email", email).single();
    if (aerr || !applicant) return json({ applications: [] });
    const { data: apps } = await query.eq("applicant_id", applicant.id);
    data = apps || [];
  } else {
    const { data: apps } = await query;
    data = apps || [];
  }
  return json({ applications: data });
}

// POST /api/applications
// Body: { full_name, phone, email, type, fee_amount?, document?: { name, base64? } }
export async function POST(req: NextRequest) {
  const body = await readJson<any>(req);
  const { full_name, phone, email, type, fee_amount } = body || {};
  if (!full_name || !phone || !email || !type) return error("Missing required fields", 422);

  // upsert applicant by email
  const { data: applicant, error: aerr } = await supabaseAdmin
    .from("applicants")
    .upsert({ full_name, phone, email }, { onConflict: "email" })
    .select("id").single();
  if (aerr) return error(aerr.message, 500);

  // create application
  const { data: app, error: apperr } = await supabaseAdmin
    .from("applications")
    .insert({ applicant_id: applicant.id, type, status: "submitted", fee_amount: fee_amount || 0 })
    .select("id, reference_no").single();
  if (apperr) return error(apperr.message, 500);

  return json({ id: app.id, reference_no: app.reference_no });
}
