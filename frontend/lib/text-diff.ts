export type DiffLineType = "same" | "add" | "remove"

export type DiffLine = {
  type: DiffLineType
  text: string
}

/** Linha a linha simples (não é um diff estilo Git). Útil para comparar versões rapidamente. */
export function simpleLineDiff(left: string, right: string): DiffLine[] {
  const a = left.split("\n")
  const b = right.split("\n")
  const max = Math.max(a.length, b.length)
  const out: DiffLine[] = []
  for (let i = 0; i < max; i += 1) {
    const al = a[i]
    const br = b[i]
    if (al === br) {
      out.push({ type: "same", text: al ?? "" })
    } else {
      if (al !== undefined) out.push({ type: "remove", text: al })
      if (br !== undefined) out.push({ type: "add", text: br })
    }
  }
  return out
}
