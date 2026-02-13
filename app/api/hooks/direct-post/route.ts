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

        // 5. Return immediately (Client handles polling)
        // This avoids Vercel 10s/60s function timeouts
        return NextResponse.json({
            success: true,
            status: "IN_PROGRESS",
            message: "Container created. Poll status endpoint to publish.",
            containerId,
            userId // Return userId for auth in next step
        }, { status: 202 })

    } catch (error: any) {
        console.error("[DirectPost] Error:", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
