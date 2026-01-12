export interface Conversation {
    id: string
    user_id: number
    recipient_id: number
    recipient_username: string
    last_message_at: string
    created_at: string
    updated_at: string
}

export interface Message {
    id: string
    conversation_id: string
    user_id: number
    sender_id: number
    sender_username?: string
    content: string
    is_from_instagram: boolean
    created_at: string
}
