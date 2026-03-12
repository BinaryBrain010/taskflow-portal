"use client";

import { Dialog } from "@base-ui/react/dialog";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
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
  cancelVariant?: "ghost" | "default";
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
      cancelVariant = "ghost",
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
              <Button variant={cancelVariant} onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </Button>
              <Button
                variant={isDestructive ? "destructive" : "default"}
                onClick={() => onConfirm()}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    <span className="sr-only">Loading</span>
                  </>
                ) : (
                  confirmLabel
                )}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </ConfirmDialogPortal>
    );
  }
);
ConfirmDialogContent.displayName = "ConfirmDialogContent";

interface RejectDialogContentProps extends Omit<ConfirmDialogContentProps, "onConfirm"> {
  rejectNote: string;
  onRejectNoteChange: (value: string) => void;
  onConfirm: (note: string) => void | Promise<void>;
}

const RejectDialogContent = forwardRef<HTMLDivElement, RejectDialogContentProps>(
  (
    {
      title,
      description,
      confirmLabel = "Reject",
      cancelLabel = "Cancel",
      onConfirm,
      onCancel,
      loading = false,
      rejectNote,
      onRejectNoteChange,
      className,
      ...props
    },
    ref
  ) => {
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
            {description && (
              <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                {description}
              </Dialog.Description>
            )}
            <div className="mt-4">
              <label htmlFor="reject-reason" className="sr-only">
                Rejection reason (optional)
              </label>
              <textarea
                id="reject-reason"
                value={rejectNote}
                onChange={(e) => onRejectNoteChange(e.target.value)}
                placeholder="Rejection reason (optional)"
                className="mt-2 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                disabled={loading}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </Button>
              <Button
                variant="destructive"
                onClick={() => onConfirm(rejectNote)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    <span className="sr-only">Loading</span>
                  </>
                ) : (
                  confirmLabel
                )}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </ConfirmDialogPortal>
    );
  }
);
RejectDialogContent.displayName = "RejectDialogContent";

export {
  ConfirmDialogRoot,
  ConfirmDialogPortal,
  ConfirmDialogOverlay,
  ConfirmDialogContent,
  RejectDialogContent,
};
