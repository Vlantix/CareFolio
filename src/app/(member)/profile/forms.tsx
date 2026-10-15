"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { InputField } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  changePassword,
  requestDeletion,
  requestNameChange,
  suggestFacility,
  updatePhone,
  type FormState,
} from "./actions";

function Result({ state }: { state: FormState }) {
  return (
    <>
      <FormAlert>{state.error}</FormAlert>
      <FormAlert tone="info">{state.ok}</FormAlert>
    </>
  );
}

export function PhoneForm({ phone }: { phone: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updatePhone, {});
  return (
    <form action={action} className="flex flex-col gap-2.5">
      <InputField id="phone" name="phone" type="tel" inputMode="numeric" label="Mobile number" defaultValue={phone ?? ""} placeholder="09XX XXX XXXX" />
      <Result state={state} />
      <Button type="submit" variant="outline" disabled={pending} className="self-start">Save number</Button>
    </form>
  );
}

export function NameChangeForm({ pending: waiting }: { pending: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(requestNameChange, {});
  if (waiting) {
    return <FormAlert tone="info">Name change to &ldquo;{waiting}&rdquo; is waiting for the records office.</FormAlert>;
  }
  return (
    <details>
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary">Request a name change</summary>
      <form action={action} className="flex flex-col gap-2.5 pt-2">
        <InputField id="full_name" name="full_name" label="Full name, exactly as on your ID" />
        <Result state={state} />
        <Button type="submit" variant="outline" disabled={pending} className="self-start">Send to records office</Button>
      </form>
    </details>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, {});
  return (
    <form action={action} className="flex flex-col gap-2.5">
      <PasswordInput id="password" name="password" label="New password" autoComplete="new-password" placeholder="At least 8 characters" />
      <PasswordInput id="confirm" name="confirm" label="Type it again" autoComplete="new-password" />
      <Result state={state} />
      <Button type="submit" variant="outline" disabled={pending} className="self-start">Change password</Button>
    </form>
  );
}

export function DeletionForm({ waiting }: { waiting: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(requestDeletion, {});
  if (waiting) return <FormAlert tone="info">Your deletion request is waiting for the records office.</FormAlert>;
  return (
    <form action={action} className="flex flex-col gap-2.5">
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" name="confirm" className="mt-0.5 size-5 accent-primary" />
        I understand my login and personal data will be deleted, but the hospital keeps my medical
        records and the audit trail.
      </label>
      <Result state={state} />
      <Button type="submit" variant="destructive" disabled={pending} className="self-start">Request account deletion</Button>
    </form>
  );
}

export function SuggestFacilityForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(suggestFacility, {});
  return (
    <form action={action} className="flex flex-col gap-2.5">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <InputField id="fac-name" name="name" label="Facility name" />
        <InputField id="fac-city" name="city" label="City" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fac-reason">Why? <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Textarea id="fac-reason" name="reason" rows={2} maxLength={500} />
      </div>
      <Result state={state} />
      <Button type="submit" variant="outline" disabled={pending} className="self-start">Send suggestion</Button>
    </form>
  );
}
