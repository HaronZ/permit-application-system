import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Minimal placeholder. In production, verify signature (XENDIT_WEBHOOK_SECRET)
export async function POST(req: NextRequest) {
  const payload = await req.json();
  // Example event for invoice paid
  try {
    const status = payload?.status;
    const external_ref = payload?.id || payload?.external_id;
    if (!external_ref) return NextResponse.json({ ok: true });

    if (status === "PAID" || status === "paid") {
      // update payment
      const { data: payment } = await supabaseAdmin
        .from("payments")
        .update({ status: "paid" })
        .eq("external_ref", external_ref)
        .select("application_id")
        .single();
      if (payment?.application_id) {
        await supabaseAdmin
          .from("applications")
          .update({ status: "under_review" })
          .eq("id", payment.application_id);
      }
    }
  } catch (e) {
    console.error("Webhook error:", e);
  }
  return NextResponse.json({ ok: true });
}
