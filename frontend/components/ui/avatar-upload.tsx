"use client"

import { useRef, useState } from "react"
import { Upload, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { Button } from "./button"

export interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  userName?: string
  onUpload: (file: File) => Promise<void>
  onRemove: () => Promise<void>
  isUploading?: boolean
  isRemoving?: boolean
  maxSizeMB?: number
  acceptedFormats?: string[]
}

export function AvatarUpload({
  currentAvatarUrl,
  userName = "User",
  onUpload,
  onRemove,
  isUploading = false,
  isRemoving = false,
  maxSizeMB = 2,
  acceptedFormats = ["image/jpeg", "image/png", "image/webp"],
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)

    if (!acceptedFormats.includes(file.type)) {
      setError("Invalid file format. Please use JPG, PNG or WebP.")
      return
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      setError(`File too large. Maximum size is ${maxSizeMB}MB.`)
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)

    void onUpload(file).catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to upload avatar")
      setPreviewUrl(null)
    })
  }

  const handleRemove = async () => {
    setError(null)
    setPreviewUrl(null)
    try {
      await onRemove()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove avatar")
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const displayUrl = previewUrl || currentAvatarUrl
  const isLoading = isUploading || isRemoving
  const hasAvatar = Boolean(displayUrl)

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar size="lg" className="size-20">
            <AvatarImage src={displayUrl || undefined} alt={userName} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.join(",")}
            onChange={handleFileSelect}
            className="hidden"
            disabled={isLoading}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClick}
            disabled={isLoading}
            className="w-fit"
          >
            <Upload className="h-4 w-4" />
            {hasAvatar ? "Change Avatar" : "Upload Avatar"}
          </Button>

          {hasAvatar && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={isLoading}
              className="w-fit text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
              Remove Avatar
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Recommended: Square image, at least 128x128px. Max {maxSizeMB}MB. JPG, PNG or WebP.
      </p>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  )
}
