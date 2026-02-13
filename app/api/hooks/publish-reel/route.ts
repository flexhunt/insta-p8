import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getContainerStatus, publishContainer } from "@/lib/instagram-publishing"

export const maxDuration = 60

/**
 * Publishes a reel container once it's ready.
 * POST /api/hooks/publish-reel
 * Body: { containerId, userId }
 */
export async function POST(request: NextRequest) {
    try {
        const apiSecret = request.headers.get("x-api-secret")
        if (apiSecret !== process.env.API_SECRET_KEY) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { containerId, userId, videoUrl, caption } = await request.json()
        if (!containerId || !userId) {
            return NextResponse.json({ error: "Missing containerId or userId" }, { status: 400 })
        }

        const supabase = await getSupabaseServerClient()

        // Get User Token
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("access_token")
            .eq("id", userId)
            .single()

        if (userError || !user?.access_token) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Check Status
        const status = await getContainerStatus(user.access_token, containerId)
        console.log(`[PublishReel] Container ${containerId} status: ${status}`)

        if (status === "IN_PROGRESS") {
            return NextResponse.json({
                status: "IN_PROGRESS",
                message: "Video still processing"
            }, { status: 202 })
        }

        if (status !== "FINISHED") {
            // Log failure
            await supabase.from("reels_posts").insert({
                user_id: userId,
                video_url: videoUrl || "",
                caption: caption || "",
                ig_container_id: containerId,
                status: "FAILED",
                error_message: `Processing failed with status: ${status}`
            })
            return NextResponse.json({ error: `Container status: ${status}` }, { status: 400 })
        }

        // Publish!
        const mediaId = await publishContainer(user.access_token, containerId)
        console.log(`[PublishReel] Published! Media ID: ${mediaId}`)

        // Log success
        await supabase.from("reels_posts").insert({
            user_id: userId,
            video_url: videoUrl || "",
            caption: caption || "",
            ig_container_id: containerId,
            ig_media_id: mediaId,
            status: "PUBLISHED",
            published_at: new Date().toISOString()
        })

        return NextResponse.json({
            success: true,
            status: "PUBLISHED",
            mediaId
        })

    } catch (error: any) {
        console.error("[PublishReel] Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
