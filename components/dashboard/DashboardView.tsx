"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Sparkles, Brain, Loader2 } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { Switch } from "@/components/ui/switch"
// 👇 1. Import is here (Good)
import { IceBreakers } from "@/components/dashboard/IceBreakers"
import { AutomationList } from "@/components/dashboard/AutomationList"
import { CreateRuleForm } from "@/components/dashboard/CreateRuleForm"
import type { Automation } from "@/lib/types"

interface DashboardViewProps {
  username: string
  userId: string
  automations: Automation[]
  onDeleteRule: (id: string) => void
  onLogout: () => void
  onRefresh: () => void
}

export function DashboardView({
  username,
  userId,
  automations,
  onDeleteRule,
  onLogout,
  onRefresh,
}: DashboardViewProps) {
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiLoading, setAiLoading] = useState(true)
  const [aiToggling, setAiToggling] = useState(false)

  useEffect(() => {
    if (!userId) return
    fetch(`/api/groq/auto-reply?userId=${userId}`)
      .then(res => res.json())
      .then(data => setAiEnabled(data.enabled ?? false))
      .catch(() => {})
      .finally(() => setAiLoading(false))
  }, [userId])

  const handleToggleAI = async () => {
    if (aiToggling) return
    setAiToggling(true)
    const newState = !aiEnabled
    try {
      const res = await fetch("/api/groq/auto-reply", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, enabled: newState }),
      })
      if (res.ok) setAiEnabled(newState)
    } catch {}
    setAiToggling(false)
  }

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans selection:bg-purple-500/30">
      <Sidebar username={username} onLogout={onLogout} />

      <main className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-br from-black via-zinc-950 to-purple-950/20">
        {/* Dynamic Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(120,60,255,0.03),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(120,60,255,0.05),transparent_40%)]" />

        <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-8 z-10 sticky top-0">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground/80">
            <span className="text-white">Dashboard</span>
            <span className="text-muted-foreground/60">/</span>
            <span className="text-purple-400">Automations</span>
          </div>
          <div className="flex items-center gap-3">
            {/* AI Auto-Reply Toggle */}
            {aiLoading ? (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            ) : (
              <button
                onClick={handleToggleAI}
                disabled={aiToggling}
                className={`flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide uppercase transition-all ${
                  aiEnabled
                    ? "bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                    : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10"
                }`}
              >
                <Brain className={`w-3.5 h-3.5 ${aiToggling ? "animate-pulse" : ""}`} />
                {aiToggling ? "..." : aiEnabled ? "AI ON" : "AI OFF"}
              </button>
            )}
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 text-[11px] font-bold text-emerald-400 tracking-wide uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              System Active
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-10 space-y-8 max-w-[1600px] mx-auto w-full z-0 scrollbar-hide">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            <div className="xl:col-span-8 space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-2">
                    Start Automating
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-lg">
                    Manage your Instagram interactions with powerful, keyword-based rules.
                  </p>
                </div>
              </div>
              <AutomationList automations={automations} onDelete={onDeleteRule} userId={userId} />
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
                  <CreateRuleForm userId={userId} onSuccess={onRefresh} />
                </Card>
              </div>

              {/* 2. Ice Breakers */}
              <IceBreakers userId={userId} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
