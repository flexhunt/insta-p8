"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Instagram, LayoutDashboard, Zap, Activity, LogOut, Settings, BarChart3, Users } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  username?: string
  onLogout?: () => void
  onNavigate?: () => void
}

export function Sidebar({ className, username = "Demo User", onLogout, onNavigate, ...props }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <aside className={cn("flex flex-col", className)} {...props}>
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
          <Instagram className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-base tracking-tight text-white leading-none">InstaAuto</h2>
          <span className="text-[10px] uppercase font-bold text-purple-400 tracking-widest">Pro</span>
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
          href="/dashboard/analytics"
          icon={<BarChart3 className="w-4 h-4" />}
          label="Analytics"
          active={isActive("/dashboard/analytics")}
          onClick={onNavigate}
        />

        <div className="px-2 mb-2 mt-6 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">System</div>
        <NavItem
          href="/dashboard/settings"
          icon={<Settings className="w-4 h-4" />}
          label="Settings"
          active={isActive("/dashboard/settings")}
          onClick={onNavigate}
        />
      </div>

      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-600 ring-2 ring-transparent group-hover:ring-white/20 transition-all" />
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">{username}</p>
            <p className="text-[10px] text-muted-foreground">Pro Plan</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-3 h-3" />
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
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  href: string;
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-medium text-[13px] group relative overflow-hidden ${active
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          : "text-muted-foreground hover:text-white hover:bg-white/5"
        }`}
    >
      {active && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-shimmer" />
      )}
      <span className={active ? "text-white" : "group-hover:scale-110 transition-transform duration-300"}>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
