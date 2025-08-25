import { NextRequest } from "next/server";
import { json, error, readJson } from "@/lib/http";
import { sendSms } from "@/lib/sms";

// POST /api/notifications/sms
// Body: { to, message }
export async function POST(req: NextRequest) {
  const body = await readJson<any>(req);
  const { to, message } = body || {};
  if (!to || !message) return error("Missing to or message", 422);
  const res = await sendSms(to, message);
  return json({ ok: true, res });
}
