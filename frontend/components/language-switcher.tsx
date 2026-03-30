'use client'

import { usePathname, useRouter } from 'next/navigation'
import { localeNames, localeFlags } from '@/lib/i18n'
import { type Locale, isLocale } from '@/lib/locales'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Languages } from 'lucide-react'

export function LanguageSwitcher({ currentLang }: { currentLang?: Locale }) {
  const pathname = usePathname()
  const router = useRouter()
  const segment = pathname.split('/')[1] ?? "pt-BR"
  const detectedLang: Locale = isLocale(segment) ? segment : "pt-BR"
  const activeLang = currentLang ?? detectedLang

  const switchLanguage = (newLang: Locale) => {
    const segments = pathname.split('/')
    segments[1] = newLang
    router.push(segments.join('/'))
  }

  return (
    <Select
      value={activeLang}
      onValueChange={(value) => {
        if (isLocale(value)) {
          switchLanguage(value)
        }
      }}
    >
      <SelectTrigger className="w-[170px] cursor-pointer">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(localeNames) as Locale[]).map((locale) => (
          <SelectItem key={locale} value={locale} className="cursor-pointer">
            <span className="mr-2" aria-hidden="true">
              {localeFlags[locale]}
            </span>
            {localeNames[locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
