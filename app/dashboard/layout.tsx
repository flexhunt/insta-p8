"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { Loader2 } from "lucide-react"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { username, logout, isLoading } = useInstagramSession()

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-black text-white">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-black text-foreground">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50">
                <Sidebar
                    className="h-full border-r border-white/10 bg-black/50 backdrop-blur-xl"
                    username={username || "User"}
                    onLogout={logout}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:pl-64 transition-all duration-300">
                {/* Mobile Header (Visible only on small screens) */}
                <header className="md:hidden h-16 border-b border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-40">
                    <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">InstaAuto</span>
                    <MobileNav username={username || "User"} onLogout={logout} />
                </header>

                <main className="flex-1 relative overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
