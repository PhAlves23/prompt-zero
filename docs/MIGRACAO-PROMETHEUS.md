# 🔄 Migração: promptzero-railway-prometheus → prometheus/

Este documento explica a mudança de estrutura do Prometheus no projeto.

## O que mudou?

**Antes:**
```
promptzero-railway-prometheus/    # Repositório separado ou pasta com nome longo
├── Dockerfile
├── prometheus.yml
└── ...
```

**Depois:**
```
prompt-zero/
├── backend/
├── frontend/
├── prometheus/                   # Dentro do monorepo principal ✅
│   ├── Dockerfile
│   ├── prometheus.yml
│   ├── railway.toml
│   ├── README.md
│   ├── CHECKLIST.md
│   └── COMANDOS.md
└── ...
```

## Por que mudamos?

### ✅ Vantagens da nova estrutura:

1. **Monorepo completo** - Tudo versionado junto
2. **Mais profissional** - Estrutura padrão da indústria
3. **Deploy simplificado** - Railway detecta automaticamente
4. **Manutenção fácil** - Um único repositório
5. **CI/CD unificado** - Pipelines mais simples
6. **Histórico completo** - Git log mostra tudo
7. **Nome mais limpo** - `prometheus/` ao invés de `promptzero-railway-prometheus/`

## 🚀 Como atualizar no Railway

### Opção 1: Reconfigurar o serviço existente

1. **No Railway**, vá no serviço `railway-prometheus`

2. **Settings** → **Source**

3. **Root Directory**: Mude de `promptzero-railway-prometheus` para:
   ```
   prometheus
   ```

4. **Salve** e aguarde redeploy automático

### Opção 2: Criar novo serviço

1. **No Railway**, crie um novo serviço vazio

2. **Conecte ao repositório** `prompt-zero`

3. **Configure**:
   - **Name**: `prometheus` ou `railway-prometheus`
   - **Root Directory**: `prometheus`
   - **Build Command**: (deixe vazio, usa Dockerfile)

4. **Deploy**

5. **Delete o serviço antigo** depois de confirmar que o novo funciona

## 🔍 Verificar que está tudo OK

### 1. Confirme a estrutura local

```bash
cd /Users/phalves/ph-projects/pessoal/prompt-zero

# Deve existir a pasta prometheus/
ls -la prometheus/

# Deve conter os arquivos
ls prometheus/
# Dockerfile  README.md  CHECKLIST.md  COMANDOS.md  prometheus.yml  railway.toml
```

### 2. Teste local (opcional)

```bash
cd prometheus
docker build -t test-prometheus .
docker run -d -p 9090:9090 test-prometheus

# Acesse: http://localhost:9090
# Verifique targets: Status → Targets

# Limpar depois
docker stop $(docker ps -q --filter ancestor=test-prometheus)
```

### 3. Deploy no Railway

```bash
cd prometheus
railway up
```

### 4. Verifique o deploy

1. Acesse o Prometheus no Railway
2. Vá em **Status → Targets**
3. `promptzero-backend` deve estar **UP** ✅

## 📝 Atualizar documentação local

Se você tinha links ou referências à pasta antiga, atualize:

### Exemplos de mudanças:

**Antes:**
```bash
cd promptzero-railway-prometheus
railway up
```

**Depois:**
```bash
cd prometheus
railway up
```

**Antes:**
```markdown
Ver: [Config Prometheus](./promptzero-railway-prometheus/README.md)
```

**Depois:**
```markdown
Ver: [Config Prometheus](./prometheus/README.md)
```

## 🗑️ Limpar pasta antiga

Depois de confirmar que tudo está funcionando:

### 1. Deletar repositório separado (se tinha)

Se você tinha um repositório separado `promptzero-railway-prometheus`:

```bash
# Confirme que está no lugar certo antes!
cd /path/to/promptzero-railway-prometheus
rm -rf .git
cd ..
rm -rf promptzero-railway-prometheus
```

### 2. Deletar pasta antiga no projeto

```bash
cd /Users/phalves/ph-projects/pessoal/prompt-zero

# A pasta antiga já está no .gitignore
# Você pode deletá-la depois de confirmar que tudo funciona
rm -rf promptzero-railway-prometheus
```

## ✅ Checklist de Migração

- [ ] Arquivos copiados para `prometheus/`
- [ ] Railway atualizado para usar `prometheus/` como Root Directory
- [ ] Deploy bem-sucedido no Railway
- [ ] Prometheus acessível no navegador
- [ ] Target `promptzero-backend` está UP
- [ ] Grafana ainda conectado ao Prometheus
- [ ] Dashboard funcionando
- [ ] Pasta antiga deletada (opcional)
- [ ] Documentação atualizada (se necessário)

## 🎯 Resultado Final

Estrutura limpa e profissional:

```
prompt-zero/
├── backend/              # Serviço 1
├── frontend/             # Serviço 2
├── prometheus/           # Serviço 3 (observabilidade)
├── grafana/              # Config local (não é serviço Railway)
├── docs/                 # Documentação
└── README.md             # Docs principal
```

**Cada pasta é um serviço no Railway**, com sua própria configuração.

## 📚 Documentação Relacionada

- [`prometheus/README.md`](../prometheus/README.md) - Guia completo do Prometheus
- [`STRUCTURE.md`](../STRUCTURE.md) - Estrutura completa do monorepo
- [`docs/CONECTAR-PROMETHEUS-GRAFANA.md`](../docs/CONECTAR-PROMETHEUS-GRAFANA.md) - Como conectar

---

**Data da migração:** 2026-03-31  
**Status:** ✅ Completa
