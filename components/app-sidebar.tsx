"use client"

import * as React from "react"
import {
  LayoutDashboard,
  PiggyBankIcon,
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
  teams: [
    {
      name: "Finapp",
      logo: PiggyBankIcon,
      plan: "Sua carteira",
    },
  ],
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
    }
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavPrincipal principals={data.principals} />
      </SidebarContent>
      <SidebarFooter>
        <NavSettings />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
