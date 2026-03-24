"use client"

import * as React from "react"
import {
  LayoutDashboard,
  PiggyBankIcon,
  RefreshCcw,
  Wallet2,
} from "lucide-react"

import { NavPrincipal } from "@/components/nav-principal"
import { NavSettings } from "@/components/nav-settings"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  principals: [
    {
      name: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Bancos",
      url: "/banks",
      icon: Wallet2,
    },
    {
      name: "Assinaturas",
      url: "/subscriptions",
      icon: RefreshCcw,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavPrincipal principals={data.principals} />
      </SidebarContent>
      <SidebarFooter>
        {/* <NavSettings /> */}
        <div className="px-3 pb-1 group-data-[collapsible=icon]:hidden">
          <span className="text-xs text-muted-foreground/60 select-none">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </span>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
