# Internacionalização (i18n)

O PromptZero suporta 3 idiomas:

- 🇧🇷 **pt-BR** (Português - Brasil) - padrão
- 🇺🇸 **en-US** (English - United States)
- 🇪🇸 **es-ES** (Español - España)

## Como funciona

### 1. Detecção automática de idioma

O middleware (`middleware.ts`) detecta automaticamente o idioma preferido do navegador através do header `Accept-Language` e redireciona para a rota correta:

- `/` → `/pt-BR/` (usuário brasileiro)
- `/` → `/en-US/` (usuário americano)
- `/` → `/es-ES/` (usuário espanhol)

### 2. Estrutura de rotas

Todas as páginas estão dentro de `app/[lang]/`:

```
app/
├── [lang]/
│   ├── dictionaries/
│   │   ├── pt-BR.json
│   │   ├── en-US.json
│   │   └── es-ES.json
│   ├── dictionaries.ts
│   ├── layout.tsx
│   └── page.tsx
├── globals.css
└── ...
```

### 3. Usando traduções em componentes

#### Server Components (recomendado)

```tsx
import { getDictionary, hasLocale, type Locale } from "./dictionaries";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dict = await getDictionary(lang as Locale);

  return (
    <div>
      <h1>{dict.prompts.title}</h1>
      <button>{dict.common.save}</button>
    </div>
  );
}
```

#### Client Components

Para componentes client, passe o dicionário como prop:

```tsx
// page.tsx (Server Component)
export default async function Page({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  
  return <ClientComponent dict={dict} lang={lang} />;
}

// client-component.tsx
'use client'
import { type Dictionary } from "./dictionaries";

export function ClientComponent({ dict, lang }: { dict: Dictionary; lang: string }) {
  return <button>{dict.common.save}</button>;
}
```

### 4. Trocar idioma

Use o componente `<LanguageSwitcher>`:

```tsx
import { LanguageSwitcher } from "@/components/language-switcher";

<LanguageSwitcher currentLang={lang} />
```

### 5. Adicionar novas traduções

1. Adicione a chave em todos os arquivos JSON em `dictionaries/`
2. Use a chave no componente: `dict.seuGrupo.suaChave`

Exemplo:

```json
// pt-BR.json
{
  "dashboard": {
    "welcome": "Bem-vindo ao PromptZero"
  }
}
```

```tsx
// page.tsx
<h1>{dict.dashboard.welcome}</h1>
```

## Rotas disponíveis

- `/pt-BR` - Português
- `/en-US` - Inglês
- `/es-ES` - Espanhol

Acessar `/` redireciona automaticamente para o idioma do navegador.
