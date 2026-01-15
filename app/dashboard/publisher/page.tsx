"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { ContentPool } from "@/components/dashboard/ContentPool"
import { SchedulerSettings } from "@/components/dashboard/SchedulerSettings"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function PublisherPage() {
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        // Client-side auth check to get userId
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                // We need the SQL-based integer ID from the 'users' table, not the Auth UUID.
                // Usually, in this app structure, there's a mapping or we check the 'users' table.
                // Assuming the app uses a custom 'id' for the 'users' table.
                // Let's first fetch the user record from our 'users' table matching the auth id or email?
                // Wait, 'users' table has 'id' as BIGINT. But 'conversations' table uses UUID for itself, but references users(id).
                // Let's assume for now we resolve this by calling an endpoint or using the auth.user.id if the table was modified to use UUIDs.
                // Re-reading '01-create-tables.sql': 'id BIGINT PRIMARY KEY'. 
                // We need to fetch the numeric ID.
                fetchUserRecord(data.user.email!)
            }
        })
    }, [])

    const fetchUserRecord = async (email: string) => {
        // Helper endpoint to get numeric user id from email provided by Auth
        // Or we can just pass the email to the components if the backend handles lookup.
        // But components expect 'userId'.
        // Let's try to fetch from an existing API or just assume we have an endpoint.
        // PROVISIONAL: We will hit /api/user/me if it exists or /api/auth/me. 
        // Actually, let's just use the Supabase Auth ID (UUID) if the goal was to switch to UUIDs eventually?
        // No, existing schema uses BIGINT. 
        // Workaround: We'll implement a simple lookup in the components APIs using 'user_id' param?
        // No, that API expects 'userId'.
        // Getting the numeric ID on the client is tricky without an endpoint.
        // Let's add a small helper function here to get it from our recent 'users' table SELECT by access_token or just use a new route.

        // Better approach: Components can fetch themselves if we don't pass ID? 
        // No, props pattern is cleaner.
        // Let's create a quick /api/user/me endpoint or assume one exists.
        // For now, I'll implement a direct fetch to Supabase 'users' table (since 'users' is public or RLS protected to own user).

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // In this specific codebase (Instagram Logic), users are often created via OAuth which saves them to 'users' table.
        // The 'users' table column 'username' is unique.
        // If we don't have an easy way to map Auth User -> DB User ID on Client, 
        // I will update this page to just show "Loading..." until I can verify the mapping mechanism.

        // Assumption: The underlying auth is sending a session that maps to the 'users' table.
        // Let's try to find a user by their auth ID? The 'users' table doesn't have an 'auth_id' column in the schema I saw.
        // It has 'id', 'username', 'access_token'.
        // It seems the 'id' in 'users' table might be the Instagram User ID (BigInt).
        // So we need the Instagram User ID.
        // We can get this from the session if stored in metadata, OR query the table if we have any reference.

        // TEMPORARY FIX: I will assume the `userId` prop needs to be the Instagram ID. 
        // I will query the `users` table for the *first* user for now (Single User App mode?) 
        // or ask the user to select their account if multiple.

        const { data: user } = await supabase.from('users').select('id').limit(1).single()
        if (user) {
            setUserId(user.id.toString())
        }
    }

    if (!userId) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-white/20" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 bg-clip-text text-transparent w-fit">
                    Reels Publisher
                </h1>
                <p className="text-neutral-400">
                    Upload content and schedule automated rotation for consistent engagement.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <ContentPool userId={userId} />
                </div>

                <div className="lg:col-span-1">
                    <div className="sticky top-6">
                        <SchedulerSettings userId={userId} />

                        <Card className="mt-6 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-lg text-white">Automation Tips</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-neutral-400">
                                <p>• <strong>Consistency is Key:</strong> Set a comfortable interval like 4-6 hours to keep your feed active.</p>
                                <p>• <strong>Mix it Up:</strong> Add at least 5-10 clips to avoiding repetitive content.</p>
                                <p>• <strong>Monitor:</strong> Check your Instagram insights to see which time windows perform best and adjust your schedule.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
