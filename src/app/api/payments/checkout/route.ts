import { NextRequest } from "next/server";
import { json, error, readJson } from "@/lib/http";
import { createCheckoutInvoice } from "@/lib/payments";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// POST /api/payments/checkout
// Body: { application_id, amount, email }
export async function POST(req: NextRequest) {
  const body = await readJson<any>(req);
  const { application_id, amount, email } = body || {};
  if (!application_id || !amount) return error("Missing application_id or amount", 422);

  const { data: app, error: apperr } = await supabaseAdmin
    .from("applications").select("id, reference_no").eq("id", application_id).single();
  if (apperr || !app) return error("Application not found", 404);

  const invoice = await createCheckoutInvoice({
    amount: Number(amount),
    description: `Permit fee for ${app.reference_no}`,
    payer_email: email,
    reference: app.reference_no,
    success_redirect_url: process.env.NEXT_PUBLIC_BASE_URL + "/dashboard",
    failure_redirect_url: process.env.NEXT_PUBLIC_BASE_URL + "/dashboard",
  });

  // persist payment record
  await supabaseAdmin.from("payments").insert({
    application_id,
    amount: Number(amount),
    status: invoice.status || "pending",
    external_ref: invoice.id || invoice.external_id,
    method: "gcash",
  });

  return json({ invoice });
}
