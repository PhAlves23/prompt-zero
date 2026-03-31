"use client"

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignCircleIcon } from "@hugeicons/core-free-icons"
import { Store } from "lucide-react"
import Link from "next/link"

export function NavMain({
  items,
  quickCreateLabel,
  quickCreateTooltip,
  marketplaceSrLabel,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
  }[]
  quickCreateLabel: string
  quickCreateTooltip: string
  marketplaceSrLabel: string
}) {
  const promptsUrl = items.find((item) => item.url.endsWith("/prompts"))?.url
  const quickCreateUrl = promptsUrl ? `${promptsUrl}/new` : "#"
  const exploreUrl = items.find((item) => item.url.endsWith("/explore"))?.url ?? "#"

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              asChild
              tooltip={quickCreateTooltip}
              className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
            >
              <Link href={quickCreateUrl} className="cursor-pointer">
                <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} />
                <span>{quickCreateLabel}</span>
              </Link>
            </SidebarMenuButton>
            <Button
              asChild
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
            >
              <Link href={exploreUrl} className="cursor-pointer">
                <Store className="h-4 w-4" />
                <span className="sr-only">{marketplaceSrLabel}</span>
              </Link>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton tooltip={item.title} asChild>
                <Link href={item.url} className="cursor-pointer">
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
