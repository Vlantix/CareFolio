import { z } from "zod";
import { DOC_TYPES, PURPOSES } from "@/lib/records";

/** New-request form rules, checked in the browser and again on the server. */
export const requestSchema = z
  .object({
    doc_type: z.enum(Object.keys(DOC_TYPES) as [keyof typeof DOC_TYPES], { error: "Choose a document type." }),
    detail: z.string().trim().min(2, "Say which test or date.").max(200, "Keep it under 200 characters."),
    purpose: z.enum(PURPOSES, { error: "Choose a purpose." }),
    is_urgent: z.literal("on").optional(),
    urgent_reason: z.string().trim().max(300, "Keep it under 300 characters.").optional(),
  })
  .refine((v) => !v.is_urgent || (v.urgent_reason?.length ?? 0) >= 5, {
    path: ["urgent_reason"],
    message: "Tell the records office why it's urgent.",
  });

