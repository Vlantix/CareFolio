"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, formToObject, signupSchema } from "@/lib/validation";

export type SignupState = {
  error?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
};

export async function signup(_prev: SignupState, form: FormData): Promise<SignupState> {
  const values = formToObject(form);
  delete values.password; // never send the password back to the page

  // Check again on the server: the browser check can be skipped.
  const parsed = signupSchema.safeParse(formToObject(form));
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };

  const { email, password, ...details } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Becomes the profiles row, via the trigger in 002-profiles.sql.
    options: { data: { ...details, hospital_no: details.hospital_no ?? null } },
  });

  if (error) {
    if (error.code === "user_already_exists" || /already registered/i.test(error.message)) {
      return { fields: { email: "This email already has an account. Log in instead." }, values };
    }
    if (error.code === "weak_password") {
      return { fields: { password: "Choose a stronger password." }, values };
    }
    return { error: "We couldn't create your account. Please try again.", values };
  }

  if (!data.session) {
    // Happens when "Confirm email" is still ON in Supabase.
    return {
      error:
        "Account created, but Supabase is waiting for email confirmation. " +
        "Turn off Authentication → Sign In / Providers → Email → Confirm email, then log in.",
      values,
    };
  }

  redirect("/verify");
}
