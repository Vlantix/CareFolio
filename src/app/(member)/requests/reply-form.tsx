"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { replyToRecordsOffice, type ReplyState } from "./actions";

/** "Reply to records office" — opens a box under the question. */
export function ReplyForm({ requestId }: { requestId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ReplyState, FormData>(replyToRecordsOffice, {});

  if (state.ok) {
    return <FormAlert tone="info">Sent. The records office will continue reviewing.</FormAlert>;
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 items-center justify-center rounded-field border-[1.5px] border-accent text-sm font-bold text-attention-foreground hover:bg-attention"
      >
        Reply to records office
      </button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <Label htmlFor={`reply-${requestId}`}>Your answer</Label>
      <Textarea id={`reply-${requestId}`} name="reply" autoFocus maxLength={1000} />
      <FormAlert>{state.error}</FormAlert>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send answer"}
      </Button>
    </form>
  );
}
