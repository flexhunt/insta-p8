"use client"

import { useState, useCallback, useEffect } from "react"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { AutomationList } from "@/components/dashboard/AutomationList"
import { CreateRuleForm } from "@/components/dashboard/CreateRuleForm"
import { Card } from "@/components/ui/card"
import { MessageCircle, Send, Sparkles } from "lucide-react"
import { IceBreakers } from "@/components/dashboard/IceBreakers"
import type { Automation } from "@/lib/types"

export default function AutomationsPage() {
    const { userId, isLoading: isSessionLoading } = useInstagramSession()
    const [automations, setAutomations] = useState<Automation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'comment' | 'dm' | 'story'>('comment')

    const fetchAutomations = useCallback(async () => {
        if (!userId) return

        try {
            const res = await fetch(`/api/automations?userId=${userId}`)
            const data = await res.json()
            if (res.ok) {
                setAutomations(Array.isArray(data) ? data : [])
            }
        } catch (err) {
            console.error("Fetch error:", err)
        } finally {
            setIsLoading(false)
        }
    }, [userId])

    useEffect(() => {
        if (userId) {
            fetchAutomations()
        }
    }, [userId, fetchAutomations])

    const handleDeleteRule = async (id: string) => {
        await fetch(`/api/automations?id=${id}`, { method: "DELETE" })
        fetchAutomations()
    }

    if (isSessionLoading) return <div className="p-6 text-center">Loading...</div>
    if (!userId) return <div className="p-6 text-center">Please log in</div>

    // Filter automations by active tab
    const filteredAutomations = automations.filter(a => a.trigger_source === activeTab)

    // Count by source
    const counts = {
        comment: automations.filter(a => a.trigger_source === 'comment').length,
        dm: automations.filter(a => a.trigger_source === 'dm').length,
        story: automations.filter(a => a.trigger_source === 'story').length,
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 bg-clip-text text-transparent">
                        Automation Center
                    </h1>
                    <p className="text-neutral-400 text-sm">
                        Automate Instagram comments and DMs with smart triggers
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 border-b border-white/10 pb-2 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('comment')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-semibold transition-all whitespace-nowrap ${activeTab === 'comment'
                                ? 'bg-purple-500/20 text-purple-300 border-b-2 border-purple-400'
                                : 'text-neutral-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <MessageCircle className="w-4 h-4" />
                        Comments
                        {counts.comment > 0 && (
                            <span className="bg-purple-500/30 text-purple-200 text-xs px-2 py-0.5 rounded-full">
                                {counts.comment}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('dm')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-semibold transition-all whitespace-nowrap ${activeTab === 'dm'
                                ? 'bg-blue-500/20 text-blue-300 border-b-2 border-blue-400'
                                : 'text-neutral-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Send className="w-4 h-4" />
                        DMs
                        {counts.dm > 0 && (
                            <span className="bg-blue-500/30 text-blue-200 text-xs px-2 py-0.5 rounded-full">
                                {counts.dm}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('story')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-semibold transition-all whitespace-nowrap ${activeTab === 'story'
                                ? 'bg-pink-500/20 text-pink-300 border-b-2 border-pink-400'
                                : 'text-neutral-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        Stories
                        <span className="bg-yellow-500/30 text-yellow-200 text-xs px-2 py-0.5 rounded-full">
                            Soon
                        </span>
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'story' ? (
                    <Card className="p-12 text-center">
                        <Sparkles className="w-16 h-16 mx-auto mb-4 text-pink-400 opacity-50" />
                        <h3 className="text-2xl font-bold text-neutral-300 mb-2">Coming Soon!</h3>
                        <p className="text-neutral-500">Story automations will be available in a future update.</p>
                    </Card>
                ) : (
                    <>
                        {/* Create Rule Form */}
                        <Card className="p-6 bg-black/40 backdrop-blur border-white/10">
                            <CreateRuleForm
                                userId={userId}
                                triggerSource={activeTab}
                                onSuccess={fetchAutomations}
                            />
                        </Card>

                        {/* Ice Breakers (DM only) */}
                        {activeTab === 'dm' && (
                            <Card className="p-6 bg-black/40 backdrop-blur border-white/10">
                                <IceBreakers userId={userId} />
                            </Card>
                        )}

                        {/* Automation List */}
                        <Card className="p-6 bg-black/40 backdrop-blur border-white/10">
                            {isLoading ? (
                                <div className="text-center py-12 text-neutral-400">Loading automations...</div>
                            ) : (
                                <AutomationList
                                    automations={filteredAutomations}
                                    onDelete={handleDeleteRule}
                                    userId={userId}
                                />
                            )}
                        </Card>
                    </>
                )}
            </div>
        </div>
    )
}
