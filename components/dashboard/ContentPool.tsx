"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Trash2, Upload, Play, Film } from "lucide-react"
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
    const [file, setFile] = useState<File | null>(null)
    const [isAdding, setIsAdding] = useState(false)

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
        if (!file) return toast.error("Please select a video file")

        try {
            setUploading(true)
            const fileExt = file.name.split('.').pop()
            const fileName = `${userId}/${Date.now()}.${fileExt}`

            // 1. Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('reels')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('reels')
                .getPublicUrl(fileName)

            // 2. Save to DB
            const res = await fetch('/api/scheduler/pool', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    video_url: publicUrl,
                    caption
                })
            })

            if (!res.ok) throw new Error("Failed to save to database")

            toast.success("Clip added to pool!")
            setFile(null)
            setCaption("")
            setIsAdding(false)
            loadPool()

        } catch (err: any) {
            toast.error("Upload failed", { description: err.message })
        } finally {
            setUploading(false)
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
                        Upload clips to cycle through. Order is determined by upload time.
                    </p>
                </div>
                <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "secondary" : "default"}>
                    {isAdding ? "Cancel" : <><Plus className="w-4 h-4 mr-2" /> Add Clip</>}
                </Button>
            </div>

            {isAdding && (
                <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4 space-y-4">
                        <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:bg-white/5 transition-colors cursor-pointer relative">
                            <input
                                type="file"
                                accept="video/mp4,video/quicktime"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center gap-2">
                                <Upload className="w-8 h-8 text-neutral-400" />
                                <p className="text-sm text-neutral-300">
                                    {file ? file.name : "Drag & drop or click to upload video (MP4)"}
                                </p>
                            </div>
                        </div>

                        <Textarea
                            placeholder="Enter caption for this Reel..."
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            className="bg-black/20 border-white/10"
                        />

                        <Button onClick={handleUpload} disabled={uploading || !file} className="w-full">
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Upload & Save"}
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
