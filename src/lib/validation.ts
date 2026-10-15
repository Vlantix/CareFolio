import { z } from "zod";

// Form rules, shared by the browser (instant feedback) and the server
// (the real check — never trust what the browser sends).

/** Philippine mobile number: 09XXXXXXXXX. Spaces and dashes are ignored. */
const phMobile = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^09\d{9}$/, "Use the format 09XX XXX XXXX."));

export const signupSchema = z.object({
  role: z.enum(["patient", "caregiver"], { error: "Choose who you are." }),
  full_name: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(100, "That name is too long."),
  birthdate: z.iso
    .date({ error: "Enter your date of birth." })
    .refine((d) => new Date(d) < new Date(), "Date of birth must be in the past."),
  email: z.email({ error: "Enter a valid email address." }),
  phone: phMobile,
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72, "Use 72 characters or fewer."),
  hospital_no: z.string().trim().max(30, "That number is too long.").optional(),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  password: z.string().min(1, "Enter your password."),
});

export const otpSchema = z
  .string()
  .regex(/^\d{6}$/, "Enter all 6 digits of the code.");

export const emailSchema = z.email({ error: "Enter a valid email address." });

export const newPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use 72 characters or fewer.");

/** Turn a FormData into a plain object of strings (empty fields dropped). */
export function formToObject(form: FormData) {
  const out: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === "string" && value !== "") out[key] = value;
  });
  return out;
}

/** First error message per field, for showing under each input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
