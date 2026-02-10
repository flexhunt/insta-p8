"use client"

import { Button } from "@/components/ui/button"

export function LandingPage() {
  const handleLogin = () => {
    window.location.href = `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=${process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID}&redirect_uri=${process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI}&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights`
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black overflow-x-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 grayscale brightness-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      </div>

      <nav className="relative z-50 h-24 flex items-center justify-between px-12 border-b border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-12">
          <span className="text-2xl font-serif tracking-tighter lowercase">gamma.</span>
          <div className="hidden md:flex gap-8 text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">
            <a href="#" className="hover:opacity-100 transition-opacity">
              Artists
            </a>
            <a href="#" className="hover:opacity-100 transition-opacity">
              News
            </a>
            <a href="#" className="hover:opacity-100 transition-opacity">
              Distribution
            </a>
          </div>
        </div>
        <Button
          onClick={handleLogin}
          variant="outline"
          className="border-white/20 rounded-full px-8 text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all bg-transparent"
        >
          Connect Instagram
        </Button>
      </nav>

      <main className="relative z-10 pt-32 px-12 pb-48">
        <div className="grid md:grid-cols-2 gap-24 items-end">
          <div className="space-y-12">
            <h1 className="text-8xl md:text-[10rem] font-serif leading-[0.85] tracking-tighter">
              Auto
              <br />
              Engage.
            </h1>
            <p className="max-w-md text-lg text-white/50 leading-relaxed font-light">
              A minimalist infrastructure for premium Instagram automation. Built for the next generation of digital
              artists and labels.
            </p>
            <div className="flex gap-4">
              <Button
                onClick={handleLogin}
                className="bg-white text-black h-16 px-12 rounded-full font-bold text-xs uppercase tracking-[0.2em] hover:scale-105 transition-transform"
              >
                Start Flow
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FeatureItem title="Artists" />
            <FeatureItem title="Shop" />
            <FeatureItem title="Nashville" />
            <FeatureItem title="Lagos" />
          </div>
        </div>
      </main>
    </div>
  )
}

function FeatureItem({ title }: { title: string }) {
  return (
    <div className="aspect-[4/3] border border-white/5 bg-white/[0.02] flex items-end p-6 group cursor-pointer overflow-hidden rounded-xl relative">
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <span className="text-4xl font-serif tracking-tighter group-hover:-translate-y-2 transition-transform duration-500">
        {title}
      </span>
    </div>
  )
}
