"use client"

import { useState } from "react"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { ConversationList } from "@/components/inbox/ConversationList"
import { ChatWindow } from "@/components/inbox/ChatWindow"
import { Loader2 } from "lucide-react"

export default function InboxPage() {
    const { userId, isLoading } = useInstagramSession()
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
    const [selectedRecipientName, setSelectedRecipientName] = useState<string | null>(null)

    const handleSelect = (id: string, name: string) => {
        setSelectedConversationId(id)
        setSelectedRecipientName(name)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        )
    }

    if (!userId) {
        return null // Or a redirect
    }

    return (
        <div className="h-[calc(100vh-2rem)] rounded-2xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex">
            {/* Left Sidebar: Conversation List */}
            <ConversationList
                userId={userId}
                selectedId={selectedConversationId}
                onSelect={handleSelect}
            />

            {/* Right Main: Chat Window */}
            <ChatWindow
                conversationId={selectedConversationId}
                recipientName={selectedRecipientName}
            />
        </div>
    )
}
