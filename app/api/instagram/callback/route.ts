import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error) {
    const redirectUrl = new URL("/", request.url)
    redirectUrl.searchParams.set("error", error)
    return NextResponse.redirect(redirectUrl)
  }

  if (code) {
    const redirectUrl = new URL("/", request.url)
    redirectUrl.searchParams.set("code", code)
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.json({ error: "Invalid callback" }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body
    if (!code) return NextResponse.json({ error: "No code" }, { status: 400 })

    // 1. Env Vars
    const clientId = process.env.INSTAGRAM_APP_ID
    const clientSecret = process.env.INSTAGRAM_APP_SECRET
    const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("Missing Env Vars: Check INSTAGRAM_APP_ID")
    }

    // 2. Exchange Code for Short Token
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    })

    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) {
      console.error("[v0] Token Error:", tokenData)
      return NextResponse.json({ error: tokenData.error_description || "Token failed" }, { status: 400 })
    }

    const shortToken = tokenData.access_token
    const loginUserId = tokenData.user_id.toString()

    // 3. Exchange for Long Token (60 Days)
    const longLivedUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${shortToken}`
    const longRes = await fetch(longLivedUrl)
    const longData = await longRes.json()
    const accessToken = longData.access_token || shortToken
    const expiresIn = longData.expires_in || 5184000

    // 4. Get Username
    let username = `user_${loginUserId}`
    try {
      const igRes = await fetch(`https://graph.instagram.com/me?fields=username&access_token=${accessToken}`)
      const igData = await igRes.json()
      if (igData.username) username = igData.username
    } catch (e) {}

    // 5. Get Business Account ID (the "1784" webhook ID)
    // Strategy: Try multiple methods to ensure we ALWAYS get it.
    let businessAccountId: string | null = null

    // Method A: Business Discovery API
    try {
      const encodedUsername = encodeURIComponent(username)
      const discUrl = `https://graph.instagram.com/v24.0/${loginUserId}?fields=business_discovery.username(${encodedUsername}){id}&access_token=${accessToken}`
      const discRes = await fetch(discUrl)
      const discData = await discRes.json()
      if (discData.business_discovery?.id) {
        businessAccountId = discData.business_discovery.id
        console.log(`[v0] 🎯 Method A (Discovery): ${businessAccountId}`)
      }
    } catch (e) {
      console.warn("[v0] Discovery failed:", e)
    }

    // Method B: GET /me?fields=id (returns the IG-scoped ID which IS the webhook ID)
    if (!businessAccountId) {
      try {
        const meRes = await fetch(`https://graph.instagram.com/v24.0/me?fields=id,username&access_token=${accessToken}`)
        const meData = await meRes.json()
        if (meData.id && meData.id !== loginUserId) {
          businessAccountId = meData.id
          console.log(`[v0] 🎯 Method B (/me): ${businessAccountId}`)
        }
      } catch (e) {
        console.warn("[v0] /me fallback failed:", e)
      }
    }

    // Method C: If still nothing, use loginUserId as last resort
    if (!businessAccountId) {
      businessAccountId = loginUserId
      console.log(`[v0] ⚠️ Method C (loginUserId fallback): ${businessAccountId}`)
    }

    // 6. Save/Update User
    const supabase = await getSupabaseServerClient()

    const updates: any = {
      username,
      access_token: accessToken,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      business_account_id: businessAccountId,
      page_id: businessAccountId, // Always keep in sync
    }

    console.log(`[v0] 💾 Saving user: ${username} | id=${loginUserId} | biz_id=${businessAccountId}`)

    const { error: upsertError } = await supabase
      .from("users")
      .upsert({ id: loginUserId, ...updates }, { onConflict: "id" })

    if (upsertError) throw upsertError

    const response = NextResponse.json({ success: true, username, userId: loginUserId })
    response.cookies.set("insta_session", JSON.stringify({ username, userId: loginUserId }), { path: "/" })
    return response

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
