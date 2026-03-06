"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import * as SheetPrimitive from "@radix-ui/react-dialog"

import { cn } from "@/lib/utils"

const Sheet = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Root>, React.ComponentProps<typeof SheetPrimitive.Root>>(({ ...props }, ref) => {
  const RootComp: any = SheetPrimitive.Root

  return <RootComp ref={ref as any} data-slot="sheet" {...props} />
})

Sheet.displayName = "Sheet"

const SheetTrigger = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Trigger>, React.ComponentProps<typeof SheetPrimitive.Trigger>>(({ ...props }, ref) => {
  const TriggerComp: any = SheetPrimitive.Trigger

  return <TriggerComp ref={ref as any} data-slot="sheet-trigger" {...props} />
})

SheetTrigger.displayName = "SheetTrigger"

const SheetClose = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Close>, React.ComponentProps<typeof SheetPrimitive.Close>>(({ ...props }, ref) => {
  const CloseComp: any = SheetPrimitive.Close

  return <CloseComp ref={ref as any} data-slot="sheet-close" {...props} />
})

SheetClose.displayName = "SheetClose"

const SheetPortal = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Portal>, React.ComponentProps<typeof SheetPrimitive.Portal>>(({ ...props }, ref) => {
  const PortalComp: any = SheetPrimitive.Portal

  return <PortalComp ref={ref as any} data-slot="sheet-portal" {...props} />
})

SheetPortal.displayName = "SheetPortal"

const SheetOverlay = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Overlay>, React.ComponentProps<typeof SheetPrimitive.Overlay>>(({ className, ...props }, ref) => {
  const OverlayComp: any = SheetPrimitive.Overlay

  return (
    <OverlayComp
      ref={ref as any}
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
})

SheetOverlay.displayName = "SheetOverlay"

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}>(({ className, children, side = "right", showCloseButton = true, ...props }, ref) => {
  return (
    <SheetPortal>
      <SheetOverlay />
      {(() => {
        const ContentComp: any = SheetPrimitive.Content
        const CloseCompInner: any = SheetPrimitive.Close

        return (
          <ContentComp
            ref={ref as any}
            data-slot="sheet-content"
            className={cn(
          "fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500",
          side === "right" &&
            "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
          side === "left" &&
            "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
          side === "top" &&
            "inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
          side === "bottom" &&
            "inset-x-0 bottom-0 h-auto border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          className
        )}
            {...props}
          >
            {children}
            {showCloseButton && (
              <CloseCompInner className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-secondary">
                <XIcon className="size-4" />
                <span className="sr-only">Close</span>
              </CloseCompInner>
            )}
          </ContentComp>
        )
      })()}
    </SheetPortal>
  )
})

SheetContent.displayName = "SheetContent"

const SheetHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  )
})

SheetHeader.displayName = "SheetHeader"

const SheetFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
})

SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Title>, React.ComponentProps<typeof SheetPrimitive.Title>>(({ className, ...props }, ref) => {
  const TitleComp: any = SheetPrimitive.Title

  return (
    <TitleComp
      ref={ref as any}
      data-slot="sheet-title"
      className={cn("font-semibold text-foreground", className)}
      {...props}
    />
  )
})

SheetTitle.displayName = "SheetTitle"

const SheetDescription = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Description>, React.ComponentProps<typeof SheetPrimitive.Description>>(({ className, ...props }, ref) => {
  const DescComp: any = SheetPrimitive.Description

  return (
    <DescComp
      ref={ref as any}
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})

SheetDescription.displayName = "SheetDescription"

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
