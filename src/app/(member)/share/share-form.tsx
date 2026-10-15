"use client";

import { useActionState, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Label } from "@/components/ui/label";
import { Countdown } from "@/components/countdown";
import { createShare, revokeShare, type ShareState } from "./actions";

const SELECT =
  "h-12 w-full rounded-field border-[1.5px] border-input bg-card px-3 text-ui text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none";

// design/MShare.html
export function ShareForm({
  sections,
  durations,
}: {
  sections: Record<string, string>;
  durations: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<ShareState, FormData>(createShare, {});
  const [qr, setQr] = useState<string>();
  const [copied, setCopied] = useState(false);
  const link = state.link;

  useEffect(() => {
    if (!link) return;
    // The QR library draws on a canvas and can't read CSS tokens: these
    // are --foreground and --card.
    QRCode.toDataURL(link.url, { margin: 1, width: 240, color: { dark: "#10292C", light: "#FFFFFF" } })
      .then(setQr)
      .catch(() => setQr(undefined));
  }, [link]);

  return (
    <div className="flex flex-col gap-3.5">
      {link && (
        <div className="flex items-center gap-4 rounded-card-lg border border-border bg-card p-4">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- a generated data: image
            <img src={qr} alt="QR code for the shared summary link" width={120} height={120} className="size-30 shrink-0" />
          ) : (
            <span className="size-30 shrink-0 rounded-chip bg-background" />
          )}
          <div className="flex min-w-0 flex-col gap-2">
            <span className="self-start rounded-full bg-attention px-2.5 py-1.25 text-xs font-bold text-attention-foreground" aria-live="polite">
              <Countdown until={link.expiresAt} />
            </span>
            {link.code && (
              <>
                <span className="text-caption text-muted-foreground">Access code to say aloud</span>
                <strong className="font-heading text-[26px] tracking-[0.12em]">{link.code.split("").join(" ")}</strong>
              </>
            )}
            <span className="text-xs text-muted-foreground">Read-only · opens in any browser</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(link.url);
                  setCopied(true);
                }}
                className="min-h-11 text-sm font-semibold text-primary"
              >
                {copied ? "Copied" : "Copy link"}
              </button>
              <form action={revokeShare}>
                <input type="hidden" name="linkId" value={link.id} />
                <button type="submit" className="min-h-11 text-sm font-semibold text-attention-foreground">
                  Revoke link
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {link && (
        <p className="text-caption text-muted-foreground">
          This link is shown only once. If you leave this page, revoke it and make a new one.
        </p>
      )}

      <form action={action} className="flex flex-col gap-3.5">
        <FormAlert>{state.error}</FormAlert>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-bold">What the doctor can see</legend>
          {Object.entries(sections).map(([key, label]) => (
            <label
              key={key}
              className="flex h-12 cursor-pointer items-center justify-between rounded-field border border-border bg-card px-3.5 text-ui font-semibold"
            >
              {label}
              <input type="checkbox" name="sections" value={key} defaultChecked={key !== "diagnoses"} className="size-[22px] accent-primary" />
            </label>
          ))}
        </fieldset>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="minutes" className="font-bold">Link lasts</Label>
            <select id="minutes" name="minutes" defaultValue="30" className={SELECT}>
              {Object.entries(durations).map(([m, label]) => (
                <option key={m} value={m}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code" className="font-bold">
              Access code <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <input id="code" name="code" inputMode="numeric" pattern="\d{4}" maxLength={4} placeholder="4 digits" className={SELECT} />
          </div>
        </div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Creating…" : link ? "New QR" : "Create QR link"}
        </Button>
      </form>
    </div>
  );
}
