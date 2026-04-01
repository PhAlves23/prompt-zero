"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { BrandMark } from "@/components/brand-mark"
import { HugeiconsIcon } from "@hugeicons/react"
import { DashboardSquare01Icon, Menu01Icon, Folder01Icon, UserGroupIcon, Settings05Icon, SearchIcon, Database01Icon, Compass01Icon, File01Icon } from "@hugeicons/core-free-icons"
import { bffFetch } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { PaginatedResult, Prompt, SessionUser, UserProfile } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  lang: string
  user: SessionUser | null
  dict: Dictionary
}

const buildSidebarData = (lang: string, user: SessionUser | null, guestFallback: string) => ({
  user: {
    name: user?.name ?? guestFallback,
    email: user?.email ?? "guest@promptzero.app",
    avatar: "",
  },
  navMain: [
    {
      title: "Dashboard",
      url: `/${lang}/dashboard`,
      icon: (
        <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} />
      ),
    },
    {
      title: "Prompts",
      url: `/${lang}/prompts`,
      icon: (
        <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} />
      ),
    },
    {
      title: "Workspaces",
      url: `/${lang}/workspaces`,
      icon: (
        <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
      ),
    },
    {
      title: "Tags",
      url: `/${lang}/tags`,
      icon: (
        <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
      ),
    },
    {
      title: "Explore",
      url: `/${lang}/explore`,
      icon: (
        <HugeiconsIcon icon={Compass01Icon} strokeWidth={2} />
      ),
    },
    {
      title: "Experimentos A/B",
      url: `/${lang}/experiments`,
      icon: (
        <HugeiconsIcon icon={Database01Icon} strokeWidth={2} />
      ),
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: `/${lang}/settings`,
      icon: (
        <HugeiconsIcon icon={Settings05Icon} strokeWidth={2} />
      ),
    },
    {
      title: "API Keys",
      url: `/${lang}/settings?tab=api-keys`,
      icon: (
        <HugeiconsIcon icon={File01Icon} strokeWidth={2} />
      ),
    },
    {
      title: "Search",
      url: `/${lang}/explore`,
      icon: (
        <HugeiconsIcon icon={SearchIcon} strokeWidth={2} />
      ),
    },
  ],
})

export function AppSidebar({ lang, user, dict, ...props }: AppSidebarProps) {
  const t = dict.sidebar
  const profileQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => bffFetch<UserProfile>("/auth/me"),
  })
  const sidebarUser: SessionUser | null = profileQuery.data
    ? { name: profileQuery.data.name, email: profileQuery.data.email }
    : user
  const recentPromptsQuery = useQuery({
    queryKey: queryKeys.prompts.list("sidebar-recent"),
    queryFn: () => bffFetch<PaginatedResult<Prompt>>("/prompts?page=1&limit=5"),
  })
  const guestFallback = dict.common.guestUserFallback
  const data = buildSidebarData(lang, sidebarUser, guestFallback)
  data.user.name = data.user.name === guestFallback ? t.guestName : data.user.name
  data.user.avatar = profileQuery.data?.avatarUrl || ""
  data.navMain = [
    { ...data.navMain[0], title: t.nav.dashboard },
    { ...data.navMain[1], title: t.nav.prompts },
    { ...data.navMain[2], title: t.nav.workspaces },
    { ...data.navMain[3], title: t.nav.tags },
    { ...data.navMain[4], title: t.nav.explore },
    { ...data.navMain[5], title: t.nav.experiments },
  ]
  data.navSecondary = [
    { ...data.navSecondary[0], title: t.nav.settings },
    { ...data.navSecondary[1], title: t.nav.apiKeys },
    { ...data.navSecondary[2], title: t.nav.search },
  ]
  const recentPrompts = recentPromptsQuery.data?.data ?? []
  const documentItems =
    recentPrompts.length > 0
      ? recentPrompts.map((prompt) => ({
          name: prompt.title,
          url: `/${lang}/prompts/${prompt.id}`,
          icon: <HugeiconsIcon icon={File01Icon} strokeWidth={2} />,
        }))
      : [
          {
            name: t.docs.noRecentPrompt,
            url: `/${lang}/prompts`,
            icon: <HugeiconsIcon icon={Database01Icon} strokeWidth={2} />,
          },
        ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[slot=sidebar-menu-button]:px-2 data-[slot=sidebar-menu-button]:py-1.5!"
            >
              <Link href={`/${lang}/dashboard`} className="flex items-center gap-2">
                <BrandMark className="[&_svg]:h-8 [&_svg]:w-8" />
                <span className="font-heading text-xl font-bold tracking-tight leading-none text-zinc-800 dark:text-foreground">
                  prompt<span className="text-black dark:text-[#BFFF0A]">zero</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={data.navMain}
          quickCreateLabel={t.quickCreate}
          quickCreateTooltip={t.quickCreate}
          marketplaceSrLabel={t.promptMarketplace}
        />
        <NavDocuments
          title={t.docs.recent}
          actionHref={`/${lang}/prompts/new`}
          actionTitle={t.docs.newPrompt}
          actionSrLabel={t.docs.newPrompt}
          items={documentItems}
        />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} lang={lang} labels={t.userMenu} />
      </SidebarFooter>
    </Sidebar>
  )
}
