import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const userId = searchParams.get("userId")
        if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

        const supabase = await getSupabaseServerClient()

        // Fetch items ordered by sequence
        const { data, error } = await supabase
            .from("content_pool")
            .select("*")
            .eq("user_id", userId)
            .eq("is_active", true)
            .order("sequence_index", { ascending: true })

        if (error) throw error

        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { userId, video_url, caption, thumbnail_url } = body

        if (!userId || !video_url) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

        const supabase = await getSupabaseServerClient()

        // Get current max sequence
        const { data: maxContent } = await supabase
            .from("content_pool")
            .select("sequence_index")
            .eq("user_id", userId)
            .order("sequence_index", { ascending: false })
            .limit(1)
            .single()

        const nextSeq = (maxContent?.sequence_index || 0) + 1

        const { data, error } = await supabase
            .from("content_pool")
            .insert({
                user_id: userId,
                video_url,
                caption,
                sequence_index: nextSeq,
                thumbnail_url: thumbnail_url || null
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (err: any) {
        console.error("Pool Error:", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const id = searchParams.get("id")
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

        const supabase = await getSupabaseServerClient()

        const { error } = await supabase
            .from("content_pool")
            .delete()
            .eq("id", id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
