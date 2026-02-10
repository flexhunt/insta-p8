"use client"

import { Activity } from "lucide-react"

export default function AnalyticsPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-in fade-in duration-700">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-6 ring-1 ring-white/10">
                <Activity className="w-10 h-10 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Deep Analytics</h1>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
                We're building a comprehensive analytics suite to help you track engagement, conversions, and automation performance.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold uppercase tracking-widest ring-1 ring-purple-500/20">
                Coming Soon
            </div>
        </div>
    )
}
