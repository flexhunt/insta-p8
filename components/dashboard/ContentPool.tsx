"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Loader2, Plus, Trash2, Upload, Film, Link as LinkIcon, CheckCircle, FileJson, Instagram, Search } from "lucide-react"
import { toast } from "sonner"

// Initialize Supabase Client for client-side storage upload
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ContentItem {
    id: string
    video_url: string
    caption: string
    sequence_index: number
    is_active: boolean
}

interface ExternalMedia {
    id: string
    media_url: string
    caption: string
    thumbnail_url?: string
    media_type?: string
}

interface ContentPoolProps {
    userId: string
}

export function ContentPool({ userId }: ContentPoolProps) {
    const [items, setItems] = useState<ContentItem[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)

    // New Item State
    const [caption, setCaption] = useState("")
    const [files, setFiles] = useState<File[]>([])
    const [manualUrl, setManualUrl] = useState("")
    const [jsonInput, setJsonInput] = useState("")
    const [inputType, setInputType] = useState<"file" | "url" | "instagram" | "json" | "spy">("file")
    const [isAdding, setIsAdding] = useState(false)
    const [progress, setProgress] = useState("")

    // Instagram Import State
    const [igMedia, setIgMedia] = useState<ExternalMedia[]>([])
    const [selectedIgMedia, setSelectedIgMedia] = useState<string[]>([])
    const [loadingIg, setLoadingIg] = useState(false)

    // Spy State
    const [spyTarget, setSpyTarget] = useState("")
    const [manualSpyToken, setManualSpyToken] = useState("")
    const [loadingSpy, setLoadingSpy] = useState(false)

    useEffect(() => {
        if (userId) loadPool()
    }, [userId])

    const loadPool = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/scheduler/pool?userId=${userId}`)
            if (res.ok) {
                const data = await res.json()
                setItems(data)
            }
        } catch (err) {
            toast.error("Failed to load content pool")
        } finally {
            setLoading(false)
        }
    }

    const loadInstagramMedia = async () => {
        try {
            setLoadingIg(true)
            // Empty target params implies "me" in traditional endpoint, but standard endpoint handles "me"
            const res = await fetch(`/api/instagram/media?userId=${userId}`)
            if (res.ok) {
                const data = await res.json()
                setIgMedia(data.data || [])
            } else {
                toast.error("Failed to fetch media")
            }
        } catch (err) {
            toast.error("Error loading Instagram media")
        } finally {
            setLoadingIg(false)
        }
    }

    const loadSpyMedia = async () => {
        if (!spyTarget) return toast.error("Enter a username")
        try {
            setLoadingSpy(true)
            const tokenParam = manualSpyToken ? `&token=${encodeURIComponent(manualSpyToken)}` : ""
            const res = await fetch(`/api/instagram/discovery?userId=${userId}&target=${spyTarget}${tokenParam}`)
            const data = await res.json()
            if (res.ok) {
                setIgMedia(data.data || [])
                if (data.data?.length === 0) toast.info("No media found or private account")
            } else {
                toast.error(data.error || "Failed to spy")
            }
        } catch (err) {
            toast.error("Spy failed")
        } finally {
            setLoadingSpy(false)
        }
    }

    const toggleIgSelection = (id: string) => {
        if (selectedIgMedia.includes(id)) {
            setSelectedIgMedia(prev => prev.filter(x => x !== id))
        } else {
            setSelectedIgMedia(prev => [...prev, id])
        }
    }

    const handleUpload = async () => {
        setUploading(true)
        setProgress("")

        try {
            // 1. JSON Import
            if (inputType === "json") {
                let parsed: any[] = []
                try {
                    parsed = JSON.parse(jsonInput)
                    if (!Array.isArray(parsed)) throw new Error("Root must be array")
                } catch (e) {
                    return toast.error("Invalid JSON format")
                }

                let successCount = 0
                for (let i = 0; i < parsed.length; i++) {
                    const item = parsed[i]
                    if (!item.video_url) continue
                    setProgress(`Importing ${i + 1}/${parsed.length}...`)

                    const res = await fetch('/api/scheduler/import-instagram', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId, videoUrl: item.video_url, caption: item.caption || caption })
                    })
                    if (res.ok) successCount++
                }
                toast.success(`Imported ${successCount} items from JSON`)
            }

            // 2. Instagram & Spy Import (Both populate igMedia)
            else if (inputType === "instagram" || inputType === "spy") {
                let successCount = 0
                const toImport = igMedia.filter(m => selectedIgMedia.includes(m.id))

                for (let i = 0; i < toImport.length; i++) {
                    const item = toImport[i]
                    setProgress(`Importing ${i + 1}/${toImport.length}...`)

                    const res = await fetch('/api/scheduler/import-instagram', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId, videoUrl: item.media_url, caption: caption || item.caption })
                    })
                    if (res.ok) successCount++
                }
                toast.success(`Imported ${successCount} Reels`)
                setSelectedIgMedia([])
            }

            // 3. Single URL
            else if (inputType === "url") {
                if (!manualUrl) return toast.error("Enter URL")
                const res = await fetch('/api/scheduler/import-instagram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, videoUrl: manualUrl, caption })
                })
                if (!res.ok) throw new Error("Failed to import URL")
                toast.success("URL imported successfully")
            }

            // 4. File Upload (Client-side)
            else {
                if (files.length === 0) return toast.error("Select files")
                let successCount = 0
                for (let i = 0; i < files.length; i++) {
                    const file = files[i]
                    setProgress(`Uploading ${i + 1}/${files.length}...`)

                    const fileExt = file.name.split('.').pop()
                    const fileName = `${userId}/${Date.now()}-${i}.${fileExt}`

                    const { error: uploadError } = await supabase.storage
                        .from('reels')
                        .upload(fileName, file)

                    if (uploadError) throw uploadError

                    const { data: { publicUrl } } = supabase.storage
                        .from('reels')
                        .getPublicUrl(fileName)

                    const finalCaption = caption || file.name.replace(/\.[^/.]+$/, "")

                    const res = await fetch('/api/scheduler/pool', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId,
                            video_url: publicUrl,
                            caption: finalCaption
                        })
                    })

                    if (!res.ok) throw new Error("Db Error")
                    successCount++
                }
                toast.success(`Uploaded ${successCount} files`)
            }

            // Reset
            setFiles([])
            setManualUrl("")
            setJsonInput("")
            setCaption("")
            setIsAdding(false)
            loadPool()

        } catch (err: any) {
            toast.error("Process failed", { description: err.message })
        } finally {
            setUploading(false)
            setProgress("")
        }
    }

    const handleDelete = async (itemId: string) => {
        try {
            const res = await fetch(`/api/scheduler/pool?id=${itemId}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success("Clip removed")
                loadPool()
            }
        } catch (err) {
            toast.error("Failed to delete clip")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-white">Content Pool</h3>
                    <p className="text-sm text-neutral-500">
                        Manage your reels queue.
                    </p>
                </div>
                <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "secondary" : "default"}>
                    {isAdding ? "Cancel" : <><Plus className="w-4 h-4 mr-2" /> Add Clips</>}
                </Button>
            </div>

            {isAdding && (
                <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4 space-y-4">
                        <Tabs defaultValue="file" onValueChange={(v) => {
                            setInputType(v as any)
                            if (v === 'instagram') loadInstagramMedia()
                            if (v === 'spy') setIgMedia([]) // Clear for spy search
                        }}>
                            <TabsList className="grid w-full grid-cols-5 bg-black/40">
                                <TabsTrigger value="file">Files</TabsTrigger>
                                <TabsTrigger value="instagram">My Reels</TabsTrigger>
                                <TabsTrigger value="spy">Spy / Analyze</TabsTrigger>
                                <TabsTrigger value="url">Link</TabsTrigger>
                                <TabsTrigger value="json">JSON</TabsTrigger>
                            </TabsList>

                            {/* FILE UPLOAD */}
                            <TabsContent value="file" className="mt-4">
                                <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:bg-white/5 transition-colors cursor-pointer relative">
                                    <input
                                        type="file"
                                        multiple
                                        accept="video/mp4,video/quicktime"
                                        onChange={(e) => setFiles(Array.from(e.target.files || []))}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload className="w-8 h-8 text-neutral-400" />
                                        <p className="text-sm text-neutral-300">
                                            {files.length > 0 ? `${files.length} files selected` : "Select MP4 Files"}
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* INSTAGRAM IMPORT */}
                            <TabsContent value="instagram" className="mt-4">
                                {loadingIg ? (
                                    <div className="text-center py-8"><Loader2 className="animate-spin mx-auto w-6 h-6 text-neutral-500" /></div>
                                ) : (
                                    <MediaGrid media={igMedia} selected={selectedIgMedia} onToggle={toggleIgSelection} />
                                )}
                                <p className="text-xs text-neutral-500 mt-2 text-center">
                                    {selectedIgMedia.length} items selected
                                </p>
                            </TabsContent>

                            {/* SPY / ANALYZE */}
                            <TabsContent value="spy" className="mt-4 space-y-4">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                                        <Input
                                            placeholder="Enter username (e.g. nike)"
                                            value={spyTarget}
                                            onChange={(e) => setSpyTarget(e.target.value)}
                                            className="pl-9 bg-black/20 border-white/10"
                                        />
                                    </div>
                                    <Button onClick={loadSpyMedia} disabled={loadingSpy || !spyTarget}>
                                        {loadingSpy ? <Loader2 className="animate-spin" /> : "Search"}
                                    </Button>
                                </div>
                                <div className="relative">
                                    <Input
                                        type="password"
                                        placeholder="Optional: Paste 'Instagram Graph API' Token here explicitly"
                                        value={manualSpyToken}
                                        onChange={(e) => setManualSpyToken(e.target.value)}
                                        className="bg-black/20 border-white/10 text-xs text-neutral-400"
                                    />
                                </div>

                                {loadingSpy ? (
                                    <div className="text-center py-8"><Loader2 className="animate-spin mx-auto w-6 h-6 text-neutral-500" /></div>
                                ) : (
                                    <MediaGrid media={igMedia} selected={selectedIgMedia} onToggle={toggleIgSelection} />
                                )}
                                <p className="text-xs text-neutral-500 mt-2 text-center">
                                    {selectedIgMedia.length} items selected
                                </p>
                            </TabsContent>

                            {/* URL LINK */}
                            <TabsContent value="url" className="mt-4">
                                <div className="relative">
                                    <LinkIcon className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                                    <Input
                                        placeholder="https://example.com/video.mp4"
                                        value={manualUrl}
                                        onChange={(e) => setManualUrl(e.target.value)}
                                        className="pl-9 bg-black/20 border-white/10"
                                    />
                                </div>
                            </TabsContent>

                            {/* JSON IMPORT */}
                            <TabsContent value="json" className="mt-4">
                                <Textarea
                                    placeholder='[ { "video_url": "...", "caption": "..." } ]'
                                    className="font-mono text-xs bg-black/30 min-h-[150px]"
                                    value={jsonInput}
                                    onChange={(e) => setJsonInput(e.target.value)}
                                />
                                <p className="text-xs text-neutral-500 mt-1">Paste a JSON array of objects with video_url and caption.</p>
                            </TabsContent>
                        </Tabs>

                        <Textarea
                            placeholder="Shared caption (optional). Overrides individual captions."
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            className="bg-black/20 border-white/10"
                        />

                        <Button onClick={handleUpload} disabled={uploading} className="w-full">
                            {uploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    {progress || "Processing..."}
                                </>
                            ) : (
                                "Start Import / Upload"
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {loading ? (
                <div className="text-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-neutral-500" />
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-white/10 rounded-xl">
                    <Film className="w-10 h-10 mx-auto text-neutral-600 mb-3" />
                    <p className="text-neutral-500">No clips in the pool yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item, idx) => (
                        <div key={item.id} className="group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all">
                            <div className="aspect-[9/16] bg-black relative">
                                <video
                                    src={item.video_url}
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                />
                                <Badge className="absolute top-2 left-2 bg-black/60 text-white border-none">
                                    #{item.sequence_index}
                                </Badge>
                            </div>

                            <div className="p-3">
                                <p className="text-sm text-white line-clamp-2 min-h-[40px]">
                                    {item.caption || "No caption"}
                                </p>
                                <div className="flex justify-end mt-2">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleDelete(item.id)}
                                        className="text-neutral-500 hover:text-red-400 hover:bg-red-500/10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function MediaGrid({ media, selected, onToggle }: { media: ExternalMedia[], selected: string[], onToggle: (id: string) => void }) {
    if (media.length === 0) return <div className="text-center py-8 text-neutral-500">No media found.</div>
    return (
        <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2">
            {media.map(item => {
                const isSelected = selected.includes(item.id)
                return (
                    <div
                        key={item.id}
                        onClick={() => onToggle(item.id)}
                        className={`
                            aspect-square relative cursor-pointer rounded-md overflow-hidden border-2
                            ${isSelected ? 'border-blue-500' : 'border-transparent'}
                        `}
                    >
                        {item.media_type === "VIDEO" || item.media_type === "REELS" ? (
                            <video src={item.media_url} className="w-full h-full object-cover" />
                        ) : (
                            <img src={item.media_url || item.thumbnail_url} className="w-full h-full object-cover" />
                        )}
                        {isSelected && (
                            <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                                <CheckCircle className="text-white w-8 h-8 shadow-lg" />
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
