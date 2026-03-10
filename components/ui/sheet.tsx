"use client";

import { Dialog } from "@base-ui/react/dialog";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Sheet — design-system customized overlay panel (not stock shadcn).
 * Built on Base UI Dialog; styled with teal/amber tokens, no default purple/gray.
 */

const SheetRoot = Dialog.Root;
const SheetTrigger = Dialog.Trigger;
const SheetClose = Dialog.Close;

const SheetPortal = Dialog.Portal;

const SheetOverlay = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <Dialog.Backdrop
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-foreground/20 backdrop-blur-[2px]",
      "data-[open]:animate-in data-[closed]:animate-out",
      "data-[closed]:fade-out-0 data-[open]:fade-in-0",
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

type SheetContentSide = "left" | "right" | "top" | "bottom";

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: SheetContentSide;
  showCloseButton?: boolean;
}

const sideStyles: Record<
  SheetContentSide,
  { container: string; panel: string }
> = {
  left: {
    container: "inset-y-0 left-0 h-full",
    panel:
      "h-full w-full max-w-[min(20rem,85vw)] border-r border-sidebar-border bg-sidebar data-[closed]:slide-out-to-left data-[open]:slide-in-from-left",
  },
  right: {
    container: "inset-y-0 right-0 h-full",
    panel:
      "h-full w-full max-w-[min(20rem,85vw)] border-l border-sidebar-border bg-sidebar data-[closed]:slide-out-to-right data-[open]:slide-in-from-right",
  },
  top: {
    container: "inset-x-0 top-0 w-full",
    panel:
      "w-full border-b border-sidebar-border bg-sidebar data-[closed]:slide-out-to-top data-[open]:slide-in-from-top",
  },
  bottom: {
    container: "inset-x-0 bottom-0 w-full",
    panel:
      "w-full max-h-[85vh] border-t border-sidebar-border bg-sidebar data-[closed]:slide-out-to-bottom data-[open]:slide-in-from-bottom",
  },
};

const SheetContent = forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = "left", showCloseButton = true, className, children, ...props }, ref) => {
    const { container, panel } = sideStyles[side];
    return (
      <SheetPortal>
        <SheetOverlay />
        <Dialog.Viewport
          className={cn("fixed z-50", container)}
          ref={ref}
          {...props}
        >
          <Dialog.Popup
            className={cn(
              "shadow-lg transition-transform duration-200 ease-out",
              "data-[closed]:duration-150 data-[open]:duration-200",
              panel,
              className
            )}
          >
            {showCloseButton && (
              <Dialog.Close
                className={cn(
                  "absolute right-3 top-3 rounded-md p-1.5 text-sidebar-foreground",
                  "hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                )}
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </Dialog.Close>
            )}
            {children}
          </Dialog.Popup>
        </Dialog.Viewport>
      </SheetPortal>
    );
  }
);
SheetContent.displayName = "SheetContent";

const SheetHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-1.5 border-b border-sidebar-border p-4", className)}
    {...props}
  />
));
SheetHeader.displayName = "SheetHeader";

const SheetTitle = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <Dialog.Title
    ref={ref}
    className={cn("font-display text-lg font-semibold text-sidebar-foreground", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <Dialog.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

const SheetBody = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex-1 overflow-auto p-4", className)} {...props} />
));
SheetBody.displayName = "SheetBody";

export {
  SheetRoot,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
};
