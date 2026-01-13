"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Instagram, LayoutDashboard, Zap, LogOut, Settings, BarChart3, MessageSquare, Snowflake } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  username?: string
  className?: string
  onLogout?: () => void
  onNavigate?: () => void
}

export function Sidebar({ className, username = "Demo User", onLogout, onNavigate, ...props }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <aside className={cn("flex flex-col", className)} {...props}>
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center">
          <Instagram className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-base tracking-tight text-white leading-none">InstaAuto</h2>
          <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Pro</span>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-2 py-4">
        <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">Main</div>
        <NavItem
          href="/dashboard"
          icon={<LayoutDashboard className="w-4 h-4" />}
          label="Dashboard"
          active={isActive("/dashboard")}
          onClick={onNavigate}
        />
        <NavItem
          href="/dashboard/automations"
          icon={<Zap className="w-4 h-4" />}
          label="Automations"
          active={isActive("/dashboard/automations")}
          onClick={onNavigate}
        />
        <NavItem
          href="/dashboard/ice-breakers"
          icon={<Snowflake className="w-4 h-4" />}
          label="Ice Breakers"
          active={isActive("/dashboard/ice-breakers")}
          onClick={onNavigate}
        />
        <NavItem
          href="/dashboard/inbox"
          icon={<MessageSquare className="w-4 h-4" />}
          label="Inbox"
          active={isActive("/dashboard/inbox")}
          onClick={onNavigate}
        />
        <NavItem
          href="/dashboard/analytics"
          icon={<BarChart3 className="w-4 h-4" />}
          label="Analytics"
          active={isActive("/dashboard/analytics")}
          onClick={onNavigate}
        />

        <div className="px-2 mb-2 mt-6 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
          System
        </div>
        <NavItem
          href="/dashboard/settings"
          icon={<Settings className="w-4 h-4" />}
          label="Settings"
          active={isActive("/dashboard/settings")}
          onClick={onNavigate}
        />
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm group">
          <div className="w-9 h-9 rounded-full bg-neutral-800 ring-2 ring-white/10 group-hover:ring-white/30 transition-all flex items-center justify-center">
            <span className="text-xs font-bold text-neutral-400">{username.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold text-white truncate">{username}</p>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <p className="text-[10px] text-neutral-500">Pro Plan</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}

function NavItem({
  icon,
  label,
  active = false,
  href,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  href: string
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all font-medium text-[13px] group relative overflow-hidden ${
        active ? "bg-white text-black shadow-none" : "text-neutral-500 hover:text-white hover:bg-white/5"
      }`}
    >
      {active && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-shimmer" />
      )}
      <span className={active ? "text-black" : "group-hover:text-white transition-colors duration-300"}>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
