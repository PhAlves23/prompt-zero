"use server"

import { revalidatePath } from "next/cache"
import { apiServices } from "@/lib/api/services"

export async function createPromptAction(input: {
  title: string
  description?: string
  content: string
  isPublic?: boolean
}) {
  const prompt = await apiServices.prompts.create(input)
  revalidatePath("/")
  return prompt
}

export async function deletePromptAction(id: string) {
  await apiServices.prompts.remove(id)
  revalidatePath("/")
}
