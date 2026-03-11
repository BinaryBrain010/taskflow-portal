"use client";

import { Dialog } from "@base-ui/react/dialog";
import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ConfirmDialogRoot = Dialog.Root;
const ConfirmDialogPortal = Dialog.Portal;

const ConfirmDialogOverlay = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <Dialog.Backdrop
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-foreground/25 backdrop-blur-[2px]",
      "data-[open]:animate-in data-[closed]:animate-out",
      "data-[closed]:fade-out-0 data-[open]:fade-in-0",
      className
    )}
    {...props}
  />
));
ConfirmDialogOverlay.displayName = "ConfirmDialogOverlay";

interface ConfirmDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const ConfirmDialogContent = forwardRef<HTMLDivElement, ConfirmDialogContentProps>(
  (
    {
      title,
      description,
      confirmLabel = "Confirm",
      cancelLabel = "Cancel",
      variant = "default",
      onConfirm,
      onCancel,
      loading = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDestructive = variant === "destructive";
    return (
      <ConfirmDialogPortal>
        <ConfirmDialogOverlay />
        <Dialog.Viewport
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          ref={ref}
          {...props}
        >
          <Dialog.Popup
            className={cn(
              "w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-lg",
              "data-[closed]:animate-out data-[open]:animate-in data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95",
              className
            )}
          >
            <Dialog.Title className="font-display text-lg font-semibold text-foreground">
              {title}
            </Dialog.Title>
            {(description || children) && (
              <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                {description}
                {children}
              </Dialog.Description>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </Button>
              <Button
                variant={isDestructive ? "destructive" : "default"}
                onClick={() => onConfirm()}
                disabled={loading}
              >
                {loading ? "…" : confirmLabel}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </ConfirmDialogPortal>
    );
  }
);
ConfirmDialogContent.displayName = "ConfirmDialogContent";

export {
  ConfirmDialogRoot,
  ConfirmDialogPortal,
  ConfirmDialogOverlay,
  ConfirmDialogContent,
};
