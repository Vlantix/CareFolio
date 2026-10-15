import { PageHeader } from "@/components/ui/page-header";
import { PatientSwitcher } from "@/components/patient-switcher";
import { Countdown } from "@/components/countdown";
import { requireMember } from "@/lib/auth";
import { getActivePatient } from "@/lib/patients";
import { createClient } from "@/lib/supabase/server";
import { SHARE_DURATIONS, SHARE_SECTIONS, type ShareSection } from "@/lib/share";
import { dayAndTime, timeOfDay } from "@/lib/dates";
import { ShareForm } from "./share-form";
import { revokeShare } from "./actions";

export const metadata = { title: "Share with a doctor · CareFolio" };

type LinkRow = {
  id: string;
  sections: ShareSection[];
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  has_code: boolean;
  views: string[];
};

/** Not revoked and not yet expired. */
function isLive(l: LinkRow) {
  return !l.revoked_at && new Date(l.expires_at).getTime() > Date.now();
}

// design/MShare.html
export default async function SharePage() {
  await requireMember();
  const { patients, active } = await getActivePatient();
  const supabase = await createClient();

  const [{ data: canShare }, { data: links }] = active
    ? await Promise.all([
        supabase.rpc("can_share_patient", { p_patient: active.id }),
        supabase.rpc("list_share_links", { p_patient: active.id }),
      ])
    : [{ data: false }, { data: [] }];
  const rows = (links ?? []) as LinkRow[];
  const live = rows.filter(isLive);
  const past = rows.filter((l) => !live.includes(l)).slice(0, 5);

  return (
    <main className="flex flex-col gap-3.5 px-5 pt-5 pb-6 md:max-w-2xl md:px-10 md:py-8">
      <PageHeader title="Share with a doctor" backHref="/home" backLabel="Back to home" />
      {active && <PatientSwitcher patients={patients} activeId={active.id} />}

      {!active && <p className="text-ui text-muted-foreground">No patient linked yet.</p>}
      {active && !canShare && (
        <p className="rounded-field bg-attention px-3.5 py-3 text-sm text-attention-foreground">
          You can&apos;t share {active.full_name}&apos;s summary. Sharing needs an approved account and,
          for caregivers, the patient&apos;s permission to share.
        </p>
      )}
      {active && canShare && (
        <ShareForm sections={SHARE_SECTIONS} durations={SHARE_DURATIONS as unknown as Record<string, string>} />
      )}

      {live.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-caption font-bold tracking-[0.05em] text-muted-foreground uppercase">Active links</h2>
          {live.map((l) => (
            <LinkCard key={l.id} link={l} live />
          ))}
        </section>
      )}
      {past.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-caption font-bold tracking-[0.05em] text-muted-foreground uppercase">Recent links</h2>
          {past.map((l) => (
            <LinkCard key={l.id} link={l} live={false} />
          ))}
        </section>
      )}
    </main>
  );
}

function LinkCard({ link, live }: { link: LinkRow; live: boolean }) {
  return (
    <article className="flex flex-col gap-2 rounded-tile border border-border bg-card p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-ui">{link.sections.map((s) => SHARE_SECTIONS[s]).join(", ")}</strong>
        <span className="text-caption text-muted-foreground">
          {live ? <Countdown until={link.expires_at} /> : link.revoked_at ? "Revoked" : "Expired"}
          {link.has_code && " · code"}
        </span>
      </div>
      <span className="text-caption text-muted-foreground">
        Access log:{" "}
        {link.views.length === 0
          ? "not opened yet"
          : `opened ${link.views.length}× · last ${timeOfDay(link.views[0])}`}
        {" · "}created {dayAndTime(link.created_at)}
      </span>
      {live && (
        <form action={revokeShare}>
          <input type="hidden" name="linkId" value={link.id} />
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center rounded-field border-[1.5px] border-attention-icon text-sm font-bold text-attention-foreground hover:bg-attention"
          >
            Revoke link
          </button>
        </form>
      )}
    </article>
  );
}
