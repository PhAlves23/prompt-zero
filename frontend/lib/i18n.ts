import { type Locale, locales, defaultLocale } from "@/lib/locales";

export const i18n = {
  locales,
  defaultLocale,
} as const;

export type I18nConfig = typeof i18n;

export const localeNames: Record<Locale, string> = {
  'pt-BR': 'Português',
  'en-US': 'English',
  'es-ES': 'Español',
};

export const localeFlags: Record<Locale, string> = {
  'pt-BR': '🇧🇷',
  'en-US': '🇺🇸',
  'es-ES': '🇪🇸',
};
