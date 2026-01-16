
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const targetUrl = searchParams.get("url")

    if (!targetUrl) {
        return NextResponse.json({ error: "Missing url" }, { status: 400 })
    }

    try {
        const response = await fetch(targetUrl)
        if (!response.ok) throw new Error("Fetch failed")

        const blob = await response.blob()
        const headers = new Headers()
        headers.set("Content-Type", blob.type)
        headers.set("Access-Control-Allow-Origin", "*")

        return new NextResponse(blob, {
            status: 200,
            headers
        })
    } catch (e) {
        return NextResponse.json({ error: "Proxy Failed" }, { status: 500 })
    }
}
