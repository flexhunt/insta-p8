// Creating shared types for automation system
export type ButtonAction = "web_url" | "postback"

export interface ProButton {
  id: string
  type: ButtonAction
  title: string
  url?: string
  payload?: string
}

export interface MediaItem {
  id: string
  media_id: string
  media_type: string
  caption: string
  image_url: string
  video_url: string
  permalink: string
  media_product_type: string
  timestamp: string
}

export interface MediaSelection {
  reel_id: string
  caption?: string
}

export interface Automation {
  id: string
  name: string
  trigger_value: string
  trigger_type: string
  response_content: any
  is_active: boolean
  created_at: string
  specific_media_id?: string | null
  media_selection?: MediaSelection | null
  selected_reel_id?: string | null
}
