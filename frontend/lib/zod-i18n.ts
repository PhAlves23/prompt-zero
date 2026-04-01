import type { Dictionary } from "@/app/[lang]/dictionaries"

function interpolate(template: string, params: Record<string, string | number>) {
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

/** Mensagens reutilizáveis para schemas Zod alinhadas ao idioma do dicionário. */
export function validationMessages(dict: Dictionary) {
  const v = dict.validation
  return {
    stringMin: (min: number) => interpolate(v.stringMin, { min }),
    stringMax: (max: number) => interpolate(v.stringMax, { max }),
    invalidEmail: () => v.invalidEmail,
    passwordMin: (min: number) => interpolate(v.passwordMin, { min }),
    invalidHexColor: () => v.invalidHexColor,
    numberMin: (min: number) => interpolate(v.numberMin, { min }),
    numberMax: (max: number) => interpolate(v.numberMax, { max }),
    numberInt: () => v.numberInt,
    contentMin: (min: number) => interpolate(v.contentMin, { min }),
  }
}
