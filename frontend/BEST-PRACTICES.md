# Boas Práticas - Frontend PromptZero

## 🎯 Elementos Interativos

### Botões

Sempre incluir:

```tsx
<button
  className="... cursor-pointer"
  aria-label="Descrição clara da ação"
  disabled={isLoading}
>
  Texto do botão
</button>
```

**Checklist obrigatório:**
- ✅ `cursor-pointer` - Indica visualmente que é clicável
- ✅ `aria-label` - Acessibilidade para screen readers
- ✅ `disabled` state - Quando aplicável
- ✅ `focus-visible:ring-*` - Indicador de foco para navegação por teclado
- ✅ `active:*` - Feedback visual ao clicar
- ✅ `hover:*` - Feedback visual ao passar o mouse
- ✅ `transition-*` - Animações suaves

**Exemplo completo:**

```tsx
<button
  className="
    px-7 py-3 
    bg-pz-lime text-pz-black 
    font-semibold rounded-lg 
    cursor-pointer
    hover:bg-pz-lime/90 hover:shadow-lg hover:-translate-y-0.5
    active:translate-y-0 active:scale-[0.98]
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pz-lime focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
    transition-all duration-200
  "
  aria-label="Criar novo prompt"
  disabled={isLoading}
>
  {dict.prompts.create}
</button>
```

### Links

```tsx
<a
  href="/dashboard"
  className="
    text-pz-cyan 
    hover:text-pz-cyan/80 hover:underline
    cursor-pointer
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pz-cyan
    transition-colors
  "
  aria-label="Ir para dashboard"
>
  Dashboard
</a>
```

### Inputs

```tsx
<input
  type="text"
  className="
    px-4 py-2
    bg-input border border-border rounded-lg
    text-foreground placeholder:text-muted-foreground
    cursor-text
    hover:border-pz-lime/30
    focus:border-pz-lime focus:ring-2 focus:ring-pz-lime/20
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-colors
  "
  placeholder={dict.common.search}
  aria-label="Campo de busca"
  disabled={isLoading}
/>
```

### Selects / Dropdowns

```tsx
<select
  className="
    px-4 py-2
    bg-input border border-border rounded-lg
    cursor-pointer
    hover:border-pz-lime/30
    focus:border-pz-lime focus:ring-2 focus:ring-pz-lime/20
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-colors
  "
  aria-label="Selecionar modelo"
>
  <option>Claude Sonnet</option>
</select>
```

### Checkboxes / Radio

```tsx
<input
  type="checkbox"
  className="
    cursor-pointer
    accent-pz-lime
    focus-visible:ring-2 focus-visible:ring-pz-lime
    disabled:cursor-not-allowed
  "
  aria-label="Aceitar termos"
/>
```

### Cards Clicáveis

```tsx
<div
  onClick={handleClick}
  className="
    p-6 bg-card border border-border rounded-2xl
    cursor-pointer
    hover:border-pz-lime/20 hover:shadow-lg
    active:scale-[0.99]
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pz-lime
    transition-all
  "
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  aria-label="Abrir prompt"
>
  Conteúdo do card
</div>
```

## ♿ Acessibilidade

### ARIA Labels

Sempre adicionar em:
- Botões com apenas ícones
- Links sem texto descritivo
- Elementos interativos customizados
- Campos de formulário

```tsx
// ✅ BOM
<button aria-label="Deletar prompt">
  <TrashIcon />
</button>

// ❌ RUIM
<button>
  <TrashIcon />
</button>
```

### Navegação por Teclado

Elementos interativos devem responder a:
- `Enter` - Ativar ação
- `Space` - Ativar ação (botões)
- `Escape` - Fechar modais/dropdowns
- `Tab` - Navegar entre elementos

```tsx
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleAction()
    }
  }}
>
  Elemento customizado
</div>
```

### Focus Visible

Sempre incluir indicador de foco:

```tsx
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pz-lime focus-visible:ring-offset-2"
```

## 🎨 Estados Visuais

### Loading State

```tsx
<button
  disabled={isLoading}
  className="... disabled:opacity-50 disabled:cursor-not-allowed"
  aria-busy={isLoading}
>
  {isLoading ? (
    <>
      <Spinner className="mr-2" />
      Carregando...
    </>
  ) : (
    'Salvar'
  )}
</button>
```

### Error State

```tsx
<input
  className="... aria-invalid:border-pz-danger aria-invalid:ring-2 aria-invalid:ring-pz-danger/20"
  aria-invalid={hasError}
  aria-describedby={hasError ? "error-message" : undefined}
/>
{hasError && (
  <span id="error-message" className="text-sm text-pz-danger" role="alert">
    {errorMessage}
  </span>
)}
```

### Disabled State

```tsx
<button
  disabled={true}
  className="... disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
>
  Desabilitado
</button>
```

## 🎭 Animações e Transições

