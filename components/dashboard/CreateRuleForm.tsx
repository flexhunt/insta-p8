"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Lock, Film, X, CheckCircle2, AlertCircle, Sparkles } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { TagInput } from "@/components/ui/tag-input"
import type { ProButton } from "@/lib/types"
import { toast } from "sonner"

interface CreateRuleFormProps {
  userId: string
  triggerSource: 'comment' | 'dm' | 'story'  // NEW: Passed from tab context
  onSuccess: () => void
}

export function CreateRuleForm({ userId, triggerSource, onSuccess }: CreateRuleFormProps) {
  const [name, setName] = useState("")
  const [triggers, setTriggers] = useState<string[]>([])
  const [type, setType] = useState<"text" | "card">("text")
  const [checkFollow, setCheckFollow] = useState(false)
  const [replyToAll, setReplyToAll] = useState(false)
  const [storyTriggerType, setStoryTriggerType] = useState<'mention' | 'reaction' | 'reply'>('mention') // NEW for stories

  // Content State
  const [messageText, setMessageText] = useState("")
  const [cardTitle, setCardTitle] = useState("")
  const [cardSubtitle, setCardSubtitle] = useState("")
  const [cardImage, setCardImage] = useState("")
  const [buttons, setButtons] = useState<ProButton[]>([])

  // Media/Reel State
  const [reels, setReels] = useState<any[]>([])
  const [selectedReel, setSelectedReel] = useState<any | null>(null)
  const [loadingReels, setLoadingReels] = useState(false)
  const [showReelPicker, setShowReelPicker] = useState(false)

  // No need for separate error state for reel, use toast

  useEffect(() => {
    if (userId) {
      loadReels()
    }
  }, [userId])

  const loadReels = async () => {
    try {
      setLoadingReels(true)
      const res = await fetch(`/api/instagram/media?userId=${userId}`)
      const responseJson = await res.json()

      if (responseJson.data && Array.isArray(responseJson.data)) {
        setReels(responseJson.data)
      } else if (Array.isArray(responseJson)) {
        setReels(responseJson)
      } else if (responseJson.error) {
        toast.error("Could not load reels", { description: responseJson.error })
      }
    } catch (err) {
      console.error("[v0] Failed to load reels:", err)
      // toast.error("Failed to load reels") 
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

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Missing Logic Name", { description: "Please name your automation rule." })
      return
    }
    if (!replyToAll && triggers.length === 0) {
      toast.error("Missing Trigger", { description: "Please enter at least one keyword trigger." })
      return
    }
    if (replyToAll && !selectedReel) {
      toast.error("Select a Post", { description: "Reply to All requires selecting a specific post." })
      return
    }

    const content: any = { check_follow: checkFollow }

    if (type === "text") {
      if (!messageText.trim()) {
        toast.error("Missing Reply", { description: "Please enter a message to send." })
        return
      }
      content.message = messageText
    } else {
      if (!cardTitle.trim()) {
        toast.error("Missing Card Title", { description: "Rich cards must have a title." })
        return
      }

      const cleanButtons = buttons
        .map((b) => {
          // Basic URL cleaning
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
      const loadingToast = toast.loading("Creating automation...")

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
              triggers.length > 0 ? triggers.join(", ") : "ALL",
          content,
          specific_media_id: selectedReel?.id || null,
        }),
      })

      if (res.ok) {
        toast.dismiss(loadingToast)
        toast.success("Automation Created!", { description: `Triggers: ${triggers.join(", ")}` })

        // Reset Form
        setName("")
        setTriggers([])
        setReplyToAll(false)
        setMessageText("")
        setCardTitle("")
        setCardSubtitle("")
        setCardImage("")
        setButtons([])
        setSelectedReel(null)
        onSuccess()
      } else {
        toast.dismiss(loadingToast)
        toast.error("Failed to create rule", { description: "Please try again later." })
      }
    } catch (err) {
      toast.error("Network Error", { description: "Something went wrong." })
    }
  }

  // Inline ReelPicker component
  const ReelPicker = ({ userId, onSelect, filterType }: { userId: string; onSelect: (reel: any) => void; filterType?: 'story' | 'all' }) => {
    if (loadingReels) {
      return (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-black border border-white/20 rounded-lg text-center z-50 shadow-2xl">
          <p className="text-neutral-400 text-sm">Loading media...</p>
        </div>
      )
    }

    // Strict Filter: If story mode, ONLY show stories.
    const filteredReels = filterType === 'story'
      ? reels.filter((r: any) => r.media_type === 'STORY' || r.media_product_type === 'STORY')
      : reels

    if (filteredReels.length === 0) {
      return (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-black border border-white/20 rounded-lg text-center z-50 shadow-2xl">
          <p className="text-neutral-500 text-sm">
            {filterType === 'story' ? 'No active stories found' : 'No posts found'}
          </p>
        </div>
      )
    }

    return (
      <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto bg-black border border-white/20 rounded-lg z-50 shadow-2xl scrollbar-hide">
        {filteredReels.map((reel: any) => {
          const isStory = reel.media_type === 'STORY' || reel.media_product_type === 'STORY'
          // Double check to hide non-stories in story mode
          if (filterType === 'story' && !isStory) return null;

          const mediaTypeLabel = isStory ? 'Story' :
            reel.media_type === 'VIDEO' ? 'Reel' :
              reel.media_type === 'CAROUSEL_ALBUM' ? 'Carousel' : 'Post'

          const timestamp = reel.timestamp ? new Date(reel.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

          return (
            <button
              key={reel.id}
              type="button"
              onClick={() => onSelect(reel)}
              className="w-full p-3 flex items-center gap-3 hover:bg-white/10 transition-colors text-left border-b border-white/10 last:border-0"
            >
              {reel.image_url ? (
                <img
                  src={reel.image_url}
                  alt="Media thumbnail"
                  className="w-10 h-10 rounded-sm object-cover flex-shrink-0 opacity-80"
                />
              ) : (
                <div className="w-10 h-10 rounded-sm bg-white/10 flex items-center justify-center">
                  <Film className="w-4 h-4 text-neutral-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate font-medium">
                  {reel.caption || 'Untitled Media'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500">{mediaTypeLabel}</span>
                  {timestamp && (
                    <>
                      <span className="text-neutral-700">•</span>
                      <span className="text-[10px] text-neutral-600">{timestamp}</span>
                    </>
                  )}
                  {isStory && (
                    <span className="ml-auto text-[10px] border border-white/20 px-1 rounded text-white/70">24h</span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Context-aware header */}
      {/* Context-aware header */}
      <div className="mb-6">
        <h3 className="text-xl font-medium text-white tracking-tight">
          {triggerSource === 'comment' ? 'Comment Automation' :
            triggerSource === 'dm' ? 'DM Automation' :
              'Story Automation'}
        </h3>
        <p className="text-xs text-neutral-500 mt-1">
          {triggerSource === 'comment'
            ? 'Automatically reply to comments on your posts.'
            : triggerSource === 'dm'
              ? 'Automatically reply to hidden messages and DMs.'
              : 'Engage with users who mention or react to your stories.'}
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Rule Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-black/20 border-white/10 focus:bg-white/5 transition-colors"
              placeholder="e.g. Welcome Menu"
            />
          </div>
        </div>

        {/* Story Trigger Type Selector - only for stories */}
        {triggerSource === 'story' && (
          <div className="space-y-3">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Trigger Type</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setStoryTriggerType('mention')}
                className={`p-4 rounded-lg border transition-all flex flex-col items-center justify-center gap-2 ${storyTriggerType === 'mention'
                  ? 'border-white bg-white text-black'
                  : 'border-white/10 bg-black/40 text-neutral-400 hover:bg-white/5'
                  }`}
              >
                <span className="text-lg">@</span>
                <span className="text-xs font-semibold">Mentions</span>
              </button>

              <button
                type="button"
                onClick={() => setStoryTriggerType('reaction')}
                className={`p-4 rounded-lg border transition-all flex flex-col items-center justify-center gap-2 ${storyTriggerType === 'reaction'
                  ? 'border-white bg-white text-black'
                  : 'border-white/10 bg-black/40 text-neutral-400 hover:bg-white/5'
                  }`}
              >
                <span className="text-lg">❤️</span>
                <span className="text-xs font-semibold">Reactions</span>
              </button>

              <button
                type="button"
                onClick={() => setStoryTriggerType('reply')}
                className={`p-4 rounded-lg border transition-all flex flex-col items-center justify-center gap-2 ${storyTriggerType === 'reply'
                  ? 'border-white bg-white text-black'
                  : 'border-white/10 bg-black/40 text-neutral-400 hover:bg-white/5'
                  }`}
              >
                <span className="text-lg">💬</span>
                <span className="text-xs font-semibold">Replies</span>
              </button>
            </div>
          </div>
        )}

        {/* Only show Reply-to-All for COMMENTS */}
        {triggerSource === 'comment' && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-white/10 bg-white/5">
            <Switch checked={replyToAll} onCheckedChange={setReplyToAll} id="reply-all" />
            <div className="flex-1">
              <Label htmlFor="reply-all" className="text-sm font-medium text-white cursor-pointer">
                Reply to ALL Comments
              </Label>
              <p className="text-xs text-neutral-500 mt-0.5">
                Respond to every comment on a specific post automatically.
              </p>
            </div>
          </div>
        )}

        {/* Conditional trigger input - hide for reply-all and story mentions */}
        {!(triggerSource === 'comment' && replyToAll) && !(triggerSource === 'story' && storyTriggerType === 'mention') && (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
              {triggerSource === 'story' && storyTriggerType === 'reaction' ? 'Reaction Emoji (optional)' : 'Trigger Keywords'}
              <span className="text-muted-foreground/60 font-normal ml-2">
                {triggerSource === 'story' && storyTriggerType === 'reaction'
                  ? '(Leave empty for all reactions)'
                  : '(Press Enter or comma to add)'}
              </span>
            </Label>
            <TagInput
              value={triggers}
              onChange={setTriggers}
              placeholder={
                triggerSource === 'comment' ? 'e.g. hello, info, price' :
                  triggerSource === 'story' && storyTriggerType === 'reaction' ? 'e.g. ❤️, 🔥, 👍' :
                    triggerSource === 'story' ? 'e.g. yes, interested, tell me more' :
                      'e.g. hello, hi, menu'
              }
            />
          </div>
        )}

        <div className="flex items-center gap-3 p-4 rounded-lg border border-white/10 bg-white/5">
          <Switch checked={checkFollow} onCheckedChange={setCheckFollow} id="follow-gate" />
          <div>
            <Label htmlFor="follow-gate" className="text-sm font-medium text-white flex items-center gap-2 cursor-pointer">
              <Lock className="w-3.5 h-3.5" /> Follow Gate
            </Label>
            <p className="text-[10px] text-muted-foreground mt-0.5">User must follow you to see the reply.</p>
          </div>
        </div>

        {/* Only show reel picker for COMMENTS */}
        {triggerSource === 'comment' && (
          <div className="space-y-3">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
              {replyToAll ? 'Select Post/Reel (Required for Reply-All)' : 'Link to Specific Post/Reel (Optional)'}
            </Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowReelPicker(!showReelPicker)}
                className="w-full p-4 rounded-xl border border-white/10 bg-black/20 hover:bg-white/5 transition-colors text-left flex items-center justify-between group"
              >
                {selectedReel ? (
                  <div className="flex items-center gap-3">
                    {selectedReel.image_url && (
                      <img
                        src={selectedReel.image_url}
                        alt="Reel thumbnail"
                        className="w-12 h-12 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {selectedReel.caption || 'No caption'}
                      </p>
                      <p className="text-xs text-neutral-500">Selected Post</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-neutral-400 group-hover:text-white transition-colors">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm">
                      {replyToAll ? 'Choose a post/reel' : 'Pick a post/reel (optional)'}
                    </span>
                  </div>
                )}
              </button>

              {showReelPicker && (
                <ReelPicker userId={userId} onSelect={(reel: any) => {
                  setSelectedReel(reel)
                  setShowReelPicker(false)
                }} />
              )}
            </div>
          </div>
        )}

        {/* Story picker for STORIES - optional */}
        {triggerSource === 'story' && (
          <div className="space-y-3">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
              Target Specific Story (Optional)
            </Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowReelPicker(!showReelPicker)}
                className="w-full p-4 rounded-xl border border-white/10 bg-black/20 hover:bg-white/5 transition-colors text-left flex items-center justify-between group"
              >
                {selectedReel ? (
                  <div className="flex items-center gap-3">
                    {selectedReel.image_url && (
                      <img
                        src={selectedReel.image_url}
                        alt="Story thumbnail"
                        className="w-12 h-12 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {selectedReel.caption || 'Active Story'}
                      </p>
                      <p className="text-xs text-neutral-500">Selected Story</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-neutral-400 group-hover:text-white transition-colors">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm">
                      Pick a story (optional - leave empty for all stories)
                    </span>
                  </div>
                )}
              </button>

              {showReelPicker && (
                <ReelPicker userId={userId} filterType="story" onSelect={(reel: any) => {
                  setSelectedReel(reel)
                  setShowReelPicker(false)
                }} />
              )}
            </div>
          </div>
        )}

        {/* Response Configuration */}
        <div className="space-y-4">

          <Tabs value={type} onValueChange={(v: any) => setType(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 p-1 rounded-lg">
              <TabsTrigger value="text" className="data-[state=active]:bg-white data-[state=active]:text-black transition-all">Text Response</TabsTrigger>
              <TabsTrigger value="card" className="data-[state=active]:bg-white data-[state=active]:text-black transition-all">Card Response</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="pt-4 animate-in fade-in slide-in-from-left-2 duration-300">
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="bg-black/20 border-white/10 min-h-[120px] focus:bg-white/5 transition-colors resize-none"
                placeholder="Type the automated response here..."
              />
              <p className="text-[10px] text-muted-foreground text-right mt-1">{messageText.length}/1000</p>
            </TabsContent>

            <TabsContent value="card" className="pt-4 space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <Input
                  value={cardTitle}
                  onChange={(e) => setCardTitle(e.target.value)}
                  className="bg-black/40 border-white/10 font-bold"
                  placeholder="Card Title"
                />
                <Input
                  value={cardSubtitle}
                  onChange={(e) => setCardSubtitle(e.target.value)}
                  className="bg-black/40 border-white/10 text-sm"
                  placeholder="Subtitle (Optional)"
                />
                <Input
                  value={cardImage}
                  onChange={(e) => setCardImage(e.target.value)}
                  className="bg-black/40 border-white/10 text-xs"
                  placeholder="Image URL (https://...)"
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center px-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Action Buttons ({buttons.length}/3)
                  </Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleAddButton}
                    disabled={buttons.length >= 3}
                    className="h-6 text-xs hover:bg-white/10"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Button
                  </Button>
                </div>

                {buttons.map((btn) => (
                  <div key={btn.id} className="flex gap-2 items-center bg-white/5 p-2 rounded-lg border border-white/10 animate-in fade-in slide-in-from-top-1">
                    <Input
                      value={btn.title}
                      onChange={(e) => updateButton(btn.id, "title", e.target.value)}
                      className="h-8 text-xs w-1/3 bg-transparent border-none focus:ring-0 px-2"
                      placeholder="Label"
                    />
                    <div className="h-4 w-px bg-white/10"></div>
                    <Select value={btn.type} onValueChange={(v) => updateButton(btn.id, "type", v as any)}>
                      <SelectTrigger className="h-8 w-[90px] text-[10px] bg-black/20 border-0">
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
                      className="h-8 text-xs flex-1 bg-transparent border-none focus:ring-0 px-2"
                      placeholder={btn.type === "web_url" ? "https://..." : "Next Keyword"}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeButton(btn.id)}
                      className="h-6 w-6 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                    >
                      <Trash2 className="w-3 h-3 is-icon" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <Button
            onClick={handleSubmit}
            className="w-full bg-white text-black hover:bg-white/90 font-bold h-11 rounded-xl shadow-lg shadow-white/5 transform active:scale-95 transition-all"
          >
            Create Automation
          </Button>
        </div>
      </div>
    </div>
  )
}
