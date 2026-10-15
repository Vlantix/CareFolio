"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { InputField } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { login, type LoginState } from "./actions";

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <FormAlert>{state.error}</FormAlert>
      {!state.error && <FormAlert tone="info">{notice}</FormAlert>}

      <div className="flex flex-col gap-4">
        <InputField
          id="email"
          name="email"
          type="email"
          label="Email address"
          placeholder="you@example.com"
          autoComplete="email"
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
          labelAction={
            <Link href="/reset-password" className="hidden text-sm font-semibold lg:inline">
              Forgot password?
            </Link>
          }
        />
        <Link
          href="/reset-password"
          className="self-end py-2 text-sm font-semibold lg:hidden"
        >
          Forgot password?
        </Link>
      </div>

      <div className="flex flex-col gap-3.5">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </Button>
        <p className="text-center text-sm leading-[1.45] text-muted-foreground">
          Next, we&apos;ll email you a 6-digit code to confirm it&apos;s you.
        </p>
      </div>
    </form>
  );
}
