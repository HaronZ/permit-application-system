const XENDIT_API_KEY = process.env.XENDIT_API_KEY;

export async function createCheckoutInvoice(params: {
  amount: number;
  description: string;
  payer_email?: string;
  reference?: string;
  success_redirect_url?: string;
  failure_redirect_url?: string;
}) {
  if (!XENDIT_API_KEY) throw new Error("XENDIT_API_KEY not set");

  const res = await fetch("https://api.xendit.co/v2/invoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${XENDIT_API_KEY}:`).toString("base64")}`,
    },
    body: JSON.stringify({
      external_id: params.reference || `inv_${Date.now()}`,
      amount: Math.round(params.amount),
      description: params.description,
      payer_email: params.payer_email,
      success_redirect_url: params.success_redirect_url,
      failure_redirect_url: params.failure_redirect_url,
      currency: "PHP",
      payment_methods: ["GCASH", "CARD", "PAYMAYA"],
    }),
  });
  if (!res.ok) throw new Error(`Xendit error: ${res.status}`);
  return res.json();
}
