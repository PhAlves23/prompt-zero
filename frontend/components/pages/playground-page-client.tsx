"use client"

import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { bffFetch, ClientHttpError } from "@/lib/api/client"
import type { Dictionary } from "@/app/[lang]/dictionaries"

type CompareResult = {
  results: Array<{
    model: string
    ok: boolean
    output?: string
    error?: string
  }>
}

export function PlaygroundPageClient({ dict }: { dict: Dictionary }) {
  const d = dict.playgroundPage
  const [promptId, setPromptId] = useState("")
  const [modelA, setModelA] = useState("gpt-4o-mini")
  const [modelB, setModelB] = useState("gpt-4o-mini")
  const [result, setResult] = useState<CompareResult | null>(null)

  const compare = useMutation({
    mutationFn: () =>
      bffFetch<CompareResult>("/playground/compare", {
        method: "POST",
        body: {
          promptId,
          variants: [{ model: modelA }, { model: modelB }],
        },
      }),
    onSuccess: (data) => {
      setResult(data)
      toast.success("OK")
    },
    onError: (e) => toast.error(e instanceof ClientHttpError ? e.message : d.resultErr),
  })

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>{d.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label>{d.promptId}</Label>
            <Input value={promptId} onChange={(e) => setPromptId(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{d.modelA}</Label>
            <Input value={modelA} onChange={(e) => setModelA(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{d.modelB}</Label>
            <Input value={modelB} onChange={(e) => setModelB(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button type="button" className="cursor-pointer" disabled={compare.isPending || !promptId} onClick={() => compare.mutate()}>
              {d.compare}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result ? (
        <div className="grid gap-3 md:grid-cols-2">
          {result.results.map((r, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="text-base">
                  {r.model} {r.ok ? <span className="text-emerald-600">({d.resultOk})</span> : <span className="text-destructive">({d.resultErr})</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap text-xs">{r.ok ? r.output : r.error}</pre>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  )
}
