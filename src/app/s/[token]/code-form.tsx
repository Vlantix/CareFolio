"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { InputField } from "@/components/ui/input";
import { submitShareCode, type CodeState } from "./actions";

export function CodeForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<CodeState, FormData>(submitShareCode.bind(null, token), {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormAlert>{state.error}</FormAlert>
      <InputField
        id="code"
        name="code"
        label="Access code"
        hint="Ask the patient or caregiver for the 4-digit code."
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        autoFocus
        className="[&_input]:text-center [&_input]:font-heading [&_input]:text-2xl [&_input]:tracking-[0.3em]"
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Checking…" : "Open summary"}
      </Button>
    </form>
  );
}