### Duração (conforme brand guide)

```css
/* Micro - 150ms */
transition-all duration-150

/* Default - 200ms */
transition-all duration-200

/* Emphasis - 300ms */
transition-all duration-300
```

### Easing

```tsx
// Padrão
className="transition-all ease-out"

// Suave
className="transition-all ease-in-out"

// Custom (brand guide)
style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
```

### Hover Effects (conforme brand guide)

```tsx
// Botão primário
className="hover:bg-pz-lime/90 hover:-translate-y-0.5 hover:shadow-lg"

// Botão secundário
className="hover:bg-surface hover:border-muted"

// Card
className="hover:border-pz-lime/20 hover:shadow-lg"

// Link
className="hover:text-pz-cyan/80 hover:underline"
```

## 📱 Responsividade

### Breakpoints Tailwind

```tsx
// Mobile first
<div className="
  flex-col          // mobile
  sm:flex-row       // ≥640px
  md:gap-6          // ≥768px
  lg:max-w-4xl      // ≥1024px
  xl:px-8           // ≥1280px
">
```

### Touch Targets

Mínimo 44x44px para dispositivos touch:

```tsx
// ✅ BOM
<button className="min-h-[44px] min-w-[44px] p-3">
  <Icon />
</button>

// ❌ RUIM
<button className="p-1">
  <Icon />
</button>
```

## 🎨 Cores do Brand Guide

### Uso correto das cores

```tsx
// Primário (Lime) - CTAs, highlights, indicadores ativos
className="bg-pz-lime text-pz-black"

// Acento Cyan - Links, info, badges de modelo
className="text-pz-cyan"

// Acento Violet - Templates, variáveis
className="text-pz-violet"

// Acento Coral - Ações destrutivas, avisos
className="text-pz-coral"

// Backgrounds
className="bg-background"      // #0A0A0B (black)
className="bg-card"            // #1A1A1E (surface)
className="bg-surface"         // #1A1A1E (surface)

// Bordas
className="border-border"      // #2A2A32

// Texto
className="text-foreground"    // #E8E8EC (white)
className="text-muted-foreground" // #6B6B7B (muted)
```

### Regra de proporção (brand guide)

> 90% tons escuros + 5% texto + 5% acento (lime)

O lime deve ser escasso — cada uso precisa comunicar algo.

## 🔤 Tipografia

### Hierarquia

```tsx
// Títulos principais (Space Mono)
<h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight">

// Títulos de seção (Space Mono)
<h2 className="font-heading text-2xl md:text-3xl font-bold">

// Subtítulos (DM Sans)
<h3 className="text-xl font-semibold">

// Corpo (DM Sans)
<p className="text-base leading-relaxed">

// Texto pequeno (DM Sans)
<span className="text-sm text-muted-foreground">

// Code / Labels (JetBrains Mono)
<code className="font-mono text-sm text-pz-lime">

// Labels uppercase (JetBrains Mono)
<span className="font-mono text-xs uppercase tracking-wider text-pz-lime">
```

## 📦 Componentes Reutilizáveis

### Sempre criar componente para:

1. **Elementos repetidos** (mais de 2 usos)
2. **Lógica complexa** (estados, validações)
3. **Padrões do brand guide** (botões, cards, tags)

### Exemplo: Tag Component

```tsx
// components/ui/tag.tsx
export function Tag({ 
  children, 
  variant = 'lime' 
}: { 
  children: React.ReactNode; 
  variant?: 'lime' | 'cyan' | 'violet' | 'coral' | 'amber';
}) {
  const variants = {
    lime: 'text-pz-lime border-pz-lime/30 bg-pz-lime/10',
    cyan: 'text-pz-cyan border-pz-cyan/30 bg-pz-cyan/10',
    violet: 'text-pz-violet border-pz-violet/30 bg-pz-violet/10',
    coral: 'text-pz-coral border-pz-coral/30 bg-pz-coral/10',
    amber: 'text-pz-amber border-pz-amber/30 bg-pz-amber/10',
  };

  return (
    <span className={`
      font-mono text-xs px-3 py-1 rounded-full border
      ${variants[variant]}
    `}>
      {children}
    </span>
  );
}
```

## 🚫 Anti-Patterns

### ❌ NÃO FAZER

```tsx
// Sem cursor-pointer
<button className="bg-primary">Click</button>

// Sem aria-label em ícone
<button><TrashIcon /></button>

// Sem estados hover/focus
<button className="bg-primary text-white">Click</button>

// Sem feedback visual
<button onClick={handleClick}>Click</button>

// Div clicável sem role/tabIndex
<div onClick={handleClick}>Click</div>

// Cores hardcoded
<button className="bg-[#BEFF00] text-[#0A0A0B]">Click</button>
```

### ✅ FAZER

