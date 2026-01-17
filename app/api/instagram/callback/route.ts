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

    // 4. Get Username AND User ID from /me endpoint
    let username = `user_${loginUserId}`
    let meUserId = loginUserId // The ID returned from /me endpoint
    try {
      const igRes = await fetch(`https://graph.instagram.com/v24.0/me?fields=id,username&access_token=${accessToken}`)
      const igData = await igRes.json()
      console.log(`[v0] 📡 /me response:`, JSON.stringify(igData))

      if (igData.username) {
        username = igData.username
        console.log(`[v0] ✅ Username fetched: ${username}`)
      }
      if (igData.id) {
        meUserId = igData.id
        console.log(`[v0] ✅ User ID from /me: ${meUserId}`)
      }
      if (igData.error) {
        console.error(`[v0] ❌ /me endpoint failed:`, igData.error)
      }
    } catch (e) {
      console.error(`[v0] ❌ /me endpoint exception:`, e)
    }

    // 5. Business Discovery (Multiple Approaches)
    let businessAccountId = null

    // Approach 1: If /me returned a 1784 ID, use it directly!
    if (meUserId && meUserId.startsWith("1784")) {
      businessAccountId = meUserId
      console.log(`[v0] 🎯 Method 1: /me returned Business ID directly: ${businessAccountId}`)
    }

    // Approach 2: Try business_discovery with username (if we have real username)
    if (!businessAccountId && username && !username.startsWith("user_")) {
      try {
        const encodedUsername = encodeURIComponent(username)
        const discUrl = `https://graph.instagram.com/v24.0/${loginUserId}?fields=business_discovery.username(${encodedUsername}){id}&access_token=${accessToken}`
        console.log(`[v0] 🔍 Trying business_discovery for username: ${username}`)
        const discRes = await fetch(discUrl)
        const discData = await discRes.json()
        if (discData.business_discovery?.id) {
          businessAccountId = discData.business_discovery.id
          console.log(`[v0] 🎯 Method 2: Discovery found Business ID: ${businessAccountId}`)
        } else if (discData.error) {
          console.warn(`[v0] ⚠️ Discovery API error:`, discData.error.message)
        }
      } catch (e) {
        console.warn("[v0] Discovery failed:", e)
      }
    }

    // Approach 3: Try fetching user's pages (Facebook Business approach)
    if (!businessAccountId) {
      try {
        const pagesUrl = `https://graph.facebook.com/v24.0/me/accounts?fields=instagram_business_account&access_token=${accessToken}`
        console.log(`[v0] 🔍 Trying Facebook Pages approach...`)
        const pagesRes = await fetch(pagesUrl)
        const pagesData = await pagesRes.json()
        if (pagesData.data && pagesData.data.length > 0) {
          const validPage = pagesData.data.find((p: any) => p.instagram_business_account?.id)
          if (validPage) {
            businessAccountId = validPage.instagram_business_account.id
            console.log(`[v0] 🎯 Method 3: Found Business ID via Pages: ${businessAccountId}`)
          }
        } else if (pagesData.error) {
          console.warn(`[v0] ⚠️ Pages API error (expected for IG Login):`, pagesData.error.message)
        }
      } catch (e) {
        // This is expected to fail for "Instagram Login" users (vs Facebook Business Login)
        console.log(`[v0] ℹ️ Pages approach not available (normal for IG Login)`)
      }
    }

    console.log(`[v0] 📊 Final Discovery Result: username=${username}, businessAccountId=${businessAccountId || 'NULL'}`)


    // 6. Save/Update User
    const supabase = await getSupabaseServerClient()

    // Check current DB state
    const { data: currentUser } = await supabase.from("users").select("page_id, business_account_id").eq("id", loginUserId).single()

    const updates: any = {
      username,
      access_token: accessToken,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }

    // If Discovery worked, save the Good ID
    if (businessAccountId) {
      updates.business_account_id = businessAccountId
      updates.page_id = businessAccountId // Also set page_id for dual-lookup
      console.log(`[v0] ✅ Saving business_account_id AND page_id: ${businessAccountId}`)
    } else if (currentUser?.business_account_id) {
      // Keep existing business_account_id if we already have one
      console.log(`[v0] 🛡️ Keeping existing business_account_id: ${currentUser.business_account_id}`)
    }

    // ALWAYS ensure page_id is set (for webhook dual-lookup to work)
    // If we didn't set it above with businessAccountId, use loginUserId as fallback
    if (!updates.page_id) {
      if (currentUser?.page_id && currentUser.page_id.startsWith("1784")) {
        // Keep the existing good ID
        console.log(`[v0] 🛡️ Protecting existing Page ID: ${currentUser.page_id}`)
      } else {
        // Set login ID as fallback - webhook can find user with this
        updates.page_id = loginUserId
        console.log(`[v0] 📌 Setting page_id to loginUserId for webhook: ${loginUserId}`)
      }
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
