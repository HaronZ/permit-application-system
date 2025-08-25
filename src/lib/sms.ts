const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY;
const SEMAPHORE_SENDER = process.env.SEMAPHORE_SENDER || "DIPOLOG";

export async function sendSms(to: string, message: string) {
  if (!SEMAPHORE_API_KEY) throw new Error("SEMAPHORE_API_KEY not set");
  const form = new URLSearchParams();
  form.set("apikey", SEMAPHORE_API_KEY);
  form.set("sendername", SEMAPHORE_SENDER);
  form.set("number", to);
  form.set("message", message);

  const res = await fetch("https://semaphore.co/api/v4/messages", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!res.ok) throw new Error(`Semaphore error: ${res.status}`);
  return res.json();
}
