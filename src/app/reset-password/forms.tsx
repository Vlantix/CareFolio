"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { InputField } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { requestReset, setNewPassword, type ResetState } from "./actions";

export function RequestResetForm() {
  const [state, action, pending] = useActionState<ResetState, FormData>(requestReset, {});
  if (state.sent) {
    return (
      <FormAlert tone="info">
        If that email has an account, we&apos;ve sent a link to reset the
        password. Check your inbox and spam folder.
      </FormAlert>
    );
  }
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <FormAlert>{state.error}</FormAlert>
      <InputField
        id="email" name="email" type="email" label="Email address"
        placeholder="you@example.com" autoComplete="email" required
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending…" : "Email me a reset link"}
      </Button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState<ResetState, FormData>(setNewPassword, {});
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <FormAlert>{state.error}</FormAlert>
      <PasswordInput
        id="password" name="password" label="New password"
        placeholder="At least 8 characters" autoComplete="new-password" required
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
