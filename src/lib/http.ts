import { NextRequest, NextResponse } from "next/server";

export function json(data: any, init?: number | ResponseInit) {
  return NextResponse.json(data, init as any);
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJson<T = any>(req: NextRequest): Promise<T> {
  try {
    return await req.json();
  } catch {
    throw new Error("Invalid JSON body");
  }
}
