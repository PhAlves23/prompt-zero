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
import { DashboardSquare01Icon, Menu01Icon, Folder01Icon, UserGroupIcon, Settings05Icon, HelpCircleIcon, SearchIcon, Database01Icon, Compass01Icon, File01Icon } from "@hugeicons/core-free-icons"
import { bffFetch } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { PaginatedResult, Prompt, SessionUser, UserProfile } from "@/lib/api/types"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  lang: string
  user: SessionUser | null
}

function getSidebarI18n(lang: string) {
  if (lang === "en-US") {
    return {
      guestName: "Guest",
      nav: {
        dashboard: "Dashboard",
        prompts: "Prompts",
        workspaces: "Workspaces",
        tags: "Tags",
        explore: "Explore",
        experiments: "A/B experiments",
        settings: "Settings",
        apiKeys: "API keys",
        getHelp: "Get help",
        search: "Search",
      },
      docs: {
        recent: "Recent",
        noRecentPrompt: "No recent prompt",
        newPrompt: "New prompt",
      },
      quickCreate: "Quick create",
      promptMarketplace: "Prompt marketplace",
      userMenu: {
        account: "Account",
        billing: "Billing",
        notifications: "Notifications",
        logout: "Log out",
      },
    }
  }
  if (lang === "es-ES") {
    return {
      guestName: "Invitado",
      nav: {
        dashboard: "Panel",
        prompts: "Prompts",
        workspaces: "Espacios de trabajo",
        tags: "Tags",
        explore: "Explorar",
        experiments: "Experimentos A/B",
        settings: "Configuración",
        apiKeys: "Claves de API",
        getHelp: "Obtener ayuda",
        search: "Buscar",
      },
      docs: {
        recent: "Recientes",
        noRecentPrompt: "Ningún prompt reciente",
        newPrompt: "Nuevo prompt",
      },
      quickCreate: "Creación rápida",
      promptMarketplace: "Marketplace de prompts",
      userMenu: {
        account: "Cuenta",
        billing: "Facturación",
        notifications: "Notificaciones",
        logout: "Cerrar sesión",
      },
    }
  }
  return {
    guestName: "Convidado",
    nav: {
      dashboard: "Dashboard",
      prompts: "Prompts",
      workspaces: "Workspaces",
      tags: "Tags",
      explore: "Explorar",
      experiments: "Experimentos A/B",
      settings: "Configurações",
      apiKeys: "Chaves de API",
      getHelp: "Ajuda",
      search: "Buscar",
    },
    docs: {
      recent: "Recentes",
      noRecentPrompt: "Nenhum prompt recente",
      newPrompt: "Novo prompt",
    },
    quickCreate: "Criação rápida",
    promptMarketplace: "Marketplace de prompts",
    userMenu: {
      account: "Conta",
      billing: "Faturamento",
      notifications: "Notificações",
      logout: "Sair",
    },
  }
}

const buildSidebarData = (lang: string, user: SessionUser | null) => ({
  user: {
    name: user?.name ?? "Guest",
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
      title: "Get Help",
      url: `/${lang}`,
      icon: (
        <HugeiconsIcon icon={HelpCircleIcon} strokeWidth={2} />
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

export function AppSidebar({ lang, user, ...props }: AppSidebarProps) {
  const t = getSidebarI18n(lang)
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
  const data = buildSidebarData(lang, sidebarUser)
  data.user.name = data.user.name === "Guest" ? t.guestName : data.user.name
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
    { ...data.navSecondary[2], title: t.nav.getHelp },
    { ...data.navSecondary[3], title: t.nav.search },
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
