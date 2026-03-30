'use client'

import { usePathname, useRouter } from 'next/navigation'
import { localeNames, localeFlags } from '@/lib/i18n'
import { type Locale } from '@/app/[lang]/dictionaries'

export function LanguageSwitcher({ currentLang }: { currentLang: Locale }) {
  const pathname = usePathname()
  const router = useRouter()

  const switchLanguage = (newLang: Locale) => {
    const segments = pathname.split('/')
    segments[1] = newLang
    router.push(segments.join('/'))
  }

  return (
    <div className="flex gap-2" role="group" aria-label="Language selector">
      {(Object.keys(localeNames) as Locale[]).map((locale) => (
        <button
          key={locale}
          onClick={() => switchLanguage(locale)}
          className={`
            px-3 py-1.5 rounded-lg font-mono text-xs transition-all cursor-pointer
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background
            ${currentLang === locale 
              ? 'bg-pz-lime text-pz-black focus-visible:ring-pz-lime' 
              : 'bg-surface border border-border text-muted-foreground hover:border-pz-lime/30 hover:text-foreground hover:bg-surface/80 focus-visible:ring-border'
            }
          `}
          aria-label={`Switch to ${localeNames[locale]}`}
          aria-current={currentLang === locale ? 'true' : 'false'}
        >
          <span className="mr-1.5" aria-hidden="true">{localeFlags[locale]}</span>
          {locale.split('-')[0].toUpperCase()}
        </button>
      ))}
    </div>
  )
}
