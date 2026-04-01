# Checklist de Configuração - MinIO Avatar Upload

## ✅ Pré-requisitos

- [x] Backend e Frontend já instalados
- [x] Banco de dados rodando
- [x] Conta no Railway com MinIO configurado

## 📝 Passos para Configurar

### 1. Obter Credenciais do MinIO no Railway

Acesse seu projeto no Railway e copie as seguintes variáveis:

```
MINIO_PRIVATE_ENDPOINT (ou MINIO_PRIVATE_HOST)
MINIO_PRIVATE_PORT
MINIO_PUBLIC_HOST
MINIO_PUBLIC_PORT
MINIO_ROOT_USER
MINIO_ROOT_PASSWORD
```

### 2. Configurar Backend

Edite o arquivo `backend/.env` e adicione:

```bash
# MinIO Configuration
MINIO_ENDPOINT=<MINIO_PRIVATE_HOST sem http:// ou https://>
MINIO_PORT=<MINIO_PRIVATE_PORT>
MINIO_ROOT_USER=<MINIO_ROOT_USER do Railway>
MINIO_ROOT_PASSWORD=<MINIO_ROOT_PASSWORD do Railway>
MINIO_USE_SSL=true
MINIO_BUCKET_NAME=prompt-zero
MINIO_PUBLIC_URL=<MINIO_PUBLIC_HOST para URLs públicas>
```

**Exemplo real:**
```bash
MINIO_ENDPOINT=minio.railway.app
MINIO_PORT=443
MINIO_ROOT_USER=abc123xyz456
MINIO_ROOT_PASSWORD=secretpassword123
MINIO_USE_SSL=true
MINIO_BUCKET_NAME=prompt-zero
MINIO_PUBLIC_URL=minio.railway.app
```

### 3. Testar Conexão

```bash
cd backend
npm run test:minio
```

**Resultado esperado:**
```
✅ MinIO connection successful!
✅ Bucket "prompt-zero" is ready
```

**Se der erro:**
- Verifique se as credenciais estão corretas
- Confirme que `MINIO_ENDPOINT` não tem `http://` ou `https://`
- Verifique se `MINIO_USE_SSL` é `true` ou `false` conforme seu setup
- Teste a porta (geralmente 443 para SSL, 9000 sem SSL)

### 4. Iniciar Aplicação

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 5. Testar Upload de Avatar

1. Abra http://localhost:3000
2. Faça login
3. Clique em "Settings" na sidebar
4. Na seção "Avatar", clique em "Upload Avatar"
5. Selecione uma imagem (JPG, PNG ou WebP, max 2MB)
6. Aguarde o upload
7. Verifique se o avatar aparece na sidebar

### 6. Verificar no MinIO

Acesse o console do MinIO (se disponível) e confirme:

- Bucket `prompt-zero` foi criado
- Pasta `avatars/` existe dentro do bucket
- Subpasta `avatars/{seu-user-id}/` contém a imagem
- Arquivo tem formato: `{timestamp}-{random}.{ext}`

## 🐛 Troubleshooting

### Erro: "Configuration key MINIO_ENDPOINT does not exist"
- **Solução:** Certifique-se que o arquivo `.env` está no diretório `backend/`
- Reinicie o servidor backend após adicionar as variáveis

### Erro: "Invalid useSSL flag type"
- **Solução:** `MINIO_USE_SSL` deve ser `true` ou `false` (sem aspas)
- Não use valores como `"true"` ou `1`

### Erro: "The request signature we calculated does not match"
- **Solução:** Verifique se `MINIO_ROOT_USER` e `MINIO_ROOT_PASSWORD` estão corretos
- Copie exatamente como aparecem no Railway (cuidado com espaços extras)

### Erro: "Connection timeout"
- **Solução:** Verifique se `MINIO_ENDPOINT` está acessível
- Teste ping/curl para o endpoint
- Confirme firewall/rede permite conexão

### Avatar não aparece após upload
- **Solução:** Verifique se `MINIO_PUBLIC_URL` está correto
- Confirme que o bucket tem política de leitura pública
- Teste a URL do avatar diretamente no navegador
- Verifique se `MINIO_USE_SSL` corresponde ao protocolo da URL

### Erro 413 (Payload Too Large)
- **Solução:** Imagem maior que 2MB
- Reduza o tamanho da imagem antes do upload

## 📊 Estrutura Esperada no MinIO

Após upload bem-sucedido, a estrutura deve ser:

```
prompt-zero/
└── avatars/
    └── 550e8400-e29b-41d4-a716-446655440000/  <- User ID
        └── 1711925095234-a3f2e9b8c1d4.jpg     <- Avatar file
```

## ✨ Próximos Passos

Após configurar e testar com sucesso:

1. [ ] Teste upload de diferentes tipos de imagem (JPG, PNG, WebP)
2. [ ] Teste atualizar avatar (fazer novo upload)
3. [ ] Teste remover avatar
4. [ ] Verifique se o avatar persiste após logout/login
5. [ ] Teste com múltiplos usuários
6. [ ] Configure backup do bucket (se necessário)
7. [ ] Configure CDN (opcional, para melhor performance)

## 📚 Documentação Completa

Consulte:
- `IMPLEMENTATION_SUMMARY.md` - Resumo completo da implementação
- `docs/MINIO_AVATAR_INTEGRATION.md` - Documentação técnica detalhada

## 💡 Dicas

- Use imagens quadradas para melhor resultado
- WebP tem melhor compressão que JPG/PNG
- Recomendado: mínimo 128x128px
- Máximo: 2MB por imagem
- O sistema remove automaticamente avatares antigos ao fazer upload de um novo

---

**Se tudo funcionar, você verá seu avatar na sidebar! 🎉**
