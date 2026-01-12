"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Lock, Film, X, CheckCircle2, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { ProButton } from "@/lib/types"
import { toast } from "sonner"

interface CreateRuleFormProps {
  userId: string
  onSuccess: () => void
}

export function CreateRuleForm({ userId, onSuccess }: CreateRuleFormProps) {
  const [name, setName] = useState("")
  const [trigger, setTrigger] = useState("")
  const [type, setType] = useState<"text" | "card">("text")
  const [checkFollow, setCheckFollow] = useState(false)

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
    if (!trigger.trim()) {
      toast.error("Missing Trigger", { description: "Please enter a keyword trigger." })
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
          trigger_type: "keyword",
          trigger_value: trigger,
          content,
          specific_media_id: selectedReel?.id || null,
        }),
      })

      if (res.ok) {
        toast.dismiss(loadingToast)
        toast.success("Automation Created!", { description: `Trigger: ${trigger}` })

        // Reset Form
        setName("")
        setTrigger("")
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

  return (
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
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Trigger Keyword</Label>
          <Input
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="bg-black/20 border-white/10 text-purple-400 font-medium focus:bg-white/5 transition-colors placeholder:text-muted-foreground/50"
            placeholder="e.g. hello"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-xl border border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-transparent">
        <Switch checked={checkFollow} onCheckedChange={setCheckFollow} id="follow-gate" />
        <div>
          <Label htmlFor="follow-gate" className="text-sm font-bold text-yellow-500 flex items-center gap-2 cursor-pointer">
            <Lock className="w-3.5 h-3.5" /> Follow Gate
          </Label>
          <p className="text-[10px] text-muted-foreground mt-0.5">User must follow you to see the reply.</p>
        </div>
      </div>

      {/* REEL SELECTOR */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
            <Film className="w-3 h-3" /> Link to specific post (Optional)
          </Label>
          {selectedReel && (
            <button
              onClick={() => setSelectedReel(null)}
              className="text-[10px] text-red-400 hover:text-red-300 hover:underline flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Clear Selection
            </button>
          )}
        </div>

        <Dialog open={showReelPicker} onOpenChange={setShowReelPicker}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className={`w-full justify-start text-left border-white/10 relative overflow-hidden h-auto py-3 ${selectedReel ? 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30' : 'bg-black/20 hover:bg-white/5'}`}
              disabled={loadingReels}
            >
              {selectedReel ? (
                <div className="flex items-center gap-3 w-full">
                  <div className="h-10 w-10 rounded bg-white/10 overflow-hidden shrink-0 border border-white/10">
                    <img
                      src={selectedReel.thumbnail_url || selectedReel.media_url || selectedReel.image_url}
                      className="h-full w-full object-cover"
                      alt=""
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">Included with Post</p>
                    <p className="text-[10px] text-muted-foreground truncate opacity-70">
                      {selectedReel.caption || "No Caption"}
                    </p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Film className="w-4 h-4 opacity-50" />
                  <span className="text-xs">
                    {loadingReels ? "Loading media..." : "Select a post from your feed..."}
                  </span>
                </div>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-[#09090b] border-white/10 p-0 overflow-hidden gap-0">
            <DialogHeader className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <DialogTitle className="text-sm font-bold uppercase tracking-wider">Select Media</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 max-h-[500px] overflow-y-auto p-1 bg-black/50">
              {loadingReels ? (
                <div className="col-span-full py-12 flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  <p className="text-xs text-muted-foreground">Syncing with Instagram...</p>
                </div>
              ) : reels.length === 0 ? (
                <div className="col-span-full py-12 text-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-muted-foreground">No posts found</p>
                </div>
              ) : (
                reels.map((reel) => (
                  <button
                    key={reel.id}
                    onClick={() => {
                      setSelectedReel(reel)
                      setShowReelPicker(false)
                    }}
                    className={`relative aspect-square group overflow-hidden focus:outline-none transition-all ${selectedReel?.id === reel.id
                        ? "ring-4 ring-purple-500 z-10"
                        : "hover:z-10"
                      }`}
                  >
                    <img
                      src={reel.thumbnail_url || reel.media_url || reel.image_url || "/placeholder.svg"}
                      alt="reel"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Plus className="w-8 h-8 text-white drop-shadow-lg" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={type} onValueChange={(v: any) => setType(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white/5 p-1 rounded-lg">
          <TabsTrigger value="text" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">Simple Text</TabsTrigger>
          <TabsTrigger value="card" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">Rich Card</TabsTrigger>
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
  )
}
