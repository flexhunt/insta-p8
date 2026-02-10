import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const { data: user } = await supabase.from("users").select("access_token").eq("id", userId).single()

    if (!user?.access_token) return NextResponse.json({ error: "No token" }, { status: 401 })

    // Fetch existing Ice Breakers
    const res = await fetch(
      `https://graph.instagram.com/v24.0/me/messenger_profile?fields=ice_breakers&platform=instagram&access_token=${user.access_token}`
    )
    const data = await res.json()
    
    // Extract just the questions array
    const questions = data.data?.[0]?.ice_breakers || []
    return NextResponse.json({ data: questions })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, questions } = await request.json()
    if (!userId || !Array.isArray(questions)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()
    const { data: user } = await supabase.from("users").select("access_token").eq("id", userId).single()

    if (!user?.access_token) return NextResponse.json({ error: "No token" }, { status: 401 })

    // Format for Instagram API
    // We set the "payload" same as the "question" so our bot sees it as a keyword
    const iceBreakers = questions.map((q: string) => ({
      question: q,
      payload: q, 
    }))

    const res = await fetch(
      `https://graph.instagram.com/v24.0/me/messenger_profile?access_token=${user.access_token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "instagram",
          ice_breakers: iceBreakers,
        }),
      }
    )
    
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Ice Breaker Error:", error)
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 })
  }
}
