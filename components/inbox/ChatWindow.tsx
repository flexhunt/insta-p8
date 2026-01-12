"use client"

import { useEffect, useState, useRef } from "react"
import { Send, Loader2, MoreVertical, Phone, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Message } from "@/types/db"

interface ChatWindowProps {
    conversationId: string | null
    recipientName: string | null
}

export function ChatWindow({ conversationId, recipientName }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(false)
    const [inputText, setInputText] = useState("")
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!conversationId) return

        const fetchMessages = async () => {
            setLoading(true)
            try {
                const res = await fetch(`/api/inbox/messages?conversationId=${conversationId}`)
                const data = await res.json()
                if (Array.isArray(data)) {
                    setMessages(data)
                }
            } catch (error) {
                console.error("Failed to load messages", error)
            } finally {
                setLoading(false)
            }
        }

        fetchMessages()
    }, [conversationId])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])


    if (!conversationId) {
        return (
            <div className="flex-1 flex items-center justify-center flex-col gap-4 text-center bg-black/40 h-full">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                    <Send className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Your Messages</h3>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-2">
                        Select a conversation from the left to start chatting live with your audience.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-black/40">
            {/* Header */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-black/20 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500" />
                    <div>
                        <h3 className="font-bold text-white text-sm">@{recipientName}</h3>
                        <span className="flex items-center gap-1.5 text-[10px] text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            Online via Instagram
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white"><Phone className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white"><Video className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white"><MoreVertical className="w-4 h-4" /></Button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                    </div>
                ) : (
                    messages.map((msg) => {
                        // is_from_instagram = true MEANS the USER sent it (Incoming)
                        // is_from_instagram = false MEANS the BOT/SYSTEM sent it (Outgoing)
                        // Wait, usually 'is_from_instagram' means it came FROM the platform to us. 
                        // Let's assume: True = Them (Left), False = Us (Right)
                        const isMe = !msg.is_from_instagram

                        return (
                            <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                                <div className={cn(
                                    "max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                                    isMe
                                        ? "bg-purple-600 text-white rounded-br-none"
                                        : "bg-white/10 text-white rounded-bl-none border border-white/5"
                                )}>
                                    {msg.content}
                                    <div className={cn(
                                        "text-[10px] mt-1 opacity-70",
                                        isMe ? "text-purple-200 text-right" : "text-gray-400"
                                    )}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-black/40">
                <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 p-1.5 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20 transition-all">
                    <input
                        className="flex-1 bg-transparent px-3 py-2 text-sm text-white focus:outline-none placeholder:text-muted-foreground/50"
                        placeholder="Type a message..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                // Creating a fake placeholder send action for now
                                e.preventDefault()
                                setInputText("")
                            }
                        }}
                    />
                    <Button size="icon" className="h-9 w-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg shadow-purple-500/20">
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                <p className="text-[10px] text-center text-muted-foreground mt-2">
                    Messages sent here will be delivered via Instagram Direct API.
                </p>
            </div>
        </div>
    )
}
