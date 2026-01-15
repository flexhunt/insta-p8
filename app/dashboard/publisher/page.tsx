"use client"

import { ContentPool } from "@/components/dashboard/ContentPool"
import { SchedulerSettings } from "@/components/dashboard/SchedulerSettings"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function PublisherPage() {
    const { userId, isLoading } = useInstagramSession()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-white/20" />
            </div>
        )
    }

    if (!userId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
                <h2 className="text-xl font-semibold text-white mb-2">Login Required</h2>
                <p className="text-neutral-400">Please connect your Instagram account to access this feature.</p>
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
