"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { Activity, Users, MessageCircle, Zap, Loader2 } from "lucide-react"

interface DashboardStats {
    metrics: {
        totalAutomations: number
        activeTriggers: number
        audienceReached: number
        messagesSent: number
    }
    recentActivity: Array<{
        id: string
        content: string
        created_at: string
        recipient?: {
            recipient_username: string
        }
    }>
}

export default function DashboardPage() {
    const { username, userId, isLoading: isSessionLoading } = useInstagramSession()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!userId) return

        const fetchStats = async () => {
            try {
                const res = await fetch(`/api/dashboard/stats?userId=${userId}`)
                const data = await res.json()
                if (data && !data.error) {
                    setStats(data)
                }
            } catch (err) {
                console.error("Failed to load dashboard stats", err)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [userId])

    if (isSessionLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700">
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Welcome back, {username}</h1>
                    <p className="text-muted-foreground">Here's what's happening with your automations today.</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Automations"
                    value={stats?.metrics.totalAutomations.toString() || "0"}
                    trend="Active"
                    icon={<Zap className="w-5 h-5 text-purple-400" />}
                />
                <StatCard
                    title="Messages Sent"
                    value={stats?.metrics.messagesSent.toString() || "0"}
                    trend="Lifetime"
                    icon={<MessageCircle className="w-5 h-5 text-blue-400" />}
                />
                <StatCard
                    title="Active Triggers"
                    value={stats?.metrics.activeTriggers.toString() || "0"}
                    trend="Running"
                    icon={<Activity className="w-5 h-5 text-emerald-400" />}
                />
                <StatCard
                    title="Audience Reached"
                    value={stats?.metrics.audienceReached.toString() || "0"}
                    trend="Unique Users"
                    icon={<Users className="w-5 h-5 text-pink-400" />}
                />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-6 bg-white/5 border-white/10 backdrop-blur-sm">
                    <h3 className="font-bold text-white mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                            stats.recentActivity.map((msg) => (
                                <div key={msg.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                        <MessageCircle className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm text-white font-medium truncate">
                                            Auto-reply to @{msg.recipient?.recipient_username || "user"}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate w-full max-w-[300px]">{msg.content}</p>
                                    </div>
                                    <div className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center text-muted-foreground text-sm">
                                No recent activity found.
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="p-6 bg-white/5 border-white/10 backdrop-blur-sm">
                    <h3 className="font-bold text-white mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-24 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center hover:bg-white/5 cursor-pointer transition-colors group">
                            <Zap className="w-6 h-6 text-muted-foreground group-hover:text-purple-400 mb-2" />
                            <span className="text-xs font-medium text-muted-foreground">New Rule</span>
                        </div>
                        <div className="h-24 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center hover:bg-white/5 cursor-pointer transition-colors group">
                            <Users className="w-6 h-6 text-muted-foreground group-hover:text-pink-400 mb-2" />
                            <span className="text-xs font-medium text-muted-foreground">View Audience</span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}

function StatCard({ title, value, trend, icon }: { title: string, value: string, trend: string, icon: React.ReactNode }) {
    return (
        <Card className="p-6 bg-black/40 border-white/10 backdrop-blur-md hover:bg-white/5 transition-colors cursor-pointer group">
            <div className="flex items-start justify-between mb-2">
                <span className="p-2 bg-white/5 rounded-lg ring-1 ring-white/10 group-hover:ring-purple-500/50 transition-all">{icon}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground`}>
                    {trend}
                </span>
            </div>
            <div className="mt-4">
                <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">{title}</p>
            </div>
        </Card>
    )
}

