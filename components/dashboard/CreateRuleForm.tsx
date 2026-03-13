"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Lock, Film, ArrowRight, ArrowLeft, Check, Sparkles, MessageCircle, Send, AtSign, Heart, MessageSquare } from "lucide-react"
import { TagInput } from "@/components/ui/tag-input"
import type { ProButton } from "@/lib/types"
import { toast } from "sonner"

interface CreateRuleFormProps {
  userId: string
  triggerSource: 'comment' | 'dm' | 'story'
  onSuccess: () => void
}

export function CreateRuleForm({ userId, triggerSource, onSuccess }: CreateRuleFormProps) {
  const [step, setStep] = useState(1)

  // Step 1: Trigger
  const [replyToAll, setReplyToAll] = useState(false)
  const [triggers, setTriggers] = useState<string[]>([])
  const [storyTriggerType, setStoryTriggerType] = useState<'mention' | 'reaction' | 'reply'>('mention')
  const [selectedReel, setSelectedReel] = useState<any | null>(null)
  const [showReelPicker, setShowReelPicker] = useState(false)

  // Step 2: Response
  const [type, setType] = useState<"text" | "card">("text")
  const [messageText, setMessageText] = useState("")
  const [cardTitle, setCardTitle] = useState("")
  const [cardSubtitle, setCardSubtitle] = useState("")
  const [cardImage, setCardImage] = useState("")
  const [buttons, setButtons] = useState<ProButton[]>([])

  // Step 3: Settings
  const [name, setName] = useState("")
  const [checkFollow, setCheckFollow] = useState(false)

  // Media
  const [reels, setReels] = useState<any[]>([])
  const [loadingReels, setLoadingReels] = useState(false)

  useEffect(() => {
    if (userId) loadReels()
  }, [userId])

  // Auto-generate name suggestion
  useEffect(() => {
    if (name) return // Don't overwrite user's custom name
    if (replyToAll) {
      setName(`All Comments → Reply`)
    } else if (triggers.length > 0) {
      setName(`${triggers.slice(0, 2).join(", ")} → Auto Reply`)
    }
  }, [triggers, replyToAll])

  const loadReels = async () => {
    try {
      setLoadingReels(true)
      const res = await fetch(`/api/instagram/media?userId=${userId}`)
      const responseJson = await res.json()
      if (responseJson.data && Array.isArray(responseJson.data)) setReels(responseJson.data)
      else if (Array.isArray(responseJson)) setReels(responseJson)
    } catch (err) {
      console.error("[v0] Failed to load reels:", err)
    } finally {
      setLoadingReels(false)
    }
  }

  const handleAddButton = () => {
    if (buttons.length >= 3) return
    setButtons([...buttons, { id: Date.now().toString(), type: "web_url", title: "", url: "", payload: "" }])
  }

  const updateButton = (id: string, field: keyof ProButton, value: string) => {
    setButtons(buttons.map((b) => (b.id === id ? { ...b, [field]: value } : b)))
  }

  const removeButton = (id: string) => {
    setButtons(buttons.filter((b) => b.id !== id))
  }

  // Validation per step
  const canProceedStep1 = () => {
    const isStoryMentionOrReaction = triggerSource === 'story' && (storyTriggerType === 'mention' || storyTriggerType === 'reaction')
    if (replyToAll && !selectedReel) {
      toast.error("Post select karo", { description: "Reply-All ke liye ek post select karna zaroori hai." })
      return false
    }
    if (!replyToAll && !isStoryMentionOrReaction && triggers.length === 0) {
      toast.error("Keywords add karo", { description: "Kam se kam ek keyword trigger daalo." })
      return false
    }
    return true
  }

  const canProceedStep2 = () => {
    if (type === "text" && !messageText.trim()) {
      toast.error("Reply message likho", { description: "Kya reply jaayega wo toh likho!" })
      return false
    }
    if (type === "card" && !cardTitle.trim()) {
      toast.error("Card ka title daalo", { description: "Rich card me title zaroori hai." })
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Rule ka naam do", { description: "Apni automation ko ek naam do." })
      return
    }

    const content: any = { check_follow: checkFollow }
    if (type === "text") {
      content.message = messageText
    } else {
      const cleanButtons = buttons
        .map((b) => {
          if (b.type === "web_url") {
            let cleanUrl = b.url?.trim() || ""
            if (cleanUrl.startsWith("https://https://")) cleanUrl = cleanUrl.replace("https://https://", "https://")
            return { type: "web_url", title: b.title, url: cleanUrl }
          }
          return { type: "postback", title: b.title, payload: b.payload }
        })
        .filter((b) => b.title)

      content.card = {
        title: cardTitle,
        subtitle: cardSubtitle || undefined,
        image_url: cardImage || undefined,
        buttons: cleanButtons,
      }
    }

    try {
      const loadingToast = toast.loading("Creating...")
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name,
          trigger_source: triggerSource,
          trigger_type: replyToAll ? "reply_all" : (triggerSource === 'story' ? storyTriggerType : "keyword"),
          trigger_value: replyToAll ? "ALL_COMMENTS" :
            (triggerSource === 'story' && storyTriggerType === 'mention') ? "ALL_MENTIONS" :
              (triggerSource === 'story' && storyTriggerType === 'reaction' && triggers.length === 0) ? "ALL_REACTIONS" :
                triggers.length > 0 ? triggers.join(", ") : "ALL",
          content,
          specific_media_id: selectedReel?.id || null,
        }),
      })

      toast.dismiss(loadingToast)
      if (res.ok) {
        toast.success("Automation Created! 🎉")
        // Reset everything
        setStep(1)
        setName("")
        setTriggers([])
        setReplyToAll(false)
        setMessageText("")
        setCardTitle("")
        setCardSubtitle("")
        setCardImage("")
        setButtons([])
        setSelectedReel(null)
        setCheckFollow(false)
        onSuccess()
      } else {
        toast.error("Failed", { description: "Please try again." })
      }
    } catch (err) {
      toast.error("Network Error")
    }
  }

  // --- SUB COMPONENTS ---

  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <button
            onClick={() => {
              if (s < step) setStep(s)
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              s === step
                ? "bg-white text-black scale-110 shadow-lg shadow-white/20"
                : s < step
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-pointer hover:scale-105"
                  : "bg-white/5 text-neutral-600 border border-white/10"
            }`}
          >
            {s < step ? <Check className="w-3.5 h-3.5" /> : s}
          </button>
          {s < 3 && (
            <div className={`w-8 h-px transition-colors duration-500 ${s < step ? "bg-emerald-500/50" : "bg-white/10"}`} />
          )}
        </div>
      ))}
      <span className="text-[10px] text-neutral-500 ml-2 uppercase tracking-wider font-bold">
        {step === 1 ? "Trigger" : step === 2 ? "Response" : "Launch"}
      </span>
    </div>
  )

  const ReelPicker = () => {
    const filteredReels = triggerSource === 'story'
      ? reels.filter((r: any) => r.media_type === 'STORY' || r.media_product_type === 'STORY')
      : reels

    if (loadingReels) {
      return (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-neutral-950 border border-white/10 rounded-xl text-center z-50">
          <p className="text-neutral-400 text-sm">Loading media...</p>
        </div>
      )
    }

    if (filteredReels.length === 0) {
      return (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-neutral-950 border border-white/10 rounded-xl text-center z-50">
          <p className="text-neutral-500 text-sm">{triggerSource === 'story' ? 'No active stories' : 'No posts found'}</p>
        </div>
      )
    }

    return (
      <div className="absolute top-full left-0 right-0 mt-2 max-h-56 overflow-y-auto bg-neutral-950 border border-white/10 rounded-xl z-50 shadow-2xl">
        {filteredReels.map((reel: any) => {
          const isStory = reel.media_type === 'STORY' || reel.media_product_type === 'STORY'
          if (triggerSource === 'story' && !isStory) return null
          const label = isStory ? 'Story' : reel.media_type === 'VIDEO' ? 'Reel' : reel.media_type === 'CAROUSEL_ALBUM' ? 'Carousel' : 'Post'

          return (
            <button
              key={reel.id}
              type="button"
              onClick={() => { setSelectedReel(reel); setShowReelPicker(false) }}
              className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
            >
              {reel.image_url ? (
                <img src={reel.image_url} alt="" className="w-10 h-10 rounded object-cover opacity-80" />
              ) : (
                <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center">
                  <Film className="w-4 h-4 text-neutral-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{reel.caption || 'Untitled'}</p>
                <span className="text-[10px] text-neutral-500 uppercase">{label}</span>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  // DM Preview Bubble
  const DMPreview = () => {
    const previewText = type === "text" ? messageText : cardTitle
    if (!previewText) return null

    return (
      <div className="mt-4 flex justify-end">
        <div className="max-w-[260px] animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm shadow-lg shadow-blue-500/20">
            {type === "text" ? (
              <p className="leading-relaxed">{messageText.slice(0, 120)}{messageText.length > 120 && "..."}</p>
            ) : (
              <div className="space-y-1">
                <p className="font-bold text-xs">{cardTitle}</p>
                {cardSubtitle && <p className="text-[11px] opacity-80">{cardSubtitle}</p>}
                {buttons.filter(b => b.title).map((b, i) => (
                  <div key={i} className="bg-white/20 rounded px-2 py-1 text-[10px] text-center mt-1">{b.title}</div>
                ))}
              </div>
            )}
          </div>
          <p className="text-[10px] text-neutral-600 mt-1 text-right">Preview — yahi message jayega DM me</p>
        </div>
      </div>
    )
  }

  // --- STEP RENDERS ---

  const renderStep1 = () => (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h3 className="text-lg font-bold text-white mb-1">
          {triggerSource === 'comment' ? '💬 Kab reply kare?' :
            triggerSource === 'dm' ? '📩 Kab reply kare?' :
              '📸 Story pe kab react kare?'}
        </h3>
        <p className="text-xs text-neutral-500">
          {triggerSource === 'comment' 
            ? 'Jab koi ye words comment kare, auto reply chalu ho jaayega.'
            : triggerSource === 'dm'
              ? 'Jab koi ye words DM kare, auto reply chalu ho jaayega.'
              : 'Jab koi aapki story ke saath interact kare.'}
        </p>
      </div>

      {/* Story type selector */}
      {triggerSource === 'story' && (
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: 'mention' as const, icon: <AtSign className="w-4 h-4" />, label: 'Mentions' },
            { key: 'reaction' as const, icon: <Heart className="w-4 h-4" />, label: 'Reactions' },
            { key: 'reply' as const, icon: <MessageSquare className="w-4 h-4" />, label: 'Replies' },
          ]).map(({ key, icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStoryTriggerType(key)}
              className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1.5 ${
                storyTriggerType === key
                  ? 'border-white bg-white text-black shadow-lg shadow-white/10'
                  : 'border-white/10 text-neutral-400 hover:bg-white/5 hover:border-white/20'
              }`}
            >
              {icon}
              <span className="text-[11px] font-bold">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Reply to all toggle — comments only */}
      {triggerSource === 'comment' && (
        <button
          type="button"
          onClick={() => setReplyToAll(!replyToAll)}
          className={`w-full p-4 rounded-xl border transition-all flex items-center gap-3 ${
            replyToAll ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/5'
          }`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            replyToAll ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-neutral-500'
          }`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="text-left flex-1">
            <p className={`text-sm font-bold ${replyToAll ? 'text-emerald-400' : 'text-white'}`}>Sabko Reply Karo</p>
            <p className="text-[11px] text-neutral-500">Ek specific post pe har comment ka reply</p>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 transition-all ${
            replyToAll ? 'border-emerald-500 bg-emerald-500' : 'border-white/20'
          }`}>
            {replyToAll && <Check className="w-3 h-3 text-black m-auto mt-0.5" />}
          </div>
        </button>
      )}

      {/* Keyword input — conditional */}
      {!(triggerSource === 'comment' && replyToAll) && !(triggerSource === 'story' && storyTriggerType === 'mention') && (
        <div className="space-y-2">
          <Label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider ml-1">
            {triggerSource === 'story' && storyTriggerType === 'reaction' ? 'Emoji Filter (optional)' : 'Keywords'}
          </Label>
          <TagInput
            value={triggers}
            onChange={setTriggers}
            placeholder={
              triggerSource === 'comment' ? 'e.g. hello, price, link' :
                triggerSource === 'story' && storyTriggerType === 'reaction' ? 'e.g. ❤️, 🔥, 👍' :
                  'e.g. hello, hi, menu'
            }
          />
          <p className="text-[10px] text-neutral-600 ml-1">Enter ya comma se add karo</p>
        </div>
      )}

      {/* Post/Reel picker */}
      {(triggerSource === 'comment' || triggerSource === 'story') && (
        <div className="space-y-2">
          <Label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider ml-1">
            {replyToAll ? 'Post Select Karo (Required)' :
              triggerSource === 'story' ? 'Story (Optional)' : 'Post/Reel (Optional)'}
          </Label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowReelPicker(!showReelPicker)}
              className="w-full p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/5 transition-colors text-left flex items-center gap-3"
            >
              {selectedReel ? (
                <>
                  {selectedReel.image_url && (
                    <img src={selectedReel.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{selectedReel.caption || 'No caption'}</p>
                    <p className="text-[10px] text-emerald-400">✓ Selected</p>
                  </div>
                </>
              ) : (
                <span className="text-sm text-neutral-500">
                  {replyToAll ? '📌 Post select karo...' : '📌 Optional — koi bhi post pe (tap to pick)'}
                </span>
              )}
            </button>
            {showReelPicker && <ReelPicker />}
          </div>
        </div>
      )}
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h3 className="text-lg font-bold text-white mb-1">✉️ Kya bhejna hai?</h3>
        <p className="text-xs text-neutral-500">Reply message type karo — ye DM me jayega automatically.</p>
      </div>

      {/* Response type toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setType("text")}
          className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${
            type === "text" ? 'border-white bg-white text-black' : 'border-white/10 text-neutral-400 hover:bg-white/5'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm font-bold">Simple Text</span>
        </button>
        <button
          type="button"
          onClick={() => setType("card")}
          className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${
            type === "card" ? 'border-white bg-white text-black' : 'border-white/10 text-neutral-400 hover:bg-white/5'
          }`}
        >
          <Send className="w-4 h-4" />
          <span className="text-sm font-bold">Rich Card</span>
        </button>
      </div>

      {type === "text" ? (
        <div className="space-y-2">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="bg-white/[0.03] border-white/10 min-h-[100px] focus:bg-white/5 transition-colors resize-none"
            placeholder="Type your auto-reply message here..."
          />
          <p className="text-[10px] text-neutral-600 text-right">{messageText.length}/1000</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <Input
              value={cardTitle}
              onChange={(e) => setCardTitle(e.target.value)}
              className="bg-transparent border-white/10 font-bold"
              placeholder="Card Title"
            />
            <Input
              value={cardSubtitle}
              onChange={(e) => setCardSubtitle(e.target.value)}
              className="bg-transparent border-white/10 text-sm"
              placeholder="Subtitle (Optional)"
            />
            <Input
              value={cardImage}
              onChange={(e) => setCardImage(e.target.value)}
              className="bg-transparent border-white/10 text-xs"
              placeholder="Image URL (https://...)"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">Buttons ({buttons.length}/3)</span>
              <Button size="sm" variant="ghost" onClick={handleAddButton} disabled={buttons.length >= 3} className="h-7 text-xs hover:bg-white/10">
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
            {buttons.map((btn) => (
              <div key={btn.id} className="flex gap-2 items-center bg-white/5 p-2 rounded-lg border border-white/10 animate-in fade-in">
                <Input
                  value={btn.title}
                  onChange={(e) => updateButton(btn.id, "title", e.target.value)}
                  className="h-8 text-xs flex-1 bg-transparent border-none px-2"
                  placeholder="Label"
                />
                <Select value={btn.type} onValueChange={(v) => updateButton(btn.id, "type", v as any)}>
                  <SelectTrigger className="h-8 w-[80px] text-[10px] bg-black/20 border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web_url">Link</SelectItem>
                    <SelectItem value="postback">Flow</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={btn.type === "web_url" ? btn.url : btn.payload}
                  onChange={(e) => updateButton(btn.id, btn.type === "web_url" ? "url" : "payload", e.target.value)}
                  className="h-8 text-xs flex-1 bg-transparent border-none px-2"
                  placeholder={btn.type === "web_url" ? "https://..." : "Keyword"}
                />
                <Button size="icon" variant="ghost" onClick={() => removeButton(btn.id)} className="h-6 w-6 text-red-500 hover:bg-red-500/10">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <DMPreview />
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h3 className="text-lg font-bold text-white mb-1">🚀 Ready to launch!</h3>
        <p className="text-xs text-neutral-500">Naam do aur options set karo. Phir go!</p>
      </div>

      <div className="space-y-2">
        <Label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider ml-1">Automation Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-white/[0.03] border-white/10 focus:bg-white/5"
          placeholder="e.g. Welcome Reply, Price Info"
        />
      </div>

      <button
        type="button"
        onClick={() => setCheckFollow(!checkFollow)}
        className={`w-full p-4 rounded-xl border transition-all flex items-center gap-3 ${
          checkFollow ? 'border-amber-500/50 bg-amber-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/5'
        }`}
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          checkFollow ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-neutral-500'
        }`}>
          <Lock className="w-5 h-5" />
        </div>
        <div className="text-left flex-1">
          <p className={`text-sm font-bold ${checkFollow ? 'text-amber-400' : 'text-white'}`}>Follow Gate</p>
          <p className="text-[11px] text-neutral-500">Sirf followers ko reply jayega</p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 transition-all ${
          checkFollow ? 'border-amber-500 bg-amber-500' : 'border-white/20'
        }`}>
          {checkFollow && <Check className="w-3 h-3 text-black m-auto mt-0.5" />}
        </div>
      </button>

      {/* Summary card */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
        <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Summary</p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-neutral-500">When:</span>
          <span className="text-white font-medium">
            {replyToAll ? 'Any comment' :
              triggerSource === 'story' && storyTriggerType === 'mention' ? 'Story mention' :
                triggers.length > 0 ? triggers.join(", ") : 'All messages'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-neutral-500">Reply:</span>
          <span className="text-white font-medium truncate">
            {type === 'text' ? messageText.slice(0, 40) + (messageText.length > 40 ? '...' : '') : `Card: ${cardTitle}`}
          </span>
        </div>
        {checkFollow && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-500">Gate:</span>
            <span className="text-amber-400 font-medium">Followers only</span>
          </div>
        )}
      </div>
    </div>
  )

  // --- MAIN RENDER ---
  return (
    <div className="space-y-6">
      <StepIndicator />

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        {step > 1 && (
          <Button
            variant="ghost"
            onClick={() => setStep(step - 1)}
            className="flex-1 h-11 rounded-xl border border-white/10 hover:bg-white/5 text-neutral-400"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        )}

        {step < 3 ? (
          <Button
            onClick={() => {
              if (step === 1 && !canProceedStep1()) return
              if (step === 2 && !canProceedStep2()) return
              setStep(step + 1)
            }}
            className="flex-1 bg-white text-black hover:bg-white/90 font-bold h-11 rounded-xl shadow-lg shadow-white/5 active:scale-95 transition-all"
          >
            Next <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Create Automation
          </Button>
        )}
      </div>
    </div>
  )
}
