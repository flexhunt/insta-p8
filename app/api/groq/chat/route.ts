import { NextResponse } from "next/server";

const AI_PROXY_URL = "https://triderai.vercel.app/api/chat";

export async function POST(req: Request) {
  const gatewaySecret = process.env.GATEWAY_SECRET;
  if (!gatewaySecret) {
    return NextResponse.json({ error: "GATEWAY_SECRET not configured" }, { status: 500 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const response = await fetch(AI_PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${gatewaySecret}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return NextResponse.json({ error: errText }, { status: response.status });
    }

    if (body.stream) {
      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[AI Chat] Error:", err);
    return NextResponse.json({ error: "Failed to reach AI proxy" }, { status: 502 });
  }
}
