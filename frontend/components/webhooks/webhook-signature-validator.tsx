"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import { toast } from "sonner"

type Dict = Dictionary["webhooksPage"]

const NODE_SNIPPET = `import { createHmac, timingSafeEqual } from "crypto";

function validatePromptZeroWebhook(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const received = signatureHeader.slice(7);
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(received, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}

// Use o corpo bruto (string), não o objeto já parseado, para bater com a assinatura.`

type Props = {
  dict: Dict
}

export function WebhookSignatureValidator({ dict }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{dict.signatureTitle}</CardTitle>
        <CardDescription>{dict.signatureDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <pre className="text-xs font-mono rounded border p-3 max-h-64 overflow-auto whitespace-pre-wrap">
          {NODE_SNIPPET}
        </pre>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(NODE_SNIPPET)
              toast.success(dict.copied)
            } catch {
              toast.error(dict.copyFailed)
            }
          }}
        >
          {dict.copySnippet}
        </Button>
      </CardContent>
    </Card>
  )
}
