/**
 * Formata instante ISO para o locale da UI (data e hora curtas, fuso local).
 */
export function formatDateTimeLocale(value: string, locale: string): string {
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) {
      return value
    }
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(d)
  } catch {
    try {
      return new Date(value).toLocaleString(locale)
    } catch {
      return new Date(value).toLocaleString()
    }
  }
}
