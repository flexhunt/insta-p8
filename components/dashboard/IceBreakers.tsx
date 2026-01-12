"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { MessageCircle, Plus, Trash2, Save, Loader2 } from "lucide-react"
import { toast } from "sonner" // Assuming you have sonner or use your toast hook

export function IceBreakers({ userId }: { userId: string }) {
  const [questions, setQuestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (userId) fetchIceBreakers()
  }, [userId])

  const fetchIceBreakers = async () => {
    try {
      const res = await fetch(`/api/instagram/ice-breakers?userId=${userId}`)
      const json = await res.json()
      if (json.data) {
        setQuestions(json.data.map((item: any) => item.question))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setFetching(false)
    }
  }

  const handleAdd = () => {
    if (questions.length >= 4) return
    setQuestions([...questions, ""])
  }

  const handleChange = (index: number, value: string) => {
    const newQ = [...questions]
    newQ[index] = value
    setQuestions(newQ)
  }

  const handleRemove = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    // Filter out empty strings
    const validQuestions = questions.filter(q => q.trim().length > 0)
    
    setLoading(true)
    try {
      const res = await fetch("/api/instagram/ice-breakers", {
        method: "POST",
        body: JSON.stringify({ userId, questions: validQuestions }),
      })
      if (res.ok) {
        alert("Saved! Check your Instagram DM screen.")
      } else {
        alert("Failed to save.")
      }
    } catch (e) {
      alert("Error saving.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-black/40 border-white/10 backdrop-blur-xl p-6 space-y-6">
      <div className="flex items-center gap-2 border-b border-white/5 pb-4">
        <MessageCircle className="w-4 h-4 text-blue-500" />
        <h3 className="text-sm font-bold">Ice Breakers (FAQ)</h3>
      </div>
      
      <p className="text-[10px] text-muted-foreground">
        These buttons appear before a chat starts. (Max 4)
      </p>

      {fetching ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="flex gap-2">
              <Input 
                value={q} 
                onChange={(e) => handleChange(i, e.target.value)}
                placeholder="e.g. How much is this?"
                className="bg-white/5 border-white/10 text-xs h-9"
              />
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => handleRemove(i)}
                className="h-9 w-9 text-red-500 hover:bg-white/5"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          
          {questions.length < 4 && (
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAdd}
                className="w-full border-dashed border-white/20 hover:bg-white/5 text-xs h-8"
            >
                <Plus className="w-3 h-3 mr-2" /> Add Question
            </Button>
          )}
        </div>
      )}

      <Button 
        onClick={handleSave} 
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save to Instagram</>}
      </Button>
    </Card>
  )
}
