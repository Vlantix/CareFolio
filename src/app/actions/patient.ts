"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { PATIENT_COOKIE, getMyPatients } from "@/lib/patients";

/** Switch which patient the app shows (caregivers with several). */
export async function selectPatient(form: FormData) {
  await requireMember();
  const id = String(form.get("patientId") ?? "");
  // Only a patient this user may actually see can be chosen.
  const allowed = (await getMyPatients()).some((p) => p.id === id);
  if (!allowed) return;
  (await cookies()).set(PATIENT_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/", "layout");
}
