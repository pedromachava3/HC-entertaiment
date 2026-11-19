"use client";
import { useActionState, useTransition } from "react";
import { Loader2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Field, Input, Select } from "@/components/ui/primitives";
import { addStaffAction, removeRoleAction } from "@/app/admin/actions";

export function AddStaffForm() {
  const [state, action, pending] = useActionState(addStaffAction, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[1fr_200px_auto] sm:items-end">
      <Field label="Email" htmlFor="u-email"><Input id="u-email" name="email" type="email" required /></Field>
      <Field label="Papel" htmlFor="u-role">
        <Select id="u-role" name="role" defaultValue="staff">
          <option value="staff">Funcionário de validação</option>
          <option value="admin">Administrador</option>
        </Select>
      </Field>
      <Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <UserPlus />} Adicionar</Button>
      {state?.error ? <Alert tone="error" className="sm:col-span-3">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success" className="sm:col-span-3">{state.message}</Alert> : null}
    </form>
  );
}

export function RoleBadge({ userId, role, canRemove }: { userId: string; role: "admin" | "staff"; canRemove: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Badge tone={role === "admin" ? "red" : "white"} className="gap-2">
      {role === "admin" ? "Administrador" : "Validação"}
      {canRemove ? (
        <button type="button" aria-label="Remover papel" disabled={pending} onClick={() => { if (confirm("Remover este papel?")) start(async () => { const r = await removeRoleAction(userId, role); if (r?.error) alert(r.error); }); }}>
          {pending ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
        </button>
      ) : null}
    </Badge>
  );
}
