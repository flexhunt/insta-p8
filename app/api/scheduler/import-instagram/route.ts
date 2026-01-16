import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { userId, videoUrl, caption, coverUrl } = body

        if (!userId || !videoUrl) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const supabase = await getSupabaseServerClient()

        // 1. Download the Video from external URL (Instagram CDN)
        console.log(`[Import] Downloading video: ${videoUrl}`)
        const vidRes = await fetch(videoUrl)
        if (!vidRes.ok) throw new Error("Failed to fetch video from remote URL")

        const videoBlob = await vidRes.blob()
        const arrayBuffer = await videoBlob.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // 2. Upload to Supabase Storage
        // Generate unique filename
        const contentType = vidRes.headers.get("content-type") || "video/mp4"
        let fileExt = "mp4"
        if (contentType.includes("image/jpeg")) fileExt = "jpg"
        else if (contentType.includes("image/png")) fileExt = "png"
        else if (contentType.includes("image/webp")) fileExt = "webp"

        const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('reels')
            .upload(fileName, buffer, {
                contentType: contentType,
                upsert: false
            })

        if (uploadError) {
            console.error("[Import] Storage Upload Error:", uploadError)
            throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
            .from('reels')
            .getPublicUrl(fileName)

        // 3. Insert into Content Pool
        // Get current max sequence
        const { data: maxContent } = await supabase
            .from("content_pool")
            .select("sequence_index")
            .eq("user_id", userId)
            .order("sequence_index", { ascending: false })
            .limit(1)
            .single()

        const nextSeq = (maxContent?.sequence_index || 0) + 1

        const { data: poolData, error: dbError } = await supabase
            .from("content_pool")
            .insert({
                user_id: userId,
                video_url: publicUrl, // The permanent Supabase URL
                caption: caption || "",
                sequence_index: nextSeq,
                is_active: true,
                cover_url: coverUrl || null
            })
            .select()
            .single()

        if (dbError) throw dbError

        return NextResponse.json({ success: true, data: poolData })

    } catch (error: any) {
        console.error("[Import] API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
