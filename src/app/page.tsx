import { redirect } from "next/navigation";

// The app starts at log in. Already logged in? The proxy sends you on to
// /home from there.
export default function Start() {
  redirect("/login");
}
