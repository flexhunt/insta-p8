import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

const WEBHOOK_VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || "your_verify_token"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: "Invalid token" }, { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.entry) return NextResponse.json({ ok: true })
    const supabase = await getSupabaseServerClient()

    for (const entry of body.entry) {
      
      // ============================================================
      // 🔇 ECHO SILENCER (The Fix for "ID Not Found" logs)
      // ============================================================
      // If the incoming event is just a "Read Receipt", "Delivery Status", 
      // or "Echo" (the bot's own reply), we skip it immediately.
      // This prevents the code from trying to find a User ID for a system event.
      if (entry.messaging) {
        const isSystemEvent = entry.messaging.every((event: any) => 
            event.read || event.delivery || (event.message && event.message.is_echo)
        )
        if (isSystemEvent) {
            // console.log("[v0] 🔇 Skipped System Event (Echo/Read/Delivery)")
            continue
        }
      }
      // ============================================================

      const webhookId = entry.id 
      
      // 1. DUAL ID LOOKUP
      let { data: user } = await supabase
        .from("users")
        .select("*")
        .or(`business_account_id.eq.${webhookId},page_id.eq.${webhookId}`)
        .single()

      // ============================================================
      // 🚨 SELF-HEALING LOGIC (The Fix for Fresh Logins)
      // ============================================================
      if (!user) {
         console.log(`[v0] ⚠️ ID ${webhookId} not found in DB. Attempting Self-Heal...`)

         // 1. Find the most recently active user
         const { data: recentUser } = await supabase
            .from("users")
            .select("*")
            .order("updated_at", { ascending: false })
            .limit(1)
            .single()

         if (recentUser && recentUser.access_token) {
            console.log(`[v0] 🧪 Testing candidate: ${recentUser.username}`)
            
            // 2. Test if this user's token works for this Webhook ID
            try {
                // We try to fetch the Webhook ID using the user's token.
                // If this succeeds, IT'S A MATCH.
                const testUrl = `https://graph.instagram.com/v24.0/${webhookId}?fields=id&access_token=${recentUser.access_token}`
                const testRes = await fetch(testUrl)
                
                if (testRes.ok) {
                    console.log(`[v0] ✅ MATCH CONFIRMED! Auto-linking ID ${webhookId} to ${recentUser.username}`)
                    
                    // 3. UPDATE THE DB AUTOMATICALLY
                    // We save this ID as the 'business_account_id' (or page_id) so it works forever.
                    await supabase
                        .from("users")
                        .update({ 
                            business_account_id: webhookId, // Save as main ID
                            page_id: webhookId              // Save as Shadow ID too (safety)
                        })
                        .eq("id", recentUser.id)

                    // 4. Use this user for the current message
                    user = recentUser
                    // Update local object so we can reply now
                    user.business_account_id = webhookId 
                } else {
                    console.log(`[v0] ❌ Token mismatch. This ID does not belong to ${recentUser.username}`)
                }
            } catch (e) {
                console.error("[v0] Self-Heal Verification Failed", e)
            }
         }
      }
      // ============================================================
      // END SELF-HEALING
      // ============================================================

      if (!user) {
         console.log(`[v0] ❌ Could not resolve User for ID ${webhookId}`)
         continue
      }

      const { data: automations } = await supabase
        .from("automations")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)

      if (!automations?.length) continue

      // ============================================================
      //  PART A: COMMENTS
      // ============================================================
      if (entry.changes) {
        for (const change of entry.changes) {
            if (change.field === 'comments' && change.value?.text) {
                const commentId = change.value.id
                const commentText = change.value.text.toLowerCase().trim()
                const senderId = change.value.from.id
                
                // Safety check for self-reply
                if (senderId === webhookId || senderId === user.business_account_id || senderId === user.page_id) continue

                const match = automations.find(a => 
                     a.trigger_type === "keyword" && 
                     a.trigger_value.split(",").some((k: string) => new RegExp(`\\b${k.trim()}\\b`, "i").test(commentText))
                )

                if (match) {
                    console.log(`[v0] ✅ Comment Match: "${match.name}"`)
                    const content = match.response_content
                    const replies = ["Check your DMs! 📥", "Sent! 🔥", "Check inbox! ✨"]
                    const randomReply = replies[Math.floor(Math.random() * replies.length)]

                    // Public Reply
                    await fetch(
                        `https://graph.instagram.com/v24.0/${commentId}/replies?access_token=${encodeURIComponent(user.access_token)}`,
                        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: randomReply }) }
                    ).catch(e => console.error(e))

                    // Private Reply
                    let apiBody: any = { recipient: { comment_id: commentId } }
                    if (content.message) apiBody.message = { text: content.message }
                    else if (content.card) {
                        const link = content.card.buttons?.[0]?.url || ""
                        apiBody.message = { text: `${content.card.title}\n${content.card.subtitle || ""}\n${link}` } 
                    }
                    
                    await fetch(
                        `https://graph.instagram.com/v24.0/me/messages?access_token=${encodeURIComponent(user.access_token)}`,
                        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(apiBody) }
                    ).catch(e => console.error(e))
                }
            }
        }
      }

      // ============================================================
      //  PART B: MESSAGES (DMs)
      // ============================================================
      if (entry.messaging) {
        for (const event of entry.messaging) {
            if (event.read || event.delivery || event.reaction || event.message?.is_echo) continue;

            const senderId = event.sender.id 
            if (senderId === webhookId || senderId === user.business_account_id || senderId === user.page_id) continue
            
            let triggerType = "", triggerValue = ""

            if (event.message?.text) {
                triggerType = "keyword"
                triggerValue = event.message.text.toLowerCase().trim()
            } else if (event.postback?.payload) {
                triggerType = "postback"
                triggerValue = event.postback.payload
            } else {
                continue
            }
            
            console.log(`[v0] 📩 DM from ${senderId}: "${triggerValue}"`)

            let match = null
            if (triggerType === "postback") {
                if (triggerValue.startsWith('UNLOCK_CONTENT_')) {
                    const ruleId = triggerValue.replace('UNLOCK_CONTENT_', '')
                    match = automations.find(a => a.id === ruleId)
                } else {
                    match = automations.find(a => a.trigger_type === "postback" && a.trigger_value === triggerValue)
                }
            } else {
                match = automations.find(a => 
                     a.trigger_type === "keyword" && 
                     a.trigger_value.split(",").some((k:string) => new RegExp(`\\b${k.trim()}\\b`, "i").test(triggerValue))
                )
            }

            if (!match) {
                console.log(`[v0] ❌ No match.`)
                continue 
            }

            console.log(`[v0] ✅ Match: "${match.name}"`)
            const content = match.response_content
            const apiBody: any = { recipient: { id: senderId } }

            if (content.message) {
                apiBody.message = { text: content.message }
            } else if (content.card) {
                const card = content.card
                const apiButtons = card.buttons.map((b: any) => ({
                    type: b.type, title: b.title, url: b.url || undefined, payload: b.payload || undefined,
                }))
                const element: any = { title: card.title, buttons: apiButtons }
                if (card.subtitle) element.subtitle = card.subtitle
                if (card.image_url && card.image_url.startsWith("http")) element.image_url = card.image_url
                apiBody.message = { attachment: { type: "template", payload: { template_type: "generic", elements: [element] } } }
            }

            // Follow Gate Logic
            const isUnlockEvent = triggerType === 'postback' && triggerValue.startsWith('UNLOCK_CONTENT_')
            if (content.check_follow === true && !isUnlockEvent) {
                apiBody.message = {
                     attachment: {
                        type: "template",
                        payload: {
                            template_type: "generic",
                            elements: [{
                                title: "🔒 Content Locked",
                                subtitle: `Please follow @${user.username} to see this!`,
                                buttons: [
                                    { type: "web_url", url: `https://instagram.com/${user.username}`, title: "Follow Us" },
                                    { type: "postback", title: "I Followed! ✅", payload: `UNLOCK_CONTENT_${match.id}` }
                                ]
                            }]
                        }
                    }
                }
            }

            // SEND REPLY
            try {
                const res = await fetch(
                    `https://graph.instagram.com/v24.0/me/messages?access_token=${encodeURIComponent(user.access_token)}`,
                    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(apiBody) }
                )
                const json = await res.json()
                if (json.error) console.error("[v0] 🔴 Reply Failed:", json.error)
                else console.log("[v0] 🟢 Reply Sent!")
            } catch (e) {
                console.error("[v0] Network Error:", e)
            }
        }
      }
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ ok: true })
  }
}
