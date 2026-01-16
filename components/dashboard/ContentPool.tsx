"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Loader2, Plus, Trash2, Upload, Film, Link as LinkIcon, CheckCircle, FileJson, Instagram, Search } from "lucide-react"
import { toast } from "sonner"

// Initialize Authenticated Supabase Client
const supabase = createBrowserClient(
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
    const [manualToken, setManualToken] = useState("")
    const [manualBusinessId, setManualBusinessId] = useState("")
    const [showTokenInput, setShowTokenInput] = useState(false)
    const [files, setFiles] = useState<File[]>([])

    // Safe Mode State
    const [isSafeMode, setIsSafeMode] = useState(false)
    const [processLogs, setProcessLogs] = useState<string[]>([])
    const addLog = (msg: string) => setProcessLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`])
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
            let url = `/api/instagram/discovery?userId=${userId}&target=${spyTarget}`
            if (manualToken) {
                // Encode the token just in case
                url += `&customToken=${encodeURIComponent(manualToken.trim())}`
            }
            if (manualBusinessId) {
                url += `&customBusinessId=${encodeURIComponent(manualBusinessId.trim())}`
            }

            const res = await fetch(url)
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

    // Client-Side Video Processing (The "Remix" Engine)
    const processVideoSafe = async (url: string): Promise<Blob> => {
        return new Promise(async (resolve, reject) => {
            try {
                addLog("1. Proxied Download Started...")
                // 1. Fetch via Proxy to avoid CORS
                const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`
                const res = await fetch(proxyUrl)
                if (!res.ok) throw new Error("Proxy fetch failed")
                const blob = await res.blob()
                addLog(`2. Download Complete (${(blob.size / 1024 / 1024).toFixed(2)} MB)`)

                // 2. Setup Hidden Video & Canvas
                const video = document.createElement("video")
                video.src = URL.createObjectURL(blob)
                video.muted = true
                video.crossOrigin = "anonymous"

                // Wait for metadata
                await new Promise((r) => { video.onloadedmetadata = r })
                addLog(`3. Loaded Video Metadata (${video.duration.toFixed(1)}s)`)

                const canvas = document.createElement("canvas")
                const ctx = canvas.getContext("2d")
                if (!ctx) throw new Error("Canvas 2D context failed")

                // Set slightly different dimensions (e.g. crop 2px) to force re-encode
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight

                // 3. Setup Recorder
                // Try slightly lower bitrate (3Mbps) for faster upload/processing while keeping quality decent
                const stream = canvas.captureStream(30) // 30 FPS
                const recorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm;codecs=vp9',
                    videoBitsPerSecond: 3000000 // 3 Mbps (reduced from 5Mbps)
                })
                const chunks: Blob[] = []

                recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

                recorder.onstop = () => {
                    addLog("5. Processing Complete. Finalizing...")
                    const refinedBlob = new Blob(chunks, { type: 'video/webm' })
                    addLog(`6. New Unique File Created (${(refinedBlob.size / 1024 / 1024).toFixed(2)} MB)`)
                    resolve(refinedBlob)
                }

                recorder.start()
                video.play()

                // 4. Processing Loop (The "Filter")
                // Speed up slightly to change audio hash (1.05x)
                video.playbackRate = 1.05

                const draw = () => {
                    if (video.paused || video.ended) return

                    // Apply Filters: Saturation boost + Slight Zoom (102%)
                    ctx.filter = "saturate(1.05) contrast(1.02)"

                    // Zoom logic: Draw 102% size centered
                    const w = canvas.width
                    const h = canvas.height
                    const zoom = 0.02 // 2% zoom
                    ctx.drawImage(video,
                        w * zoom * 0.5, h * zoom * 0.5, w * (1 - zoom), h * (1 - zoom), // Source Crop
                        0, 0, w, h // Dest Full
                    )

                    requestAnimationFrame(draw)
                }

                video.onplay = () => {
                    addLog("4. Remixing in progress... (Applying filters)")
                    draw()
                }

                video.onended = () => {
                    recorder.stop()
                }

                video.onerror = (e) => reject("Video Playback Error")

            } catch (e: any) {
                reject(e.message)
            }
        })
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
                const toImport = igMedia.filter(m => selectedIgMedia.includes(m.id))
                setProcessLogs([]) // Reset logs

                for (let i = 0; i < toImport.length; i++) {
                    const item = toImport[i]
                    let finalVideoUrl = item.media_url || item.thumbnail_url

                    // SAFE MODE LOGIC
                    if (isSafeMode) {
                        try {
                            addLog(`Processing Item ${i + 1}/${toImport.length}...`)
                            const safeBlob = await processVideoSafe(finalVideoUrl)

                            // Upload Safe Blob to Supabase
                            const fileName = `${userId}/remix_${Date.now()}_${i}.webm`
                            addLog("7. Uploading Remix to Cloud...")

                            const { error: uploadError } = await supabase.storage
                                .from('reels')
                                .upload(fileName, safeBlob)

                            if (uploadError) throw uploadError

                            const { data: { publicUrl } } = supabase.storage.from('reels').getPublicUrl(fileName)
                            finalVideoUrl = publicUrl
                            addLog("8. Upload Success!")

                        } catch (remixErr: any) {
                            console.error(remixErr)
                            addLog(`❌ Remix Failed: ${remixErr}`)
                            toast.error(`Remix failed for item ${i + 1}`)
                            continue // Skip this item
                        }
                    }

                    setProgress(`Importing ${i + 1}/${toImport.length}...`)
                    const res = await fetch('/api/scheduler/import-instagram', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId, videoUrl: finalVideoUrl, caption: caption || item.caption })
                    })
                    if (res.ok) {
                        addLog("✅ Item Imported to DB")
                    }
                }
                toast.success(`Import complete!`)
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
                                            placeholder="Target Username (e.g. therock)"
                                            value={spyTarget}
                                            onChange={(e) => setSpyTarget(e.target.value)}
                                            className="pl-9 bg-black/20 border-white/10"
                                        />
                                    </div>
                                    <Button onClick={() => loadSpyMedia(manualToken)} disabled={loadingSpy || !spyTarget}>
                                        {loadingSpy ? <Loader2 className="animate-spin" /> : "Search"}
                                    </Button>
                                </div>

                                <div className="mt-2">
                                    <p className="text-xs text-neutral-500 mb-1 cursor-pointer hover:underline" onClick={() => setShowTokenInput(!showTokenInput)}>
                                        {showTokenInput ? "Hide Advanced Options" : "Show Advanced Options (Access Token)"}
                                    </p>
                                    {showTokenInput && (
                                        <Input
                                            type="password"
                                            placeholder="Paste Manual Access Token (Optional)"
                                            value={manualToken}
                                            onChange={(e) => setManualToken(e.target.value)}
                                            className="text-xs font-mono bg-black/20 border-white/10"
                                        />
                                    )}

                                    <div className="flex items-center gap-2 mt-4 border border-green-500/20 bg-green-500/10 p-2 rounded">
                                        <input
                                            type="checkbox"
                                            checked={isSafeMode}
                                            onChange={(e) => setIsSafeMode(e.target.checked)}
                                            className="w-4 h-4 accent-green-500 cursor-pointer"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-green-400">Enable Safe Mode (Remix)</span>
                                            <span className="text-[10px] text-neutral-400">Zooms & Adjusts speed to bypass 'Duplicate Content' filters. (Slower)</span>
                                        </div>
                                    </div>

                                    {processLogs.length > 0 && (
                                        <div className="mt-4 p-2 bg-black/50 rounded font-mono text-[10px] h-32 overflow-y-auto border border-white/10">
                                            {processLogs.map((log, i) => (
                                                <div key={i} className="text-neutral-300 border-b border-white/5 pb-1 mb-1 last:border-0">{log}</div>
                                            ))}
                                        </div>
                                    )}
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
