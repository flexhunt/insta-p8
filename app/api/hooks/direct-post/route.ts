import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { createReelsContainer, getContainerStatus, publishContainer } from "@/lib/instagram-publishing"

// Vercel: Allow up to 60s execution
export const maxDuration = 60

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

/**
 * Direct Post — Publishes a reel to Instagram immediately.
 * POST /api/hooks/direct-post
 * Headers: { x-api-secret: YOUR_SECRET }
 * Body: { videoUrl, caption, userId }
 * 
 * Flow: videoUrl → Instagram Container → Wait for processing → Publish
 * Also logs to reels_posts table for tracking.
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Auth
        const apiSecret = request.headers.get("x-api-secret")
        if (apiSecret !== process.env.API_SECRET_KEY) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // 2. Parse Body
        const { videoUrl, caption, userId } = await request.json()
        if (!videoUrl || !userId) {
            return NextResponse.json({ error: "Missing videoUrl or userId" }, { status: 400 })
        }

        const supabase = await getSupabaseServerClient()

        // 3. Get User's Instagram Access Token
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("access_token")
            .eq("id", userId)
            .single()

        if (userError || !user?.access_token) {
            return NextResponse.json({ error: "User not found or no access token" }, { status: 404 })
        }

        // 4. Create Instagram Reels Container
        console.log(`[DirectPost] Creating container for user ${userId}`)
        const containerId = await createReelsContainer(user.access_token, videoUrl, caption || "")

        // 5. Wait for Instagram to process (poll every 3s, max ~30s)
        let status = "IN_PROGRESS"
        let attempts = 0
        while (status === "IN_PROGRESS" && attempts < 10) {
            await delay(3000)
            status = await getContainerStatus(user.access_token, containerId)
            attempts++
            console.log(`[DirectPost] Status: ${status} (attempt ${attempts}/10)`)
        }

        if (status !== "FINISHED") {
            // Log failure
            await supabase.from("reels_posts").insert({
                user_id: userId,
                video_url: videoUrl,
                caption: caption || "",
                ig_container_id: containerId,
                status: "FAILED",
                error_message: `Processing timed out. Final status: ${status}`
            })
            return NextResponse.json({ error: `Processing failed: ${status}` }, { status: 500 })
        }

        // 6. Publish!
        const mediaId = await publishContainer(user.access_token, containerId)
        console.log(`[DirectPost] Published! Media ID: ${mediaId}`)

        // 7. Log success
        await supabase.from("reels_posts").insert({
            user_id: userId,
            video_url: videoUrl,
            caption: caption || "",
            ig_container_id: containerId,
            ig_media_id: mediaId,
            status: "PUBLISHED",
            published_at: new Date().toISOString()
        })

        return NextResponse.json({
            success: true,
            message: "Reel published to Instagram!",
            mediaId,
            containerId
        })

    } catch (error: any) {
        console.error("[DirectPost] Error:", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
