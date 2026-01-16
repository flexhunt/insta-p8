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

        let accessToken = ""
        let businessId = ""

        // 1. Check for Master Spy Token (Env Var) - Priority #1
        const spyTokenRaw = process.env.INSTAGRAM_SPY_TOKEN
        const spyToken = spyTokenRaw ? spyTokenRaw.trim().replace(/^"|"$/g, '') : null // Remove quotes if user added them in .env

        if (spyToken) {
            console.log(`[Discovery] Master Spy Token Found (Length: ${spyToken.length})`)
            accessToken = spyToken

            // Debug: Check if token works for basic /me
            const debugMe = await fetch(`https://graph.facebook.com/v24.0/me?fields=id,name`, {
                headers: { Authorization: `Bearer ${spyToken}` }
            })
            const debugData = await debugMe.json()
            if (debugData.error) {
                console.error("[Discovery] 🚨 Spy Token is INVALID/EXPIRED:", debugData.error)
            } else {
                console.log("[Discovery] ✅ Spy Token is valid for user:", debugData.name)
            }

            // We need to find the connected business ID. 
            // Usually: /me/accounts -> Page -> Instagram Business
            const pagesRes = await fetch(`https://graph.facebook.com/v24.0/me/accounts?fields=instagram_business_account&access_token=${spyToken}`)
            const pagesData = await pagesRes.json()

            if (pagesData.error) {
                console.error("[Discovery] 🚨 Failed to fetch Accounts:", pagesData.error)
            }

            // Add explicit check for pagesData.data
            if (!pagesData.data) {
                console.warn("[Discovery] No 'data' field in pages response. Cannot find Instagram Business Account.")
            } else if (pagesData.data.length > 0) {
                // Find first page with an IG Business Account
                const validPage = pagesData.data.find((p: any) => p.instagram_business_account?.id)
                if (validPage) {
                    businessId = validPage.instagram_business_account.id
                    console.log("[Discovery] Found Business ID from Token:", businessId)
                } else {
                    console.warn("[Discovery] Token valid, but NO Instagram Business connected to these Pages.")
                }
            } else {
                console.warn("[Discovery] No Pages found for this token user.")
            }

            if (!businessId) {
                console.error("[Discovery] Could not resolve Business ID from Spy Token")
            }
        } else {
            console.log("[Discovery] No INSTAGRAM_SPY_TOKEN in env.")
        }

        // 2. Fallback to Database User Token (if no Spy Token found or Business ID missing)
        if (!accessToken || !businessId) {
            const { data: user } = await supabase
                .from("users")
                .select("access_token, business_account_id, page_id")
                .eq("id", userId)
                .single()

            if (!user?.access_token) {
                return NextResponse.json({ error: "Instagram not connected" }, { status: 401 })
            }
            accessToken = user.access_token

            // Use Business ID or fallback to Page ID if it looks like a business ID (starts with 1784)
            // Discovery API REQUIRES a Business ID (IG User ID), not a Token User ID.
            businessId = user.business_account_id
            if (!businessId && user.page_id && user.page_id.startsWith("1784")) {
                businessId = user.page_id
            }
        }

        if (!businessId) {
            return NextResponse.json({
                error: "Business ID not found",
                details: "Your Instagram account must be a Business or Creator account."
            }, { status: 400 })
        }

        // 3. Call Business Discovery API
        // Syntax: GET /{ig-user-id}?fields=business_discovery.username({username}){media{...}}
        const fields = `business_discovery.username(${targetUsername}){media.limit(24){id,caption,media_type,media_url,thumbnail_url,permalink,timestamp}}`
        // MUST use graph.facebook.com for Business Discovery (Graph API), NOT graph.instagram.com (Basic Display)
        const url = `https://graph.facebook.com/v24.0/${businessId}?fields=${fields}&access_token=${accessToken}`

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
