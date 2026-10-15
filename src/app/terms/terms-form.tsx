"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { acceptTerms, type TermsState } from "./actions";

/** The two consent boxes and the finish button. */
export function TermsForm({ declineSlot }: { declineSlot: React.ReactNode }) {
  const [state, action, pending] = useActionState<TermsState, FormData>(acceptTerms, {});
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);

  return (
    <form action={action} className="flex flex-1 flex-col gap-[18px] lg:gap-5">
      <FormAlert>{state.error}</FormAlert>
      <div className="flex flex-col gap-3 lg:border-t lg:border-divider lg:pt-4">
        <Consent name="terms" checked={terms} onChange={setTerms}>
          I have read and agree to the Terms of Use.
        </Consent>
        <Consent name="privacy" checked={privacy} onChange={setPrivacy}>
          I consent to the processing of my health information as described
          in the Privacy Notice above.
        </Consent>
      </div>
      <div className="grow lg:hidden" />
      <div className="flex flex-col-reverse gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
        {declineSlot}
        <Button
          type="submit"
          size="lg"
          disabled={!terms || !privacy || pending}
          className="disabled:bg-input disabled:text-muted-foreground disabled:opacity-100 lg:w-auto lg:px-8 lg:text-base"
        >
          {pending ? "Saving…" : "Agree & finish setup"}
        </Button>
      </div>
    </form>
  );
}

function Consent({
  name,
  checked,
  onChange,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-[1.45] lg:text-[15px]">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="m-0 size-[22px] flex-none accent-primary"
      />
      <span>{children}</span>
    </label>
  );
}
