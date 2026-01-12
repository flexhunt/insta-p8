"use client"

import { Card } from "@/components/ui/card"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { Activity, Users, MessageCircle, Zap } from "lucide-react"

export default function DashboardPage() {
    const { username, isLoading } = useInstagramSession()

    if (isLoading) return null

    return (
        <div className="p-8 space-y-8">
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
                    value="12"
                    trend="+2.5%"
                    icon={<Zap className="w-5 h-5 text-purple-400" />}
                />
                <StatCard
                    title="Messages Sent"
                    value="1,234"
                    trend="+12%"
                    icon={<MessageCircle className="w-5 h-5 text-blue-400" />}
                />
                <StatCard
                    title="Active Triggers"
                    value="8"
                    trend="Stable"
                    icon={<Activity className="w-5 h-5 text-emerald-400" />}
                />
                <StatCard
                    title="Audience Reached"
                    value="5.2k"
                    trend="+18%"
                    icon={<Users className="w-5 h-5 text-pink-400" />}
                />
            </div>

            {/* Recent Activity (Placeholder) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-6 bg-white/5 border-white/10 backdrop-blur-sm">
                    <h3 className="font-bold text-white mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                                    <MessageCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-white font-medium">Auto-reply sent to @user{i}</p>
                                    <p className="text-xs text-muted-foreground">2 minutes ago</p>
                                </div>
                            </div>
                        ))}
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
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend.includes('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-muted-foreground'}`}>
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
