import Link from "next/link";
import { BellRing, X } from "lucide-react";
import { FormAlert } from "@/components/ui/form-alert";
import { createClient } from "@/lib/supabase/server";
import { dismissNotification } from "@/app/actions/devices";

/**
 * Unread notices (today: "New login on <device> at <time>"), shown at the
 * top of patient Home and the staff landing page. `devicesHref` is where
 * "Review devices" goes for this kind of user.
 */
export async function LoginNotices({ devicesHref, error }: { devicesHref: string; error?: boolean }) {
  const supabase = await createClient();
  const { data: notices } = await supabase
    .from("notifications")
    .select("id, title, body")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(3);

  return (
    <>
      {error && <FormAlert>That didn&apos;t work. Please try again.</FormAlert>}
      {(notices ?? []).map((n) => (
        <div
          key={n.id}
          role="status"
          className="flex items-start gap-3 rounded-tile bg-attention p-3.5 text-attention-foreground"
        >
          <BellRing size={22} strokeWidth={1.8} aria-hidden className="mt-0.5 shrink-0 text-attention-icon" />
          <p className="flex-1 text-sm">
            <strong>{n.title}.</strong> {n.body}{" "}
            <Link href={devicesHref} className="font-semibold text-attention-foreground underline">
              Review devices
            </Link>
          </p>
          <form action={dismissNotification}>
            <input type="hidden" name="id" value={n.id} />
            <button
              type="submit"
              aria-label="Dismiss"
              className="-m-2.5 flex size-11 items-center justify-center rounded-field hover:bg-attention-ring/50"
            >
              <X size={18} aria-hidden />
            </button>
          </form>
        </div>
      ))}
    </>
  );
}
