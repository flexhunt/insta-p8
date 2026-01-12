"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { LandingPage } from "@/components/layout/landing-page"
import { DashboardView } from "@/components/dashboard/DashboardView"
import type { Automation } from "@/lib/types"
import { Loader2 } from "lucide-react"

export default function Home() {
  const [username, setUsername] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [automations, setAutomations] = useState<Automation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const searchParams = useSearchParams()
  const router = useRouter()

  // Define fetchAutomations early so we can use it
  const fetchAutomations = useCallback(async (currentUserId?: string) => {
    const uid = currentUserId || userId
    if (!uid) return

    try {
      console.log("[v0] Fetching automations...")
      const res = await fetch(`/api/automations?userId=${uid}`)
      const data = await res.json()
      if (res.ok) {
        setAutomations(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error("[v0] Fetch error:", err)
    }
  }, [userId])

  // 1. HANDLE LOGIN & SESSION
  useEffect(() => {
    const code = searchParams.get("code")

    const handleSession = async () => {
      // CASE A: New Login from Instagram
      if (code) {
        try {
          const res = await fetch("/api/instagram/callback", {
            method: "POST",
            body: JSON.stringify({ code }),
          })
          const data = await res.json()

          if (data.success) {
            // Save to LocalStorage (This fixes the refresh issue)
            localStorage.setItem("ig_user_id", data.userId)
            localStorage.setItem("ig_username", data.username)

            setUserId(data.userId)
            setUsername(data.username)
            router.replace("/") // Clear URL
          }
        } catch (err) {
          console.error("Login failed:", err)
        }
      }
      // CASE B: Restore Session from LocalStorage
      else {
        const savedId = localStorage.getItem("ig_user_id")
        const savedName = localStorage.getItem("ig_username")

        if (savedId && savedName) {
          setUserId(savedId)
          setUsername(savedName)
        }
      }
      setIsLoading(false)
    }

    handleSession()
  }, [searchParams, router])

  // 2. FETCH DATA WHEN USER ID IS SET
  useEffect(() => {
    if (userId) {
      fetchAutomations(userId)
    }
  }, [userId, fetchAutomations])

  const handleDeleteRule = async (id: string) => {
    await fetch(`/api/automations?id=${id}`, { method: "DELETE" })
    setAutomations((prev) => prev.filter((a) => a.id !== id))
  }

  const handleLogout = () => {
    // Clear everything
    localStorage.removeItem("ig_user_id")
    localStorage.removeItem("ig_username")
    document.cookie = "insta_session=; Max-Age=0; path=/;" // Clear legacy cookies

    setUsername(null)
    setUserId(null)
    setAutomations([])
    router.push("/")
  }

  // 3. RENDER
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 animate-pulse shadow-2xl shadow-purple-500/20" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  if (!username || !userId) return <LandingPage />

  return (
    <DashboardView
      username={username}
      userId={userId}
      automations={automations}
      onDeleteRule={handleDeleteRule}
      onLogout={handleLogout}
      onRefresh={() => fetchAutomations(userId)}
    />
  )
}
