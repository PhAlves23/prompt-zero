# Integração MinIO - Upload de Avatar

## Visão Geral

Esta integração permite que usuários façam upload, atualizem e removam seus avatares usando MinIO como storage.

## Estrutura de Pastas no Bucket

O bucket `prompt-zero` contém a seguinte estrutura:

```
prompt-zero/
└── avatars/
    └── {userId}/
        └── {timestamp}-{random}.{ext}
```

- **Bucket**: `prompt-zero`
- **Pasta**: `avatars/`
- **Subpasta por usuário**: `avatars/{userId}/`
- **Nomenclatura de arquivos**: `{timestamp}-{random}.{ext}`

## Variáveis de Ambiente

### Backend (.env)

```bash
# MinIO Configuration
MINIO_ENDPOINT=bucket-production-26cf.up.railway.app
MINIO_PORT=9000
MINIO_ROOT_USER=seu_access_key
MINIO_ROOT_PASSWORD=seu_secret_key
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=prompt-zero
MINIO_PUBLIC_URL=bucket-production-26cf.up.railway.app
```

**Observações:**
- `MINIO_ENDPOINT`: URL do MinIO (sem protocolo http/https)
- `MINIO_PUBLIC_URL`: URL pública para gerar links de acesso
- O bucket será criado automaticamente na inicialização se não existir
- A política de leitura pública é aplicada apenas na pasta `avatars/*`

## Backend

### Módulos Criados

#### 1. MinioService (`src/minio/minio.service.ts`)

Serviço principal para interação com MinIO:

**Métodos:**
- `uploadAvatar(file: Buffer, userId: string, originalName: string)`: Faz upload do avatar
- `deleteAvatar(fileName: string)`: Remove um avatar específico
- `getPublicUrl(fileName: string)`: Gera URL pública para acesso
- `listUserAvatars(userId: string)`: Lista todos avatares de um usuário
- `deleteOldAvatars(userId: string, keepFileName?: string)`: Remove avatares antigos

**Características:**
- Cria o bucket automaticamente se não existir
- Configura política de leitura pública para `avatars/*`
- Gera nomes únicos para arquivos
- Suporta JPG, PNG, GIF e WebP

#### 2. SettingsController (`src/settings/settings.controller.ts`)

Novos endpoints:

```typescript
POST /users/avatar
- Body: multipart/form-data com campo 'avatar'
- Validação: tipo (jpg/jpeg/png/webp) e tamanho (max 2MB)
- Response: UserProfile com avatarUrl atualizado

DELETE /users/avatar
- Remove o avatar do usuário
- Response: UserProfile com avatarUrl = null
```

#### 3. SettingsService (`src/settings/settings.service.ts`)

Novos métodos:

```typescript
uploadAvatar(userId: string, file: Express.Multer.File): Promise<UserProfile>
- Deleta avatar anterior (se existir)
- Faz upload do novo avatar
- Remove avatares antigos do usuário
- Atualiza avatarUrl no banco

removeAvatar(userId: string): Promise<UserProfile>
- Remove avatar do MinIO
- Limpa avatarUrl no banco
```

### Banco de Dados

Migration criada: `add_user_avatar_url`

```prisma
model User {
  // ... campos existentes
  avatarUrl String?
  // ...
}
```

## Frontend

### Componente AvatarUpload (`components/ui/avatar-upload.tsx`)

Componente reutilizável para upload de avatar:

**Props:**
```typescript
{
  currentAvatarUrl?: string | null
  userName?: string
  onUpload: (file: File) => Promise<void>
  onRemove: () => Promise<void>
  isUploading?: boolean
  isRemoving?: boolean
  maxSizeMB?: number
  acceptedFormats?: string[]
}
```

**Recursos:**
- Preview em tempo real
- Validação de tipo e tamanho
- Estados de loading
- Exibição de erros
- Fallback com iniciais do usuário

### Integração na Página Settings

A página de configurações (`components/pages/settings-page-client.tsx`) foi atualizada:

1. **Mutations adicionadas:**
   - `uploadAvatar`: Upload com FormData
   - `removeAvatar`: Remoção do avatar

