import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { createReelsContainer, getContainerStatus, publishContainer } from "@/lib/instagram-publishing"

// Helper to wait
const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

export async function GET(request: NextRequest) {
    // Security check: In production, verify a "Cron-Secret" header
    // const authHeader = request.headers.get('authorization')
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await getSupabaseServerClient()
    const results = []

    try {
        // 1. Get Due Schedules
        const { data: configs } = await supabase
            .from("scheduler_config")
            .select("*")
            .eq("is_running", true)
            .lte("next_run_at", new Date().toISOString())

        if (!configs || configs.length === 0) {
            return NextResponse.json({ message: "No schedules due", ran: 0 })
        }

        for (const config of configs) {
            const log = { user_id: config.user_id, status: 'skipped', reason: '' }

            try {
                // 2. Validate Time Window
                const now = new Date()
                const currentHour = now.getHours()
                const currentMinute = now.getMinutes()
                const currentTimeVal = currentHour * 60 + currentMinute

                // Parse Window
                const [startH, startM] = (config.start_time || "09:00").split(':').map(Number)
                const [endH, endM] = (config.end_time || "21:00").split(':').map(Number)
                const startTimeVal = startH * 60 + startM
                const endTimeVal = endH * 60 + endM

                // If outside window, just Reschedule (Checking again in X minutes)
                // Actually, if we just reschedule for "Interval", we might skip the whole day if interval > window.
                // Better logic: If outside window, check if we are BEFORE window or AFTER.
                // If AFTER window, set next_run to START of next day.
                // If BEFORE window, set next_run to START of today.
                // BUT, simplest is: "If outside window, do nothing/skip logic, but DO NOT update next_run_at heavily?"
                // No, if is_running is true and next_run_at passed, we must update next_run_at OR we will keep hitting this loop every cron tick.
                // Strategy: If outside window, update next_run_at to (Now + 15 mins) just to check again soon? 
                // OR better: Update next_run_at to the Start Time of the next valid window.

                const isInside = currentTimeVal >= startTimeVal && currentTimeVal <= endTimeVal

                if (!isInside) {
                    log.reason = `Outside window (${config.start_time}-${config.end_time})`
                    // Calculate next valid time
                    let nextValid = new Date()
                    if (currentTimeVal > endTimeVal) {
                        // Too late, move to tomorrow start
                        nextValid.setDate(nextValid.getDate() + 1)
                        nextValid.setHours(startH, startM, 0, 0)
                    } else {
                        // Too early, create date for today start
                        nextValid.setHours(startH, startM, 0, 0)
                    }

                    await supabase
                        .from("scheduler_config")
                        .update({ next_run_at: nextValid.toISOString() })
                        .eq("user_id", config.user_id)

                    results.push(log)
                    continue
                }

                // 3. Get User Token
                const { data: user } = await supabase
                    .from("users")
                    .select("access_token")
                    .eq("id", config.user_id)
                    .single()

                if (!user?.access_token) {
                    log.status = 'error'; log.reason = 'No token';
                    results.push(log); continue;
                }

                // 4. Select Content (Rotator Logic)
                let { data: clip } = await supabase
                    .from("content_pool")
                    .select("*")
                    .eq("user_id", config.user_id)
                    .eq("is_active", true)
                    .gte("sequence_index", config.current_sequence_index)
                    .order("sequence_index", { ascending: true }) // Find first one >= current
                    .limit(1)
                    .single()

                // If no clip found (end of list), Loop back to 1
                if (!clip) {
                    const { data: firstClip } = await supabase
                        .from("content_pool")
                        .select("*")
                        .eq("user_id", config.user_id)
                        .eq("is_active", true)
                        .order("sequence_index", { ascending: true }) // First one
                        .limit(1)
                        .single()

                    clip = firstClip
                }

                if (!clip) {
                    log.status = 'error'; log.reason = 'Pool empty';
                    // Push next_run forward to avoid spamming db
                    const nextTime = new Date(Date.now() + (config.interval_minutes * 60000))
                    await supabase.from("scheduler_config").update({ next_run_at: nextTime.toISOString() }).eq("user_id", config.user_id)
                    results.push(log); continue;
                }

                // 5. Publish to Instagram
                console.log(`[Scheduler] Posting Clip #${clip.sequence_index} for User ${config.user_id}`)

                // A. Create Container
                const containerId = await createReelsContainer(user.access_token, clip.video_url, clip.caption)

                // B. Wait for Processing (Simple Polling)
                let status = 'IN_PROGRESS'
                let attempts = 0
                while (status === 'IN_PROGRESS' && attempts < 10) {
                    await delay(3000) // Wait 3s
                    status = await getContainerStatus(user.access_token, containerId)
                    attempts++
                }

                if (status !== 'FINISHED') {
                    throw new Error(`Media processing failed or timed out. Status: ${status}`)
                }

                // C. Publish
                const mediaId = await publishContainer(user.access_token, containerId)

                // 6. Log Success
                log.status = 'success'
                await supabase.from("reels_posts").insert({
                    user_id: config.user_id,
                    content_pool_id: clip.id,
                    video_url: clip.video_url,
                    caption: clip.caption,
                    ig_container_id: containerId,
                    ig_media_id: mediaId,
                    status: 'PUBLISHED',
                    published_at: new Date().toISOString()
                })

                // 7. Update Scheduler State
                const nextIndex = clip.sequence_index + 1
                const nextRunTime = new Date(Date.now() + (config.interval_minutes * 60000))

                await supabase.from("scheduler_config").update({
                    current_sequence_index: nextIndex,
                    next_run_at: nextRunTime.toISOString(),
                    last_run_at: new Date().toISOString()
                }).eq("user_id", config.user_id)

                results.push(log)

            } catch (err: any) {
                console.error(`[Scheduler] Error for user ${config.user_id}:`, err)
                // Update next_run anyway so we don't get stuck in error loop forever? 
                // Or maybe try again in 15 mins? 
                // Let's postpone by 15 mins on error
                const retryTime = new Date(Date.now() + 15 * 60000)
                await supabase.from("scheduler_config").update({ next_run_at: retryTime.toISOString() }).eq("user_id", config.user_id)

                await supabase.from("reels_posts").insert({
                    user_id: config.user_id,
                    status: 'FAILED',
                    error_message: err.message
                })
                results.push({ user: config.user_id, status: 'error', reason: err.message })
            }
        }

        return NextResponse.json({ processed: results.length, details: results })

    } catch (error: any) {
        console.error("[Scheduler] Critical Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
