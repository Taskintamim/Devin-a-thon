"use client";

import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export const Dialog = DialogPrimitive.Root;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="cf-fade fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-[3px]" />
      <DialogPrimitive.Content
        className={cn(
          "cf-pop fixed left-1/2 top-1/2 z-50 max-h-[min(90vh,860px)] w-[min(calc(100%-1.5rem),560px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-[var(--shadow-pop)]",
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:bg-secondary" aria-label="Close">
            <X className="size-4" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={body}>
        <div className="flex justify-end gap-2">
          <DialogPrimitive.Close className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm">
            Cancel
          </DialogPrimitive.Close>
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-lg bg-destructive px-3 text-sm font-medium text-white"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
