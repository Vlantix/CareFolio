"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { InputField } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/utils";
import { fieldErrors, formToObject, signupSchema } from "@/lib/validation";
import { signup, type SignupState } from "./actions";

const ROLES = [
  { value: "patient", label: "The patient" },
  { value: "caregiver", label: "A family caregiver" },
] as const;

export function SignupForm() {
  const [state, action, pending] = useActionState<SignupState, FormData>(signup, {});
  // Errors found in the browser before sending; the server's win after.
  const [local, setLocal] = useState<Record<string, string> | null>(null);
  const errors = local ?? state.fields ?? {};
  const v = state.values ?? {};
  const [role, setRole] = useState<string>(v.role ?? "caregiver");

  function check(e: React.FormEvent<HTMLFormElement>) {
    const parsed = signupSchema.safeParse(formToObject(new FormData(e.currentTarget)));
    if (!parsed.success) {
      e.preventDefault();
      setLocal(fieldErrors(parsed.error));
    } else {
      setLocal(null);
    }
  }

  return (
    <form action={action} onSubmit={check} noValidate className="flex flex-col gap-5">
      <FormAlert>{state.error}</FormAlert>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">I am…</legend>
        <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
          {ROLES.map((r) => (
            <label
              key={r.value}
              className={cn(
                "flex h-12 cursor-pointer items-center gap-2 rounded-field bg-card px-3 text-[15px] font-semibold lg:h-[52px] lg:gap-2.5 lg:px-3.5 lg:text-base",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40",
                role === r.value
                  ? "border-2 border-primary bg-primary-soft"
                  : "border-[1.5px] border-input",
              )}
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={role === r.value}
                onChange={() => setRole(r.value)}
                className="m-0 size-[18px] shrink-0 accent-primary"
              />
              {r.value === "caregiver" ? (
                <>
                  <span className="lg:hidden">A caregiver</span>
                  <span className="hidden lg:inline">{r.label}</span>
                </>
              ) : (
                r.label
              )}
            </label>
          ))}
        </div>
        {errors.role && (
          <p className="mt-1.5 text-[13px] font-semibold text-danger-foreground">{errors.role}</p>
        )}
      </fieldset>

      <div className="grid grid-cols-2 gap-x-2.5 gap-y-3 lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] lg:gap-3.5">
        <InputField
          id="full_name" name="full_name" label="Full name" className="col-span-2 lg:col-span-1"
          placeholder="As shown on your valid ID" autoComplete="name"
          defaultValue={v.full_name} error={errors.full_name}
        />
        <InputField
          id="birthdate" name="birthdate" type="date" label="Date of birth" className="col-span-2 lg:col-span-1"
          autoComplete="bday" defaultValue={v.birthdate} error={errors.birthdate}
        />
        <InputField
          id="email" name="email" type="email" label="Email" placeholder="you@email.com"
          autoComplete="email" defaultValue={v.email} error={errors.email}
          className="max-lg:col-span-2 min-[380px]:max-lg:col-span-1"
        />
        <InputField
          id="phone" name="phone" type="tel" inputMode="numeric" placeholder="09XX XXX XXXX"
          label={<><span className="lg:hidden">Mobile no.</span><span className="hidden lg:inline">Mobile number</span></>}
          autoComplete="tel" defaultValue={v.phone} error={errors.phone}
          className="max-lg:col-span-2 min-[380px]:max-lg:col-span-1"
        />
        <PasswordInput
          id="password" name="password" label="Password" placeholder="At least 8 characters"
          autoComplete="new-password" error={errors.password}
          className="col-span-2 lg:col-span-1 [&>div:nth-child(2)]:h-12 lg:[&>div:nth-child(2)]:h-[50px]"
        />
        <InputField
          id="hospital_no" name="hospital_no" className="col-span-2 lg:col-span-1"
          label={<>Patient&apos;s hospital no. <span className="font-normal text-muted-foreground">(optional)</span></>}
          placeholder="e.g. H-0001"
          defaultValue={v.hospital_no} error={errors.hospital_no}
        />
      </div>

      <Button type="submit" size="lg" disabled={pending} className="mt-1">
        {pending ? "Creating your account…" : "Create account & get email code"}
      </Button>
    </form>
  );
}
