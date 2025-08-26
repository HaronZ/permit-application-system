import { NextRequest } from "next/server";
import { json, error, readJson } from "@/lib/http";
import { createCheckoutInvoice } from "@/lib/payments";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET /api/payments/checkout - Test endpoint to check configuration
export async function GET() {
  const config = {
    xendit_configured: !!process.env.XENDIT_API_KEY,
    base_url_configured: !!process.env.NEXT_PUBLIC_BASE_URL,
    supabase_configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  if (!config.xendit_configured) {
    return json({
      error: "XENDIT_API_KEY not configured",
      message: "Payment service is not configured. Please set XENDIT_API_KEY in your environment variables.",
      config
    }, { status: 503 });
  }

  return json({
    message: "Payment service is configured",
    config
  });
}

// POST /api/payments/checkout
// Body: { application_id, amount, email }
export async function POST(req: NextRequest) {
  try {
    // Check if XENDIT_API_KEY is configured
    if (!process.env.XENDIT_API_KEY) {
      return error("Payment service not configured. Please contact support.", 503);
    }

    const body = await readJson<any>(req);
    const { application_id, amount, email } = body || {};
    
    if (!application_id || !amount) {
      return error("Missing application_id or amount", 422);
    }

    const { data: app, error: apperr } = await supabaseAdmin
      .from("applications")
      .select("id, reference_no")
      .eq("id", application_id)
      .single();
      
    if (apperr || !app) {
      return error("Application not found", 404);
    }

    // Create checkout invoice
    const invoice = await createCheckoutInvoice({
      amount: Number(amount),
      description: `Permit fee for ${app.reference_no || application_id}`,
      payer_email: email,
      reference: app.reference_no || application_id,
      success_redirect_url: process.env.NEXT_PUBLIC_BASE_URL + "/dashboard",
      failure_redirect_url: process.env.NEXT_PUBLIC_BASE_URL + "/dashboard",
    });

    if (!invoice) {
      return error("Failed to create payment invoice", 500);
    }

    // Persist payment record
    const { error: paymentError } = await supabaseAdmin.from("payments").insert({
      application_id,
      amount: Number(amount),
      status: invoice.status || "pending",
      external_ref: invoice.id || invoice.external_id,
      method: "gcash",
    });

    if (paymentError) {
      console.error("Payment record creation failed:", paymentError);
      // Don't fail the request if payment record creation fails
    }

    return json({ 
      success: true,
      invoice,
      message: "Payment invoice created successfully"
    });

  } catch (err: any) {
    console.error("Payment checkout error:", err);
    
    // Handle specific errors
    if (err.message?.includes("XENDIT_API_KEY")) {
      return error("Payment service not configured. Please contact support.", 503);
    }
    
    if (err.message?.includes("Xendit error")) {
      return error("Payment service temporarily unavailable. Please try again later.", 503);
    }

    return error("Internal server error. Please try again later.", 500);
  }
}
