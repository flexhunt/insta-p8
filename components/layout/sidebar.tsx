"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Instagram, LayoutDashboard, Zap, Activity, LogOut } from "lucide-react"

interface SidebarProps {
  username: string
  onLogout: () => void
}

export function Sidebar({ username, onLogout }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-white/5 bg-black/50 flex flex-col z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center text-black">
          <Instagram className="w-4 h-4" />
        </div>
        <span className="font-semibold text-sm tracking-tight">InstaAuto Pro</span>
      </div>

      <div className="flex-1 px-3 space-y-0.5">
        <NavItem icon={<LayoutDashboard className="w-4 h-4" />} label="Overview" active />
        <NavItem icon={<Zap className="w-4 h-4" />} label="Automations" />
        <NavItem icon={<Activity className="w-4 h-4" />} label="Analytics" />
      </div>

      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600" />
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-medium truncate">@{username}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            className="h-6 w-6 text-muted-foreground hover:text-red-500"
          >
            <LogOut className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </aside>
  )
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all font-medium text-[13px] ${
        active ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  )
}
