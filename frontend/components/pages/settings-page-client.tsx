"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { parseAsString, useQueryState } from "nuqs"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import type { ReactNode } from "react"
import { Bot, Brain, KeyRound, Orbit, Sparkles, Unplug } from "lucide-react"
import { z } from "zod/v4"
import { toast } from "sonner"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AvatarUpload } from "@/components/ui/avatar-upload"
import { bffFetch } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { ApiKeyStatus, ProviderCredential, UserProfile } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import { validationMessages } from "@/lib/zod-i18n"

function createProfileSchema(dict: Dictionary) {
  const m = validationMessages(dict)
  return z.object({
    name: z.string().min(2, { message: m.stringMin(2) }).max(100, { message: m.stringMax(100) }),
  })
}

type ProfileValues = z.infer<ReturnType<typeof createProfileSchema>>
type ApiKeyValues = {
  openaiApiKey?: string
  anthropicApiKey?: string
  googleApiKey?: string
  openrouterApiKey?: string
}
type ProviderKeyName = "openai" | "anthropic" | "google" | "openrouter"

export function SettingsPageClient({ dict }: { dict: Dictionary }) {
  const queryClient = useQueryClient()
  const profileSchema = useMemo(() => createProfileSchema(dict), [dict])
  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault("user"))
  const [disconnectingProvider, setDisconnectingProvider] = useState<ProviderKeyName | null>(null)
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<ProviderKeyName, string>>({
    openai: "",
    anthropic: "",
    google: "",
    openrouter: "",
  })

  const profileQuery = useQuery({
    queryKey: queryKeys.settings.profile,
    queryFn: () => bffFetch<UserProfile>("/auth/me"),
  })
  const apiKeysQuery = useQuery({
    queryKey: queryKeys.settings.apiKeys,
    queryFn: () => bffFetch<ApiKeyStatus>("/users/api-keys"),
  })
  const providerCredentialsStatusQuery = useQuery({
    queryKey: queryKeys.settings.providerCredentials,
    queryFn: () => bffFetch<ProviderCredential[]>("/users/provider-credentials"),
  })

  const profileForm = useForm<ProfileValues>({
    values: { name: profileQuery.data?.name ?? "" },
  })
  const updateProfile = useMutation({
    mutationFn: (values: ProfileValues) =>
      bffFetch<UserProfile>("/users/profile", { method: "PATCH", body: values }),
    onSuccess: (updatedProfile) => {
      toast.success(dict.settings.profileCard.toastUpdated)
      queryClient.setQueryData(queryKeys.settings.profile, updatedProfile)
      queryClient.setQueryData(queryKeys.auth.me, updatedProfile)
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.profile })
    },
  })

  const avatarI18n = dict.settings.profileCard.avatar

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("avatar", file)
      
      const response = await fetch("/api/avatar", {
        method: "POST",
        body: formData,
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(avatarI18n.notAuthenticated)
        }
        let message = avatarI18n.uploadFailed
        try {
          const error = (await response.json()) as { message?: string }
          if (error?.message) {
            message = error.message
          }
        } catch {
          /* use default message */
        }
        throw new Error(message)
      }
      return response.json() as Promise<UserProfile>
    },
    onSuccess: (updatedProfile) => {
      toast.success(avatarI18n.updated)
      queryClient.setQueryData(queryKeys.settings.profile, updatedProfile)
      queryClient.setQueryData(queryKeys.auth.me, updatedProfile)
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.profile })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : avatarI18n.uploadFailed)
    },
  })

  const removeAvatar = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/avatar", { method: "DELETE" })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || avatarI18n.removeFailed)
      }
      if (response.status === 204) {
        return null
      }
      return response.json() as Promise<UserProfile>
    },
    onSuccess: (updatedProfile) => {
      toast.success(avatarI18n.removed)
      queryClient.setQueryData(queryKeys.settings.profile, updatedProfile)
      queryClient.setQueryData(queryKeys.auth.me, updatedProfile)
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.profile })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : avatarI18n.removeFailed)
    },
  })

  const updateApiKeys = useMutation({
    mutationFn: (values: ApiKeyValues) =>
      bffFetch<ApiKeyStatus>("/users/api-keys", {
        method: "PUT",
        body: Object.fromEntries(
          Object.entries(values).filter(([, value]) => typeof value === "string" && value.trim().length > 0),
        ),
      }),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.apiKeys }),
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.providerCredentials }),
      ])
    },
  })

  const providersStatus = useMemo(
    () => ({
      openai:
        Boolean(apiKeysQuery.data?.openaiConfigured) ||
        Boolean(providerCredentialsStatusQuery.data?.some((item) => item.provider === "openai")),
      anthropic:
        Boolean(apiKeysQuery.data?.anthropicConfigured) ||
        Boolean(providerCredentialsStatusQuery.data?.some((item) => item.provider === "anthropic")),
      google: Boolean(providerCredentialsStatusQuery.data?.some((item) => item.provider === "google")),
      openrouter: Boolean(providerCredentialsStatusQuery.data?.some((item) => item.provider === "openrouter")),
    }),
    [apiKeysQuery.data, providerCredentialsStatusQuery.data],
  )
  const providerCredentialIdsByProvider = useMemo(
    () => ({
      openai:
        providerCredentialsStatusQuery.data
          ?.filter((item) => item.provider === "openai")
          .map((item) => item.id) ?? [],
      anthropic:
        providerCredentialsStatusQuery.data
          ?.filter((item) => item.provider === "anthropic")
          .map((item) => item.id) ?? [],
      google:
        providerCredentialsStatusQuery.data
          ?.filter((item) => item.provider === "google")
          .map((item) => item.id) ?? [],
      openrouter:
        providerCredentialsStatusQuery.data
          ?.filter((item) => item.provider === "openrouter")
          .map((item) => item.id) ?? [],
    }),
    [providerCredentialsStatusQuery.data],
  )

  async function connectProvider(provider: ProviderKeyName) {
    const value = apiKeyInputs[provider]?.trim()
    if (!value) {
      toast.error(dict.settings.apiKeysCard.pasteBeforeSave)
      return
    }
    if (value.length < 10) {
      toast.error(dict.settings.apiKeysCard.invalidMinChars)
      return
    }

    const payloadByProvider: Record<ProviderKeyName, ApiKeyValues> = {
      openai: { openaiApiKey: value },
      anthropic: { anthropicApiKey: value },
      google: { googleApiKey: value },
      openrouter: { openrouterApiKey: value },
    }

    try {
      const status = await updateApiKeys.mutateAsync(payloadByProvider[provider])
      const connected =
        provider === "openai"
          ? Boolean(status.openaiConfigured) || status.providers.some((item) => item.provider === "openai")
          : provider === "anthropic"
            ? Boolean(status.anthropicConfigured) || status.providers.some((item) => item.provider === "anthropic")
            : status.providers.some((item) => item.provider === provider)

      if (connected) {
        toast.success(dict.settings.apiKeysCard.connectedSuccess)
        setApiKeyInputs((current) => ({ ...current, [provider]: "" }))
      } else {
        toast.error(dict.settings.apiKeysCard.sentButNotConfirmed)
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
        return
      }
      toast.error(dict.settings.apiKeysCard.saveFailed)
    }
  }

  async function disconnectProvider(provider: ProviderKeyName) {
    const credentialIds = providerCredentialIdsByProvider[provider]
    if (!credentialIds.length) {
      toast.error(dict.settings.apiKeysCard.disconnectNoCredentials)
      return
    }

    setDisconnectingProvider(provider)
    try {
      await Promise.all(
        credentialIds.map((id) =>
          bffFetch<{ deleted: boolean }>(`/users/provider-credentials/${id}`, {
            method: "DELETE",
          }),
        ),
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.apiKeys }),
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.providerCredentials }),
      ])
      toast.success(dict.settings.apiKeysCard.disconnectedSuccess)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(dict.settings.apiKeysCard.disconnectFailed)
      }
    } finally {
      setDisconnectingProvider(null)
    }
  }

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Tabs
        value={tab === "api-keys" ? "api-keys" : "user"}
        onValueChange={(nextTab) => setTab(nextTab)}
        className="gap-4"
      >
        <TabsList className="bg-muted">
          <TabsTrigger value="user" className="cursor-pointer">
            {dict.settings.tabs.user}
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="cursor-pointer">
            {dict.settings.tabs.apiKeys}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="user">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{dict.settings.profileCard.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div>
                  <h3 className="mb-3 text-sm font-medium">{dict.settings.profileCard.avatarSectionTitle}</h3>
                  <AvatarUpload
                    currentAvatarUrl={profileQuery.data?.avatarUrl}
                    userName={profileQuery.data?.name}
                    defaultUserName={dict.common.userDefaultName}
                    labels={{
                      invalidFormat: avatarI18n.invalidFormat,
                      tooLarge: avatarI18n.tooLarge,
                      uploadFailed: avatarI18n.uploadFailed,
                      removeFailed: avatarI18n.removeFailed,
                      change: avatarI18n.change,
                      upload: avatarI18n.upload,
                      remove: avatarI18n.remove,
                      recommended: avatarI18n.recommended,
                    }}
                    onUpload={async (file) => {
                      await uploadAvatar.mutateAsync(file)
                    }}
                    onRemove={async () => {
                      await removeAvatar.mutateAsync()
                    }}
                    isUploading={uploadAvatar.isPending}
                    isRemoving={removeAvatar.isPending}
                  />
                </div>

                <div className="border-t pt-6">
                  <h3 className="mb-3 text-sm font-medium">{dict.settings.profileCard.profileInfoSectionTitle}</h3>
                  {profileQuery.isPending ? (
                    <p className="text-sm text-muted-foreground">{dict.settings.profileCard.loading}</p>
                  ) : null}
                  {profileQuery.isError ? (
                    <p className="text-sm text-destructive">{dict.settings.profileCard.loadError}</p>
                  ) : null}
                  <form
                    onSubmit={profileForm.handleSubmit((values) => {
                      const parsed = profileSchema.safeParse(values)
                      if (!parsed.success) {
                        parsed.error.issues.forEach((issue) => {
                          if (issue.path[0] === "name") {
                            profileForm.setError("name", { message: issue.message })
                          }
                        })
                        return
                      }
                      updateProfile.mutate(parsed.data)
                    })}
                    className="grid gap-4"
                  >
                    <div className="grid gap-2">
                      <Label htmlFor="profile-name">{dict.settings.profileCard.nameLabel}</Label>
                      <Input
                        id="profile-name"
                        {...profileForm.register("name")}
                        aria-invalid={Boolean(profileForm.formState.errors.name)}
                      />
                      {profileForm.formState.errors.name ? (
                        <p className="text-sm text-destructive">{profileForm.formState.errors.name.message}</p>
                      ) : null}
                    </div>
                    <Button className="w-fit cursor-pointer" type="submit">
                      {updateProfile.isPending ? dict.settings.profileCard.saving : dict.settings.profileCard.save}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api-keys">
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ProviderStatusCard
                dict={dict}
                name="OpenAI"
                status={providersStatus.openai}
                logoSrcCandidates={[
                  "/provedores-ia/logo-openai.png",
                  "/provedores-ia/logo-openai.svg",
                  "/provedores-ia/openai.png",
                  "/provedores-ia/openai.svg",
                  "/provedores-ia/openai.webp",
                  "/provedores-ia/openai.jpg",
                  "/provedores-ia/openai.jpeg",
                  "/provedores-ia/openai.avif",
                  "/provedores-ia/OpenAI.png",
                  "/provedores-ia/OpenAI.svg",
                  "/provedores-ia/OpenAI.webp",
                ]}
                icon={<Sparkles className="h-4 w-4" />}
                inputValue={apiKeyInputs.openai}
                onInputChange={(value) =>
                  setApiKeyInputs((current) => ({ ...current, openai: value }))
                }
                onSave={() => connectProvider("openai")}
                isSaving={updateApiKeys.isPending}
                onDisconnect={() => disconnectProvider("openai")}
                isDisconnecting={disconnectingProvider === "openai"}
              />
              <ProviderStatusCard
                dict={dict}
                name="Anthropic"
                status={providersStatus.anthropic}
                logoSrcCandidates={[
                  "/provedores-ia/anthropic.png",
                  "/provedores-ia/anthropic.svg",
                  "/provedores-ia/anthropic.webp",
                  "/provedores-ia/anthropic.jpg",
                  "/provedores-ia/anthropic.jpeg",
                  "/provedores-ia/anthropic.avif",
                  "/provedores-ia/logo-anthropic.png",
                  "/provedores-ia/logo-anthropic.svg",
                  "/provedores-ia/Anthropic.png",
                  "/provedores-ia/Anthropic.svg",
                  "/provedores-ia/Anthropic.webp",
                ]}
                icon={<Brain className="h-4 w-4" />}
                inputValue={apiKeyInputs.anthropic}
                onInputChange={(value) =>
                  setApiKeyInputs((current) => ({ ...current, anthropic: value }))
                }
                onSave={() => connectProvider("anthropic")}
                isSaving={updateApiKeys.isPending}
                onDisconnect={() => disconnectProvider("anthropic")}
                isDisconnecting={disconnectingProvider === "anthropic"}
              />
              <ProviderStatusCard
                dict={dict}
                name="Google"
                status={providersStatus.google}
                logoSrcCandidates={[
                  "/provedores-ia/logo-google.png",
                  "/provedores-ia/logo-google.svg",
                  "/provedores-ia/google.png",
                  "/provedores-ia/google.svg",
                  "/provedores-ia/google.webp",
                  "/provedores-ia/google.jpg",
                  "/provedores-ia/google.jpeg",
                  "/provedores-ia/google.avif",
                  "/provedores-ia/Google.png",
                  "/provedores-ia/Google.svg",
                  "/provedores-ia/Google.webp",
                ]}
                icon={<Bot className="h-4 w-4" />}
                inputValue={apiKeyInputs.google}
                onInputChange={(value) =>
                  setApiKeyInputs((current) => ({ ...current, google: value }))
                }
                onSave={() => connectProvider("google")}
                isSaving={updateApiKeys.isPending}
                onDisconnect={() => disconnectProvider("google")}
                isDisconnecting={disconnectingProvider === "google"}
              />
              <ProviderStatusCard
                dict={dict}
                name="OpenRouter"
                status={providersStatus.openrouter}
                logoSrcCandidates={[
                  "/provedores-ia/openrouter.png",
                  "/provedores-ia/openrouter.svg",
                  "/provedores-ia/openrouter.webp",
                  "/provedores-ia/openrouter.jpg",
                  "/provedores-ia/openrouter.jpeg",
                  "/provedores-ia/openrouter.avif",
                  "/provedores-ia/logo-openrouter.png",
                  "/provedores-ia/logo-openrouter.svg",
                  "/provedores-ia/OpenRouter.png",
                  "/provedores-ia/OpenRouter.svg",
                  "/provedores-ia/OpenRouter.webp",
                ]}
                icon={<Orbit className="h-4 w-4" />}
                inputValue={apiKeyInputs.openrouter}
                onInputChange={(value) =>
                  setApiKeyInputs((current) => ({ ...current, openrouter: value }))
                }
                onSave={() => connectProvider("openrouter")}
                isSaving={updateApiKeys.isPending}
                onDisconnect={() => disconnectProvider("openrouter")}
                isDisconnecting={disconnectingProvider === "openrouter"}
              />
            </div>
            {apiKeysQuery.isError ? (
              <p className="text-sm text-destructive">{dict.settings.apiKeysCard.loadError}</p>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ProviderStatusCard({
  dict,
  name,
  status,
  logoSrcCandidates,
  icon,
  inputValue,
  onInputChange,
  onSave,
  isSaving,
  onDisconnect,
  isDisconnecting,
}: {
  dict: Dictionary
  name: string
  status: boolean
  logoSrcCandidates: string[]
  icon: ReactNode
  inputValue: string
  onInputChange: (value: string) => void
  onSave: () => void
  isSaving: boolean
  onDisconnect: () => void
  isDisconnecting: boolean
}) {
  const [logoIndex, setLogoIndex] = useState(0)
  const logoSrc = logoSrcCandidates[logoIndex]
  const logoFailed = logoIndex >= logoSrcCandidates.length || !logoSrc
  const forceWhiteLogoOnDark = name === "Anthropic" || name === "OpenRouter"

  return (
    <Card className="border-border/70">
      <CardContent className="grid gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-muted">
              {logoFailed ? (
                icon
              ) : (
                <Image
                  src={logoSrc}
                  alt=""
                  width={20}
                  height={20}
                  aria-hidden
                  className={`h-5 w-5 object-contain ${forceWhiteLogoOnDark ? "dark:brightness-0 dark:invert" : ""}`}
                  onError={() => {
                    setLogoIndex((current) => {
                      const next = current + 1
                      return next <= logoSrcCandidates.length ? next : current
                    })
                  }}
                />
              )}
            </span>
            <div>
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">
                {status ? dict.settings.apiKeysCard.providerStatus.connected : dict.settings.apiKeysCard.providerStatus.notConfigured}
              </p>
            </div>
          </div>
          <span
            className={
              status
                ? "rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400"
                : "rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400"
            }
          >
            {status ? dict.settings.apiKeysCard.providerStatus.ok : dict.settings.apiKeysCard.providerStatus.pending}
          </span>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`provider-key-${name}`}>{dict.settings.apiKeysCard.apiKeyLabel}</Label>
          <Input
            id={`provider-key-${name}`}
            type="password"
            placeholder={dict.settings.apiKeysCard.apiKeyPlaceholder}
            value={inputValue}
            onChange={(event) => onInputChange(event.target.value)}
          />
        </div>
        <div className={status ? "flex items-center gap-2" : "grid gap-2"}>
          <Button
            type="button"
            className={status ? "flex-1 cursor-pointer" : "cursor-pointer"}
            onClick={onSave}
            disabled={isSaving || isDisconnecting}
          >
            <KeyRound className="h-4 w-4" />
            {isSaving
              ? dict.settings.apiKeysCard.connecting
              : status
                ? dict.settings.apiKeysCard.updateKey
                : dict.settings.apiKeysCard.connect}
          </Button>
          {status ? (
            <Button
              type="button"
              variant="outline"
              className="flex-1 cursor-pointer"
              onClick={onDisconnect}
              disabled={isSaving || isDisconnecting}
            >
              <Unplug className="h-4 w-4" />
              {isDisconnecting ? dict.settings.apiKeysCard.disconnecting : dict.settings.apiKeysCard.disconnect}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
