import { redirect } from "next/navigation";
import { getAuthState, homeFor } from "@/lib/auth";
import { Guide } from "./guide";

export const metadata = { title: "How CareFolio works" };

// design/Guide1-3.html (mobile) and design/DGuide.html (desktop).
// Steps 1-3 of 4; step 4 is the terms. No skip, on purpose.
export default async function WelcomePage() {
  const { userId, mfa, profile } = await getAuthState();
  if (!userId) redirect("/login");
  if (!mfa) redirect("/verify");
  if (profile?.onboarded_at || profile?.role === "admin") redirect(homeFor(profile));

  return <Guide />;
}
