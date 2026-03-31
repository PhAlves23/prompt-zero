"use client"

import {
  SidebarGroupAction,
} from "@/components/ui/sidebar"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignCircleIcon } from "@hugeicons/core-free-icons"
import Link from "next/link"

export function NavDocuments({
  title = "Documents",
  actionHref,
  actionTitle,
  actionSrLabel,
  items,
}: {
  title?: string
  actionHref?: string
  actionTitle: string
  actionSrLabel: string
  items: {
    name: string
    url: string
    icon?: React.ReactNode
  }[]
}) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      {actionHref ? (
        <SidebarGroupAction title={actionTitle} asChild>
          <Link href={actionHref} className="cursor-pointer">
            <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} />
            <span className="sr-only">{actionSrLabel}</span>
          </Link>
        </SidebarGroupAction>
      ) : null}
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <Link href={item.url} className="cursor-pointer">
                {item.icon ?? null}
                <span>{item.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
