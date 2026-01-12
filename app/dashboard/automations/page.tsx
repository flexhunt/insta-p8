"use client"

import { useState, useCallback, useEffect } from "react"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { AutomationList } from "@/components/dashboard/AutomationList"
import { CreateRuleForm } from "@/components/dashboard/CreateRuleForm"
import { Card } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import { IceBreakers } from "@/components/dashboard/IceBreakers"
import type { Automation } from "@/lib/types"

export default function AutomationsPage() {
    const { userId, isLoading: isSessionLoading } = useInstagramSession()
    const [automations, setAutomations] = useState<Automation[]>([])
    const [isLoading, setIsLoading] = useState(true)

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
        setAutomations((prev) => prev.filter((a) => a.id !== id))
    }

    if (isSessionLoading) return null

    return (
        <div className="px-8 py-10 space-y-8 max-w-[1600px] mx-auto w-full">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-2">
                        Automations Library
                    </h1>
                    <p className="text-muted-foreground text-sm max-w-lg">
                        Manage your active triggers and responses.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                <div className="xl:col-span-8 space-y-8">
                    <AutomationList automations={automations} onDelete={handleDeleteRule} userId={userId || ""} />
                </div>

                <div className="xl:col-span-4 space-y-8 sticky top-10">
                    {/* 1. Create Rule Card */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
                        <Card className="relative bg-black/60 border-white/10 backdrop-blur-2xl p-6 space-y-6 rounded-xl shadow-2xl">
                            <div className="flex items-center gap-3 mb-2 border-b border-white/5 pb-4">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <Sparkles className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">New Automation</h3>
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Configure a new trigger</p>
                                </div>
                            </div>
                            <CreateRuleForm userId={userId || ""} onSuccess={fetchAutomations} />
                        </Card>
                    </div>

                    {/* 2. Ice Breakers */}
                    <IceBreakers userId={userId || ""} />
                </div>
            </div>
        </div>
    )
}
