import 'server-only'
import { isLocale, type Locale as LocaleKey } from "@/lib/locales"

const dictionaries = {
  'pt-BR': () => import('./dictionaries/pt-BR.json').then((module) => module.default),
  'en-US': () => import('./dictionaries/en-US.json').then((module) => module.default),
  'es-ES': () => import('./dictionaries/es-ES.json').then((module) => module.default),
}

export type Locale = LocaleKey

export { locales } from "@/lib/locales"
export { defaultLocale } from "@/lib/locales"

export const hasLocale = (locale: string): locale is Locale =>
  isLocale(locale) && locale in dictionaries

export const getDictionary = async (locale: Locale) => dictionaries[locale]()

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>
