import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import type { SessionUser } from "@/lib/api/types"

type AppShellProps = {
  title: string
  lang: string
  user: SessionUser | null
  dict: Dictionary
  children: React.ReactNode
}

export function AppShell({ title, lang, user, dict, children }: AppShellProps) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" lang={lang} user={user} dict={dict} />
      <SidebarInset>
        <SiteHeader title={title} dict={dict} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">{children}</div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
