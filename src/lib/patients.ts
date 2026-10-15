import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAuthState } from "@/lib/auth";

export const PATIENT_COOKIE = "cf_patient";

export type PatientChoice = {
  id: string;
  full_name: string;
  hospital_no: string;
  birthdate: string | null;
  sex: string | null;
  /** "You" for your own record, else e.g. "Father". */
  relationship: string;
};

/**
 * Every patient this user may see: their own patient row plus patients
 * from ACTIVE caregiver links. RLS (can_access_patient) does the real
 * filtering — this can't return anyone it shouldn't.
 */
export const getMyPatients = cache(async (): Promise<PatientChoice[]> => {
  const { userId } = await getAuthState();
  if (!userId) return [];
  const supabase = await createClient();
  const [{ data: patients }, { data: links }] = await Promise.all([
    supabase.from("patients").select("id, full_name, hospital_no, birthdate, sex, profile_id"),
    supabase
      .from("caregiver_links")
      .select("patient_id, relationship")
      .eq("caregiver_id", userId)
      .eq("status", "active")
      .eq("can_view", true),
  ]);
  const relation = new Map((links ?? []).map((l) => [l.patient_id, l.relationship as string]));
  return (patients ?? [])
    .filter((p) => p.profile_id === userId || relation.has(p.id))
    .map((p) => ({
      id: p.id,
      full_name: p.full_name,
      hospital_no: p.hospital_no,
      birthdate: p.birthdate,
      sex: p.sex,
      relationship: p.profile_id === userId ? "You" : relation.get(p.id)!,
    }))
    .sort((a, b) => Number(b.relationship === "You") - Number(a.relationship === "You"));
});

/**
 * The patient being viewed: the one saved in the cf_patient cookie if
 * this user may still see them, otherwise the first one. Null when the
 * records office hasn't linked the account to anyone yet.
 */
export const getActivePatient = cache(async () => {
  const patients = await getMyPatients();
  const chosen = (await cookies()).get(PATIENT_COOKIE)?.value;
  const active = patients.find((p) => p.id === chosen) ?? patients[0] ?? null;
  return { patients, active };
});
