import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const supabase = await getSupabaseServerClient();
    const { data: user, error } = await supabase
      .from("users")
      .select("groq_auto_reply_enabled, ai_context")
      .eq("id", userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ enabled: false });
    }

    return NextResponse.json({ enabled: user.groq_auto_reply_enabled ?? false, ai_context: user.ai_context ?? "" });
  } catch (error) {
    console.error("[Groq Auto-Reply] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, enabled, ai_context } = await request.json();
    if (!userId || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "Missing userId or enabled" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const updatePayload: any = { groq_auto_reply_enabled: enabled };
    if (typeof ai_context === "string") updatePayload.ai_context = ai_context;

    const { error } = await supabase
      .from("users")
      .update(updatePayload)
      .eq("id", userId);

    if (error) throw error;

    return NextResponse.json({ enabled, ai_context });
  } catch (error) {
    console.error("[Groq Auto-Reply] PUT error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