```tsx
// Com todas as boas práticas
<button
  className="
    bg-primary text-primary-foreground
    cursor-pointer
    hover:bg-primary/90 hover:shadow-lg
    active:scale-[0.98]
    focus-visible:ring-2 focus-visible:ring-primary
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all
  "
  aria-label="Criar novo prompt"
  disabled={isLoading}
>
  {isLoading ? <Spinner /> : dict.prompts.create}
</button>

// Ícone com label
<button
  className="... cursor-pointer"
  aria-label="Deletar prompt"
>
  <TrashIcon className="size-4" />
</button>

// Div clicável acessível
<div
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  role="button"
  tabIndex={0}
  className="... cursor-pointer"
  aria-label="Abrir detalhes"
>
  Conteúdo
</div>

// Cores do brand guide
<button className="bg-pz-lime text-pz-black">
  Click
</button>
```

## 🎨 Padrões de Componentes (Brand Guide)

### Botão Primário

```tsx
<button className="
  px-7 py-3
  bg-pz-lime text-pz-black
  font-semibold rounded-lg
  cursor-pointer
  hover:bg-pz-lime/90 hover:shadow-lg hover:-translate-y-0.5
  active:translate-y-0
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pz-lime focus-visible:ring-offset-2
  transition-all duration-200
">
  Ação Principal
</button>
```

### Botão Secundário

```tsx
<button className="
  px-7 py-3
  border border-border bg-transparent
  text-foreground
  rounded-lg
  cursor-pointer
  hover:bg-surface hover:border-muted
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border
  transition-colors duration-200
">
  Ação Secundária
</button>
```

### Botão Ghost

```tsx
<button className="
  px-4 py-2
  bg-transparent
  text-pz-lime
  cursor-pointer
  hover:bg-pz-lime/10
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pz-lime/50
  transition-colors
">
  ← Voltar
</button>
```

### Botão Danger

```tsx
<button className="
  px-7 py-3
  border border-pz-coral/30 bg-transparent
  text-pz-coral
  rounded-lg
  cursor-pointer
  hover:bg-pz-coral/10
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pz-coral
  transition-colors
">
  Deletar
</button>
```

### Input Field

```tsx
<div className="flex flex-col gap-2">
  <label 
    htmlFor="prompt-title" 
    className="text-sm font-medium text-muted-foreground"
  >
    Título do prompt
  </label>
  <input
    id="prompt-title"
    type="text"
    className="
      px-4 py-3
      bg-input border border-border rounded-lg
      text-foreground placeholder:text-muted-foreground
      cursor-text
      hover:border-pz-lime/30
      focus:border-pz-lime focus:ring-2 focus:ring-pz-lime/20 focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
      transition-colors
    "
    placeholder="Ex: Gerador de copy"
    aria-label="Título do prompt"
  />
</div>
```

### Tag/Badge

```tsx
<span className="
  font-mono text-xs
  px-3 py-1
  rounded-full
  border border-pz-lime/30
  bg-pz-lime/10
  text-pz-lime
">
  marketing
</span>
```

### Card

```tsx
<div className="
  p-6
  bg-card border border-border rounded-2xl
  hover:border-pz-lime/20 hover:shadow-lg
  transition-all duration-300
">
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-heading text-xl font-bold">Título</h3>
    <span className="font-mono text-xs text-pz-lime bg-pz-lime/10 px-3 py-1 rounded-full">
      v4
    </span>
  </div>
  <p className="text-sm text-muted-foreground mb-4">
    Descrição do card
  </p>
  <div className="flex gap-2">
    <span className="font-mono text-xs px-3 py-1 rounded-full border border-pz-lime/30 bg-pz-lime/10 text-pz-lime">
      tag1
    </span>
  </div>
</div>
```

## 🔍 Checklist de Code Review

Antes de fazer commit, verificar:

- [ ] Todos os botões têm `cursor-pointer`
- [ ] Todos os elementos interativos têm `aria-label` ou texto descritivo
- [ ] Estados hover, focus e active estão implementados
- [ ] Transições suaves estão aplicadas
- [ ] Estados disabled têm `cursor-not-allowed`
- [ ] Navegação por teclado funciona (Tab, Enter, Escape)
- [ ] Cores seguem o brand guide (usar variáveis `--pz-*`)
- [ ] Fontes corretas: Space Mono (heading), DM Sans (body), JetBrains Mono (code)
- [ ] Border-radius: 16px (cards), 10px (botões), 100px (tags)
- [ ] Espaçamento segue múltiplos de 4px
- [ ] Touch targets mínimo 44x44px
- [ ] Loading states têm feedback visual
- [ ] Formulários têm labels associados (htmlFor + id)

## 📚 Recursos

- Brand Guide: `/brand-guide.html`
- Componentes UI: `/components/ui/`
- Cores: `app/globals.css` (variáveis `--pz-*`)
- i18n: `app/[lang]/dictionaries/`
- Ícones: Lucide React (stroke 1.5px, size 20px)
