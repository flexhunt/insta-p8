import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
    try {
        // 1. Security Check
        const apiSecret = request.headers.get("x-api-secret")
        if (apiSecret !== process.env.API_SECRET_KEY) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // 2. Parse JSON Body (Optimized for Vercel)
        const body = await request.json()
        const { videoUrl, caption, userId } = body

        if (!videoUrl || !userId) {
            return NextResponse.json({ error: "Missing videoUrl or userId" }, { status: 400 })
        }

        const supabase = await getSupabaseServerClient()

        // 3. Fetch User Access Token (Verify user exists)
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("id", userId)
            .single()

        if (userError || !user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // 4. Add to Content Pool (Scheduler Integration)

        // A. Get current max sequence to append to end
        const { data: maxSeqData } = await supabase
            .from("content_pool")
            .select("sequence_index")
            .eq("user_id", userId)
            .order("sequence_index", { ascending: false })
            .limit(1)
            .single()

        const nextSequence = (maxSeqData?.sequence_index ?? 0) + 1

        // B. Insert into Pool
        const { data: poolEntry, error: poolError } = await supabase
            .from("content_pool")
            .insert({
                user_id: userId,
                video_url: videoUrl,
                caption: caption || "",
                sequence_index: nextSequence,
                is_active: true
            })
            .select()
            .single()

        if (poolError) {
            throw new Error(`Pool Insert Failed: ${poolError.message}`)
        }

        // C. Ensure Scheduler Config Exists (Auto-activate if missing)
        await supabase.from("scheduler_config")
            .upsert({
                user_id: userId,
                is_running: true,
                start_time: '09:00',
                end_time: '23:00',
                interval_minutes: 60,
                current_sequence_index: 1
            }, { onConflict: 'user_id', ignoreDuplicates: true })

        return NextResponse.json({
            success: true,
            message: "Video added to scheduler pool via URL",
            poolId: poolEntry.id,
            sequenceIndex: nextSequence,
            videoUrl
        })

    } catch (error: any) {
        console.error("API Error:", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
