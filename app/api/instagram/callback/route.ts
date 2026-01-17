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

    // 5. Business Discovery (Find the "1784" ID)
    let businessAccountId = null
    try {
      const encodedUsername = encodeURIComponent(username)
      const discUrl = `https://graph.instagram.com/v24.0/${loginUserId}?fields=business_discovery.username(${encodedUsername}){id}&access_token=${accessToken}`
      const discRes = await fetch(discUrl)
      const discData = await discRes.json()
      if (discData.business_discovery?.id) {
        businessAccountId = discData.business_discovery.id
        console.log(`[v0] 🎯 Discovery found Real Business ID: ${businessAccountId}`)
      }
    } catch (e) {
      console.warn("[v0] Discovery failed:", e)
    }

    // 6. Save/Update User
    const supabase = await getSupabaseServerClient()
    
    // Check current DB state
    const { data: currentUser } = await supabase.from("users").select("page_id").eq("id", loginUserId).single()

    const updates: any = {
      username,
      access_token: accessToken,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }

    // If Discovery worked, save the Good ID
    if (businessAccountId) {
       updates.business_account_id = businessAccountId
    }

    // PROTECT THE SHADOW ID (The "1784" Logic)
    // If we ALREADY have a good page_id (starts with 1784), DO NOT overwrite it.
    if (currentUser?.page_id && currentUser.page_id.startsWith("1784")) {
        // Keep the existing good ID
        console.log(`[v0] 🛡️ Protecting existing Page ID: ${currentUser.page_id}`)
    } else {
        // Otherwise, save the login ID as the fallback
        updates.page_id = loginUserId 
    }

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
