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
        <div className="min-h-screen bg-black p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        Automation Center
                    </h1>
                    <p className="text-neutral-500 text-sm">
                        Manage your automated responses and triggers.
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 border-b border-white/10 pb-0 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('comment')}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap text-sm font-medium ${activeTab === 'comment'
                            ? 'border-white text-white'
                            : 'border-transparent text-neutral-500 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <MessageCircle className="w-4 h-4" />
                        Comments
                        {counts.comment > 0 && (
                            <span className="bg-white/10 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                                {counts.comment}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('dm')}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap text-sm font-medium ${activeTab === 'dm'
                            ? 'border-white text-white'
                            : 'border-transparent text-neutral-500 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Send className="w-4 h-4" />
                        DMs
                        {counts.dm > 0 && (
                            <span className="bg-white/10 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                                {counts.dm}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('story')}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap text-sm font-medium ${activeTab === 'story'
                            ? 'border-white text-white'
                            : 'border-transparent text-neutral-500 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        Stories
                        {counts.story > 0 && (
                            <span className="bg-white/10 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                                {counts.story}
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab Content */}
                <>
                    {/* Create Rule Form */}
                    <Card className="p-6 bg-black border border-white/10 shadow-none">
                        <CreateRuleForm
                            userId={userId}
                            triggerSource={activeTab}
                            onSuccess={fetchAutomations}
                        />
                    </Card>

                    {/* Ice Breakers (DM only) */}
                    {activeTab === 'dm' && (
                        <Card className="p-6 bg-black border border-white/10 shadow-none">
                            <IceBreakers userId={userId} />
                        </Card>
                    )}

                    {/* Automation List */}
                    <Card className="p-6 bg-black border border-white/10 shadow-none">
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
            </div>
        </div>
    )
}
