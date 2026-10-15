"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { InputField } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { staffLogin, type StaffLoginState } from "./actions";

export function StaffLoginForm({ failed }: { failed: boolean }) {
  const [state, action, pending] = useActionState<StaffLoginState, FormData>(
    staffLogin,
    failed ? { error: "Invalid email or password." } : {},
  );

  return (
    <form action={action} noValidate className="flex flex-col gap-[22px]">
      <FormAlert>{state.error}</FormAlert>
      <InputField
        id="email"
        name="email"
        type="email"
        label="Work email"
        placeholder="name@hospital.ph"
        autoComplete="username"
        defaultValue={state.email}
        required
        className="[&_input]:h-[52px] [&_input]:px-4"
      />
      <PasswordInput
        id="password"
        name="password"
        label="Password"
        placeholder="Enter your password"
        autoComplete="current-password"
        required
      />
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="bg-navy hover:bg-sidebar-active"
      >
        {pending ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
