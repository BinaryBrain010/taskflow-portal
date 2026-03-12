"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog } from "@base-ui/react/dialog";
import { Loader2 } from "lucide-react";
import type { User } from "@/lib/types";
import type { CreateUserDTO } from "@/lib/services/userService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import { cn } from "@/lib/utils";

function inviteSchema(existingEmails: string[]) {
  return z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email format")
      .refine(
        (e) => !existingEmails.includes(e.trim().toLowerCase()),
        "A user with this email already exists"
      ),
    role: z.enum(["worker", "admin"]),
    status: z.enum(["active", "suspended"]),
  });
}

type InviteFormValues = z.infer<ReturnType<typeof inviteSchema>>;

const ROLE_OPTIONS = [
  { value: "worker", label: "Worker" },
  { value: "admin", label: "Admin" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

interface InviteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingUsers: User[];
  onSubmit: (data: CreateUserDTO) => Promise<void>;
  onSuccess?: (email: string) => void;
  isSubmitting: boolean;
}

export function InviteUserModal({
  open,
  onOpenChange,
  existingUsers,
  onSubmit,
  onSuccess,
  isSubmitting,
}: InviteUserModalProps) {
  const existingEmails = useMemo(
    () => existingUsers.map((u) => u.email.toLowerCase()),
    [existingUsers]
  );
  const schema = useMemo(() => inviteSchema(existingEmails), [existingEmails]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    setError,
    reset,
  } = useForm<InviteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      role: "worker",
      status: "active",
    },
  });

  const role = watch("role");
  const status = watch("status");

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  async function onFormSubmit(values: InviteFormValues) {
    try {
      await onSubmit({
        name: values.name.trim(),
        email: values.email.trim(),
        role: values.role,
        status: values.status,
      });
      onSuccess?.(values.email.trim());
      reset();
      handleOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      if (message.includes("already exists")) {
        setError("email", { message: "A user with this email already exists" });
      }
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-foreground/25 backdrop-blur-[2px]",
            "data-[open]:animate-in data-[closed]:animate-out",
            "data-[closed]:fade-out-0 data-[open]:fade-in-0"
          )}
        />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup
            className={cn(
              "w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg",
              "data-[closed]:animate-out data-[open]:animate-in data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95"
            )}
          >
            <Dialog.Title className="font-display text-lg font-semibold text-foreground">
              Invite user
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              Create a new account and they can log in immediately.
            </Dialog.Description>

            <form onSubmit={handleSubmit(onFormSubmit)} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Full name</Label>
                <Input
                  id="invite-name"
                  type="text"
                  placeholder="Jane Doe"
                  autoComplete="name"
                  disabled={isSubmitting}
                  className={errors.name ? "border-destructive" : ""}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="jane@example.com"
                  autoComplete="email"
                  disabled={isSubmitting}
                  className={errors.email ? "border-destructive" : ""}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <SelectDropdown.Root
                  value={role}
                  onValueChange={(v) => setValue("role", v as "worker" | "admin")}
                  options={ROLE_OPTIONS}
                  placeholder="Select role"
                >
                  <SelectDropdown.Trigger
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    disabled={isSubmitting}
                  />
                  <SelectDropdown.Content />
                </SelectDropdown.Root>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <SelectDropdown.Root
                  value={status}
                  onValueChange={(v) => setValue("status", v as "active" | "suspended")}
                  options={STATUS_OPTIONS}
                  placeholder="Select status"
                >
                  <SelectDropdown.Trigger
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    disabled={isSubmitting}
                  />
                  <SelectDropdown.Content />
                </SelectDropdown.Root>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                      Sending...
                    </>
                  ) : (
                    "Send invite"
                  )}
                </Button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
