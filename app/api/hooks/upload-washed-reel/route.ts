import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { createReelsContainer, publishContainer } from "@/lib/instagram-publishing"

export async function POST(request: NextRequest) {
    try {
        // 1. Security Check
        const apiSecret = request.headers.get("x-api-secret")
        if (apiSecret !== process.env.API_SECRET_KEY) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // 2. Form Data
        const formData = await request.formData()
        const file = formData.get("file") as File
        const caption = formData.get("caption") as string
        const userId = formData.get("userId") as string

        if (!file || !userId) {
            return NextResponse.json({ error: "Missing file or userId" }, { status: 400 })
        }

        // 3. Upload to Supabase Storage
        const supabase = await getSupabaseServerClient()
        const filename = `uploads/washed_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`

        const arrayBuffer = await file.arrayBuffer()
        const fileBuffer = Buffer.from(arrayBuffer)

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("media")
            .upload(filename, fileBuffer, {
                contentType: file.type,
                upsert: false,
            })

        if (uploadError) {
            console.error("Supabase Upload Error:", uploadError)
            return NextResponse.json({ error: `Storage Upload Failed: ${uploadError.message}` }, { status: 500 })
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from("media")
            .getPublicUrl(filename)

        // 4. Fetch User Access Token (Just to verify user exists)
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("id", userId)
            .single()

        if (userError || !user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // 5. Add to Content Pool (Scheduler Integration)

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
                video_url: publicUrl,
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
        const { error: configError } = await supabase
            .from("scheduler_config")
            .upsert({
                user_id: userId,
                is_running: true, // Auto-start scheduler if new
                // Defaults if creating new:
                start_time: '09:00',
                end_time: '23:00',
                interval_minutes: 60
            }, { onConflict: 'user_id', ignoreDuplicates: true }) // Don't overwrite if exists, just ensure row? No, we used Upsert.
        // Actually, we SHOULD NOT overwrite 'is_running' if the user paused it manually.
        // Let's use ignoreDuplicates to only create if missing.

        // Correct approach for "Create if missing, otherwise do nothing":
        // Supabase .upsert with ignoreDuplicates: true will only insert if key doesn't exist.
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
            message: "Video added to scheduler pool",
            poolId: poolEntry.id,
            sequenceIndex: nextSequence,
            publicUrl
        })

    } catch (error: any) {
        console.error("API Error:", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}

