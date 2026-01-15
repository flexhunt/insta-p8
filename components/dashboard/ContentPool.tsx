"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Loader2, Plus, Trash2, Upload, Film, Link as LinkIcon } from "lucide-react"
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
    const [inputType, setInputType] = useState<"file" | "url">("file")
    const [isAdding, setIsAdding] = useState(false)
    const [progress, setProgress] = useState("")

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

    const handleUpload = async () => {
        if (inputType === "file" && files.length === 0) return toast.error("Please select video files")
        if (inputType === "url" && !manualUrl) return toast.error("Please enter a video URL")

        setUploading(true)
        setProgress("")

        try {
            if (inputType === "url") {
                // Single URL Upload
                const res = await fetch('/api/scheduler/pool', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        video_url: manualUrl,
                        caption
                    })
                })
                if (!res.ok) throw new Error("Failed to save URL to database")
            } else {
                // Bulk File Upload
                let successCount = 0
                for (let i = 0; i < files.length; i++) {
                    const file = files[i]
                    setProgress(`Uploading ${i + 1}/${files.length}...`)

                    try {
                        const fileExt = file.name.split('.').pop()
                        const fileName = `${userId}/${Date.now()}-${i}.${fileExt}`

                        // 1. Upload to Supabase
                        const { error: uploadError } = await supabase.storage
                            .from('reels')
                            .upload(fileName, file)

                        if (uploadError) throw uploadError

                        const { data: { publicUrl } } = supabase.storage
                            .from('reels')
                            .getPublicUrl(fileName)

                        // 2. Save to DB
                        // Use filename as default caption if caption is empty, or use shared caption
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

                        if (!res.ok) throw new Error("Failed to save to database")
                        successCount++

                    } catch (err) {
                        console.error(`Failed to upload ${file.name}`, err)
                        toast.error(`Failed to upload ${file.name}`)
                    }
                }
                toast.success(`Successfully added ${successCount} clips!`)
            }

            setFiles([])
            setManualUrl("")
            setCaption("")
            setIsAdding(false)
            loadPool()

        } catch (err: any) {
            toast.error("Upload process failed", { description: err.message })
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
                        Upload multiple clips. Sequence is determined by upload order.
                    </p>
                </div>
                <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "secondary" : "default"}>
                    {isAdding ? "Cancel" : <><Plus className="w-4 h-4 mr-2" /> Add Clips</>}
                </Button>
            </div>

            {isAdding && (
                <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4 space-y-4">
                        <Tabs defaultValue="file" onValueChange={(v) => setInputType(v as "file" | "url")}>
                            <TabsList className="grid w-full grid-cols-2 bg-black/40">
                                <TabsTrigger value="file">Batch Upload</TabsTrigger>
                                <TabsTrigger value="url">Single Link</TabsTrigger>
                            </TabsList>

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
                                            {files.length > 0
                                                ? `${files.length} files selected`
                                                : "Drag & drop multiple videos (MP4)"}
                                        </p>
                                        {files.length > 0 && (
                                            <p className="text-xs text-neutral-500">
                                                {files.map(f => f.name).slice(0, 3).join(", ")}
                                                {files.length > 3 && ` +${files.length - 3} more`}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="url" className="mt-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-neutral-400 uppercase font-semibold">Video URL</label>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                                        <Input
                                            placeholder="https://example.com/video.mp4"
                                            value={manualUrl}
                                            onChange={(e) => setManualUrl(e.target.value)}
                                            className="pl-9 bg-black/20 border-white/10"
                                        />
                                    </div>
                                    <p className="text-xs text-neutral-500">
                                        Provide a direct link to a single MP4 file.
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>

                        <Textarea
                            placeholder="Shared caption (optional). If empty, filename will be used."
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            className="bg-black/20 border-white/10"
                        />

                        <Button onClick={handleUpload} disabled={uploading || (inputType === "file" && files.length === 0) || (inputType === "url" && !manualUrl)} className="w-full">
                            {uploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    {progress || "Processing..."}
                                </>
                            ) : (
                                inputType === "file" ? `Upload ${files.length} Clips` : "Save Link"
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
