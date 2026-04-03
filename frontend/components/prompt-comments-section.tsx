"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { bffFetch, ClientHttpError } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { PromptComment } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import { formatDateTimeLocale } from "@/lib/format-datetime"

function CommentBlock({
  comment,
  lang,
  dict,
  onReply,
  depth,
}: {
  comment: PromptComment
  lang: string
  dict: Dictionary
  onReply: (parentId: string, content: string) => void
  depth: number
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const c = dict.prompts.detail.comments

  return (
    <div className={`rounded border p-3 text-sm ${depth > 0 ? "ml-4 mt-2 border-dashed" : ""}`}>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{comment.user.name}</span>
        <span className="text-xs text-muted-foreground">{formatDateTimeLocale(comment.createdAt, lang)}</span>
      </div>
      <p className="whitespace-pre-wrap text-muted-foreground">{comment.content}</p>
      {depth < 4 ? (
        <Button type="button" variant="ghost" size="sm" className="mt-2 h-7 cursor-pointer px-2 text-xs" onClick={() => setOpen(!open)}>
          {c.reply}
        </Button>
      ) : null}
      {open ? (
        <div className="mt-2 grid gap-2">
          <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={c.placeholder} />
          <Button
            type="button"
            size="sm"
            className="w-fit cursor-pointer"
            onClick={() => {
              if (!text.trim()) return
              onReply(comment.id, text)
              setText("")
              setOpen(false)
            }}
          >
            {c.submit}
          </Button>
        </div>
      ) : null}
      {comment.replies?.length
        ? comment.replies.map((r) => (
            <CommentBlock key={r.id} comment={r} lang={lang} dict={dict} onReply={onReply} depth={depth + 1} />
          ))
        : null}
    </div>
  )
}

export function PromptCommentsSection({ promptId, lang, dict }: { promptId: string; lang: string; dict: Dictionary }) {
  const c = dict.prompts.detail.comments
  const queryClient = useQueryClient()
  const [content, setContent] = useState("")

  const listQuery = useQuery({
    queryKey: queryKeys.comments.prompt(promptId),
    queryFn: () => bffFetch<PromptComment[]>(`/comments/prompt/${promptId}`),
  })

  const createMutation = useMutation({
    mutationFn: (body: { content: string; parentId?: string }) =>
      bffFetch<PromptComment>(`/comments/prompt/${promptId}`, { method: "POST", body }),
    onSuccess: () => {
      setContent("")
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments.prompt(promptId) })
    },
    onError: (e) => toast.error(e instanceof ClientHttpError ? e.message : "Error"),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{c.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder={c.placeholder} />
          <Button
            type="button"
            className="w-fit cursor-pointer"
            disabled={createMutation.isPending || !content.trim()}
            onClick={() => createMutation.mutate({ content: content.trim() })}
          >
            {c.submit}
          </Button>
        </div>
        {listQuery.isPending ? <p className="text-sm text-muted-foreground">{c.loading}</p> : null}
        {!listQuery.isPending && listQuery.data && listQuery.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{c.empty}</p>
        ) : null}
        <div className="grid gap-2">
          {listQuery.data?.map((comment) => (
            <CommentBlock
              key={comment.id}
              comment={comment}
              lang={lang}
              dict={dict}
              depth={0}
              onReply={(parentId, text) => createMutation.mutate({ content: text, parentId })}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
