import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const userId = searchParams.get("userId")
        const targetUsername = searchParams.get("target")

        if (!userId || !targetUsername) {
            return NextResponse.json({ error: "Missing userId or target username" }, { status: 400 })
        }

        const supabase = await getSupabaseServerClient()

        // 1. Get User's Token & Business ID
        const { data: user } = await supabase
            .from("users")
            .select("access_token, business_account_id, page_id")
            .eq("id", userId)
            .single()

        if (!user?.access_token) {
            return NextResponse.json({ error: "Instagram not connected" }, { status: 401 })
        }

        // Use Business ID or fallback to Page ID if it looks like a business ID (starts with 1784)
        // Discovery API REQUIRES a Business ID (IG User ID), not a Token User ID.
        let businessId = user.business_account_id
        if (!businessId && user.page_id && user.page_id.startsWith("1784")) {
            businessId = user.page_id
        }

        if (!businessId) {
            return NextResponse.json({
                error: "Business ID not found",
                details: "Your Instagram account must be a Business or Creator account to use Discovery features."
            }, { status: 400 })
        }

        // 2. Call Business Discovery API
        // Syntax: GET /{ig-user-id}?fields=business_discovery.username({username}){media{...}}
        const fields = `business_discovery.username(${targetUsername}){media.limit(24){id,caption,media_type,media_url,thumbnail_url,permalink,timestamp}}`
        // MUST use graph.facebook.com for Business Discovery (Graph API), NOT graph.instagram.com (Basic Display)
        const url = `https://graph.facebook.com/v24.0/${businessId}?fields=${fields}&access_token=${user.access_token}`

        console.log(`[Discovery] Fetching for target: ${targetUsername} via ID: ${businessId}`)

        const res = await fetch(url)
        const data = await res.json()

        if (data.error) {
            console.error("[Discovery] API Error:", data.error)
            return NextResponse.json({ error: data.error.message }, { status: 500 })
        }

        // Extract the nested media list
        const mediaList = data.business_discovery?.media?.data || []

        return NextResponse.json({ data: mediaList })

    } catch (error: any) {
        console.error("[Discovery] Server Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
