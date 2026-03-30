import 'server-only'

const dictionaries = {
  'pt-BR': () => import('./dictionaries/pt-BR.json').then((module) => module.default),
  'en-US': () => import('./dictionaries/en-US.json').then((module) => module.default),
  'es-ES': () => import('./dictionaries/es-ES.json').then((module) => module.default),
}

export type Locale = keyof typeof dictionaries

export const locales = Object.keys(dictionaries) as Locale[]

export const defaultLocale: Locale = 'pt-BR'

export const hasLocale = (locale: string): locale is Locale =>
  locale in dictionaries

export const getDictionary = async (locale: Locale) => dictionaries[locale]()

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>
