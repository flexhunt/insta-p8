import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const { data: user } = await supabase.from("users").select("access_token").eq("id", userId).single()

    if (!user?.access_token) return NextResponse.json({ error: "No token" }, { status: 401 })

    const res = await fetch(
      `https://graph.instagram.com/v24.0/me/messenger_profile?fields=persistent_menu&platform=instagram&access_token=${user.access_token}`
    )
    const data = await res.json()
    
    // Return existing menu
    return NextResponse.json({ data: data.data?.[0]?.persistent_menu?.[0]?.call_to_actions || [] })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, items } = await request.json()
    // Items should be an array of { type, title, url?, payload? }

    const supabase = await getSupabaseServerClient()
    const { data: user } = await supabase.from("users").select("access_token").eq("id", userId).single()

    if (!user?.access_token) return NextResponse.json({ error: "No token" }, { status: 401 })

    // Instagram allows max 3 items in the menu
    const menuItems = items.slice(0, 3).map((item: any) => {
      if (item.type === "web_url") {
        return { type: "web_url", title: item.title, url: item.url }
      } else {
        // "postback" acts like a keyword trigger
        return { type: "postback", title: item.title, payload: item.payload } 
      }
    })

    const res = await fetch(
      `https://graph.instagram.com/v24.0/me/messenger_profile?access_token=${user.access_token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "instagram",
          persistent_menu: [
            {
              locale: "default",
              composer_input_disabled: false,
              call_to_actions: menuItems,
            },
          ],
        }),
      }
    )

    const data = await res.json()
    if (data.error) throw new Error(data.error.message)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
