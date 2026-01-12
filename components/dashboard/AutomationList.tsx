"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Search, Trash2, Lock, Globe, MapPin, Instagram, Zap } from "lucide-react"
import type { Automation } from "@/lib/types"

interface AutomationListProps {
  automations: Automation[]
  onDelete: (id: string) => void
  userId: string
}

export function AutomationList({ automations, onDelete, userId }: AutomationListProps) {
  const [mediaMap, setMediaMap] = useState<Record<string, string>>({})
  const [loadingMedia, setLoadingMedia] = useState(false)

  const globalRules = automations.filter((rule) => !rule.specific_media_id)
  const postSpecificRules = automations.filter((rule) => rule.specific_media_id)

  // 1. Fetch Media to get Thumbnails
  useEffect(() => {
    if (!userId || postSpecificRules.length === 0) return

    const fetchMedia = async () => {
      setLoadingMedia(true)
      try {
        const res = await fetch(`/api/instagram/media?userId=${userId}`)
        const data = await res.json()

        if (data.data && Array.isArray(data.data)) {
          const map: Record<string, string> = {}
          data.data.forEach((item: any) => {
            map[item.id] = item.thumbnail_url || item.media_url
          })
          setMediaMap(map)
        }
      } catch (e) {
        console.error("Failed to load thumbnails", e)
      } finally {
        setLoadingMedia(false)
      }
    }

    fetchMedia()
  }, [userId, automations.length])

  // 2. Helper Component for Rows
  const RuleRow = ({ rule, isSpecific = false, index }: { rule: Automation; isSpecific?: boolean; index: number }) => {
    const imageUrl = rule.specific_media_id ? mediaMap[rule.specific_media_id] : null

    return (
      <tr
        className="group border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
        style={{
          animationDelay: `${index * 50}ms`
        }}
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-4">
            {isSpecific ? (
              <div className="h-12 w-12 rounded-lg overflow-hidden bg-white/5 shrink-0 border border-white/10 relative shadow-sm group-hover:border-purple-500/30 transition-colors">
                {imageUrl ? (
                  <img src={imageUrl} alt="Post" className="h-full w-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Instagram className="w-5 h-5 text-white/20" />
                  </div>
                )}
              </div>
            ) : (
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
                <Globe className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="font-semibold text-sm text-white group-hover:text-purple-300 transition-colors">{rule.name}</div>
              {isSpecific && (
                <div className="text-[10px] text-muted-foreground font-mono mt-1 opacity-60">
                  ID: {rule.specific_media_id?.slice(0, 8)}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 group-hover:border-purple-500/30 transition-colors">
            <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Trigger:</span>
            <code className="text-purple-300 text-xs font-mono font-bold">
              {rule.trigger_value}
            </code>
          </div>
        </td>
        <td className="px-6 py-4 text-muted-foreground text-xs">
          <div className="flex items-center gap-2">
            {rule.response_content?.check_follow && (
              <span className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border border-yellow-500/20">
                <Lock className="w-3 h-3" /> Follow Gate
              </span>
            )}
            <span className={`px-2 py-1 rounded text-[10px] font-medium border ${rule.response_content?.card
                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                : "bg-slate-700/30 text-slate-300 border-slate-700/50"
              }`}>
              {rule.response_content?.card ? "Rich Card" : "Text Reply"}
            </span>
          </div>
        </td>
        <td className="px-6 py-4 text-right">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(rule.id)}
            className="h-8 w-8 text-muted-foreground hover:bg-red-500/20 hover:text-red-400 transition-all opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 slide-in-from-bottom-4">

      {/* Search Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          Active Automations
          <span className="bg-white/10 text-white px-2 py-0.5 rounded-full text-[10px]">{automations.length}</span>
        </h2>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-purple-400 transition-colors" />
          <input
            className="bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs w-64 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-white placeholder:text-muted-foreground/60 backdrop-blur-sm"
            placeholder="Search rules..."
          />
        </div>
      </div>

      {automations.length === 0 ? (
        // Premium Empty State
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-16 text-center animate-in zoom-in-95 duration-500">
          <div className="relative h-20 w-20 mx-auto mb-6 group">
            <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
            <div className="relative h-full w-full bg-black/40 rounded-full border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              <Zap className="w-8 h-8 text-muted-foreground group-hover:text-yellow-400 transition-colors" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No automations configured</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            You haven't set up any automated responses yet. Use the <strong className="text-purple-400">New Automation</strong> form to create your first trigger.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* GLOBAL RULES TABLE */}
          {globalRules.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-400 ml-1">
                <Globe className="w-4 h-4" />
                Global Rules
              </div>
              <div className="rounded-2xl border border-white/5 overflow-hidden bg-black/40 backdrop-blur-md shadow-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.03] border-b border-white/5 text-muted-foreground uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-bold">Rule Name</th>
                      <th className="px-6 py-4 font-bold">Trigger</th>
                      <th className="px-6 py-4 font-bold">Config</th>
                      <th className="px-6 py-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {globalRules.map((rule, idx) => (
                      <RuleRow key={rule.id} rule={rule} index={idx} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* POST SPECIFIC RULES TABLE */}
          {postSpecificRules.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-400 ml-1">
                <MapPin className="w-4 h-4" />
                Specific Post Rules
              </div>
              <div className="rounded-2xl border border-white/5 overflow-hidden bg-black/40 backdrop-blur-md shadow-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.03] border-b border-white/5 text-muted-foreground uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-bold">Attached Post</th>
                      <th className="px-6 py-4 font-bold">Trigger</th>
                      <th className="px-6 py-4 font-bold">Config</th>
                      <th className="px-6 py-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {postSpecificRules.map((rule, idx) => (
                      <RuleRow key={rule.id} rule={rule} isSpecific={true} index={idx} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
