"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { InputField } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { activateAccount, rejectAccount, setRole, type AccountState } from "./actions";

export function RegistrationActions({
  profileId,
  role,
  hospitalNo,
}: {
  profileId: string;
  role: "patient" | "caregiver";
  hospitalNo: string | null;
}) {
  const [mode, setMode] = useState<"none" | "activate" | "reject">("none");
  const [activateState, activate, activating] = useActionState<AccountState, FormData>(activateAccount, {});
  const [rejectState, reject, rejecting] = useActionState<AccountState, FormData>(rejectAccount, {});

  if (activateState.ok || rejectState.ok) return <FormAlert tone="info">{activateState.ok ?? rejectState.ok}</FormAlert>;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode("reject")} className="h-11 rounded-field border-[1.5px] border-input bg-card px-4 text-sm font-semibold">
          Reject
        </button>
        <button type="button" onClick={() => setMode("activate")} className="h-11 rounded-field bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          Verify &amp; activate
        </button>
      </div>

      {mode === "activate" && (
        <form action={activate} className="flex flex-col gap-2.5 rounded-field bg-background p-3">
          <input type="hidden" name="profile_id" value={profileId} />
          <InputField
            id={`hno-${profileId}`}
            name="hospital_no"
            label={role === "patient" ? "Patient's hospital no. (links or creates the patient record)" : "Link to patient — hospital no. (optional)"}
            defaultValue={hospitalNo ?? ""}
            required={role === "patient"}
          />
          {role === "caregiver" && (
            <InputField id={`rel-${profileId}`} name="relationship" label="Relationship to the patient" placeholder="e.g. Daughter" />
          )}
          {role === "caregiver" && (
            <p className="text-caption text-muted-foreground">
              The caregiver link starts as pending. Record consent below (or the patient approves in the app).
            </p>
          )}
          <FormAlert>{activateState.error}</FormAlert>
          <Button type="submit" disabled={activating} className="self-start">
            {activating ? "Activating…" : "Confirm ID checked & activate"}
          </Button>
        </form>
      )}
      {mode === "reject" && (
        <form action={reject} className="flex flex-col gap-2.5 rounded-field bg-background p-3">
          <input type="hidden" name="profile_id" value={profileId} />
          <label htmlFor={`reason-${profileId}`} className="text-sm font-semibold">
            Reason <span className="font-normal text-muted-foreground">(the person will see this)</span>
          </label>
          <Textarea id={`reason-${profileId}`} name="reason" rows={2} maxLength={300} required />
          <FormAlert>{rejectState.error}</FormAlert>
          <Button type="submit" variant="destructive" disabled={rejecting} className="self-start">
            Reject account
          </Button>
        </form>
      )}
    </div>
  );
}

export function RoleForm({ profileId, current, self }: { profileId: string; current: string; self: boolean }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(setRole, {});
  if (self) return <span className="text-caption text-muted-foreground">You</span>;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="profile_id" value={profileId} />
      <label className="sr-only" htmlFor={`role-${profileId}`}>Role</label>
      <select id={`role-${profileId}`} name="role" defaultValue={current} className="h-10 rounded-field border-[1.5px] border-input bg-card px-2 text-sm">
        <option value="admin">Records officer (admin)</option>
        <option value="patient">Remove staff role → patient</option>
        <option value="caregiver">Remove staff role → caregiver</option>
      </select>
      <button type="submit" disabled={pending} className="h-10 rounded-field border-[1.5px] border-input px-3 text-sm font-semibold">
        Save
      </button>
      {state.error && <span role="alert" className="text-caption font-semibold text-danger-foreground">{state.error}</span>}
    </form>
  );
}

export function AddStaffForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(setRole, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-2.5">
      <input type="hidden" name="role" value="admin" />
      <InputField id="staff-email" name="email" type="email" label="Add staff by email (they must have signed up)" className="min-w-[260px] flex-1" />
      <Button type="submit" disabled={pending}>+ Add staff</Button>
      <FormAlert className="w-full">{state.error}</FormAlert>
      {state.ok && <FormAlert tone="info" className="w-full">{state.ok}</FormAlert>}
    </form>
  );
}
