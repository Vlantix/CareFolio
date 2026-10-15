"use client";

import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { InputField } from "@/components/ui/input";
import { inviteCaregiver, type InviteState } from "./actions";

export function InviteForm({ patientName, patientHasLogin }: { patientName: string; patientHasLogin: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteCaregiver, {});

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-13 items-center justify-center gap-2 rounded-button border-[1.5px] border-dashed border-disabled-text bg-card font-semibold text-primary hover:bg-primary-soft"
      >
        <UserPlus size={18} aria-hidden /> Invite a caregiver
      </button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3 rounded-tile border border-border bg-card p-4">
      <h2 className="font-heading text-lg font-bold">Invite a caregiver</h2>
      {state.sent ? (
        <FormAlert tone="info">
          If {state.sent} has a CareFolio account, the invitation now waits for{" "}
          {patientHasLogin ? `${patientName}'s consent in the app` : "the records office to record consent"}.
          If they don&apos;t have an account yet, ask them to sign up first, then invite again.
        </FormAlert>
      ) : (
        <FormAlert>{state.error}</FormAlert>
      )}
      <InputField id="email" name="email" type="email" label="Their email" autoComplete="off" required />
      <InputField id="relationship" name="relationship" label={`Relationship to ${patientName}`} placeholder="e.g. Daughter" required />
      <p className="text-caption text-muted-foreground">
        They can request and view records once consent is recorded. They can&apos;t share unless the
        records office allows it.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send invitation"}
      </Button>
    </form>
  );
}
