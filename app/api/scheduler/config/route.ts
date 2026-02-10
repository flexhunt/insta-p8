import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const userId = searchParams.get("userId")
        if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

        const supabase = await getSupabaseServerClient()

        const { data, error } = await supabase
            .from("scheduler_config")
            .select("*")
            .eq("user_id", userId)
            .single()

        // Returns null data if not found, which is fine
        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { userId, is_running, interval_minutes, start_time, end_time } = body

        if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

        const supabase = await getSupabaseServerClient()

        // Calculate initial next_run if enabling
        // For simplicity, just set next_run to NOW() so it triggers immediately, 
        // or keep existing logic.
        const updates = {
            is_running,
            interval_minutes,
            start_time,
            end_time,
            updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
            .from("scheduler_config")
            .upsert({ user_id: userId, ...updates }) // upsert on PK
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