2. **UI:**
   - Seção "Avatar" acima de "Profile Information"
   - Integração com `AvatarUpload`
   - Invalidação automática de cache após upload/remoção

### Exibição do Avatar

O avatar é exibido em:

1. **Sidebar** (`components/nav-user.tsx`):
   - Menu dropdown do usuário
   - Avatar principal e no dropdown

2. **App Sidebar** (`components/app-sidebar.tsx`):
   - Busca avatarUrl do perfil do usuário
   - Passa para NavUser

**Fallback:**
- Quando não há avatar, mostra iniciais do nome (ex: "Pedro Alves" → "PA")
- Avatar component do Radix UI gerencia fallback automaticamente

## Fluxo de Upload

```
1. Usuário seleciona imagem
   ↓
2. Frontend valida tipo e tamanho
   ↓
3. POST /users/avatar (FormData)
   ↓
4. Backend valida novamente
   ↓
5. MinIO: Upload para avatars/{userId}/
   ↓
6. MinIO: Retorna URL pública
   ↓
7. DB: Atualiza User.avatarUrl
   ↓
8. MinIO: Remove avatares antigos
   ↓
9. Backend: Retorna UserProfile atualizado
   ↓
10. Frontend: Atualiza cache e UI
```

## Segurança

### Backend
- Validação de tipo de arquivo (FileTypeValidator)
- Validação de tamanho máximo (MaxSizeValidator)
- Autenticação JWT obrigatória
- Apenas o próprio usuário pode modificar seu avatar

### MinIO
- Política de leitura pública apenas para `avatars/*`
- Write/Delete requer credenciais
- Bucket isolado por aplicação

### Frontend
- Validação de tipo e tamanho no cliente
- Preview seguro com FileReader
- Tratamento de erros
- Estados de loading para evitar múltiplos uploads

## Validações

### Tipos Aceitos
- `image/jpeg` (.jpg, .jpeg)
- `image/png` (.png)
- `image/webp` (.webp)

### Tamanho Máximo
- 2MB por arquivo

### Recomendações
- Imagem quadrada
- Mínimo 128x128px
- Formato WebP para melhor compressão

## Testes

### Backend
Para testar localmente:

```bash
cd backend

# Certifique-se que as variáveis MinIO estão no .env
# Execute o backend
npm run start:dev
```

### Frontend
Para testar localmente:

```bash
cd frontend

# Execute o frontend
npm run dev
```

### Testes Manuais
1. Login na aplicação
2. Navegue para Settings
3. Faça upload de uma imagem
4. Verifique se aparece na sidebar
5. Atualize a página e verifique persistência
6. Remova o avatar
7. Verifique se mostra fallback com iniciais

## Troubleshooting

### Avatar não aparece após upload
- Verifique se `MINIO_PUBLIC_URL` está correto
- Confirme que a política do bucket permite leitura pública em `avatars/*`
- Verifique logs do backend para erros de upload

### Erro ao fazer upload
- Confirme que `MINIO_ENDPOINT`, `MINIO_ROOT_USER` e `MINIO_ROOT_PASSWORD` estão corretos
- Verifique se o bucket existe ou se o serviço tem permissão para criá-lo
- Confirme que a porta está acessível

### Avatar mostra URL mas não carrega
- Verifique se `MINIO_USE_SSL` está correto (true para HTTPS, false para HTTP)
- Confirme que `MINIO_PUBLIC_URL` está acessível publicamente
- Teste a URL do avatar diretamente no navegador

## Melhorias Futuras

- [ ] Crop/resize de imagem no cliente
- [ ] Geração de thumbnails (múltiplos tamanhos)
- [ ] Suporte a GIF animado
- [ ] Integração com Gravatar como fallback
- [ ] Histórico de avatares
- [ ] Drag-and-drop para upload
- [ ] Processamento de imagem com Sharp (otimização, resize)
- [ ] CDN para cache de avatares
- [ ] Webhook para limpeza de avatares órfãos

## Dependências

### Backend
- `minio`: Client SDK para MinIO
- `@types/multer`: Tipos TypeScript para Multer

### Frontend
- Nenhuma dependência adicional (usa componentes existentes)
