"use client"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { useState } from "react"

export function MobileNav() {
    const [open, setOpen] = useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 border-r border-white/10 bg-black w-72">
                <Sidebar
                    className="h-full border-none bg-transparent"
                    onNavigate={() => setOpen(false)}
                />
            </SheetContent>
        </Sheet>
    )
}
