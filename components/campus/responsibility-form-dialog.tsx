"use client";

import { FormField } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCampus } from "@/hooks/use-campus";
import { fieldErrors, responsibilitySchema } from "@/lib/validation";
import type { ClubResponsibility } from "@/types";
import { useState } from "react";
import { toast } from "sonner";

export function ResponsibilityFormDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ClubResponsibility | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <ResponsibilityForm key={item?.id ?? "new"} item={item} onOpenChange={onOpenChange} /> : null}
    </Dialog>
  );
}

function ResponsibilityForm({ item, onOpenChange }: { item: ClubResponsibility | null; onOpenChange: (open: boolean) => void }) {
  const { addResponsibility, updateResponsibility } = useCampus();
  const [form, setForm] = useState({
    organization: item?.organization ?? "",
    role: item?.role ?? "",
    commitment: item?.commitment ?? "",
    nextAction: item?.nextAction ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = responsibilitySchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    try {
      if (item) updateResponsibility(item.id, parsed.data);
      else addResponsibility(parsed.data);
      toast.success(item ? "Responsibility updated" : "Responsibility added");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    }
  }

  return (
    <DialogContent title={item ? "Edit responsibility" : "Add responsibility"}>
        <form className="grid gap-3" onSubmit={submit}>
          <FormField label="Organization" error={errors.organization}>
            <Input value={form.organization} onChange={(event) => setForm({ ...form, organization: event.target.value })} />
          </FormField>
          <FormField label="Role" error={errors.role}>
            <Input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
          </FormField>
          <FormField label="Commitment" error={errors.commitment}>
            <Input value={form.commitment} onChange={(event) => setForm({ ...form, commitment: event.target.value })} />
          </FormField>
          <FormField label="Next action" error={errors.nextAction}>
            <Input value={form.nextAction} onChange={(event) => setForm({ ...form, nextAction: event.target.value })} />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
  );
}
