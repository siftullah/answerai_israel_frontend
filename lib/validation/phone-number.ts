import { z } from "zod";
import type {
  Agent,
  PhoneNumber,
  PurchasePhoneNumberPayload,
  UpdatePhoneNumberPayload,
} from "@/lib/api/types";
import { auPhoneField, normalizeAuPhone } from "@/lib/phone";

/**
 * Agents assignable to a number slot: purpose must match the slot and the
 * agent must be live in the voice platform (backend 422s otherwise). Distinct
 * from `selectableAgents` in hooks/use-agents.ts, which is for knowledge
 * enablement and has different rules.
 */
export function eligibleAgents(
  agents: Agent[] | undefined,
  slot: "inbound" | "outbound"
): Agent[] {
  return (agents ?? []).filter(
    (agent) =>
      agent.purpose === slot && agent.status === "active" && agent.sync_status === "in_sync"
  );
}

const friendlyName = z
  .string()
  .trim()
  .min(1, "Give this number a name")
  .max(100, "Keep the name under 100 characters");

/** "" = none for both agent slots throughout. */
export const editPhoneNumberSchema = z.object({
  friendly_name: friendlyName,
  inbound_agent_id: z.string(),
  outbound_agent_id: z.string(),
});

export type EditPhoneNumberValues = z.infer<typeof editPhoneNumberSchema>;

export function toEditPhoneNumberValues(number: PhoneNumber): EditPhoneNumberValues {
  return {
    friendly_name: number.friendly_name ?? "",
    inbound_agent_id: number.inbound_agent?.id ?? "",
    outbound_agent_id: number.outbound_agent?.id ?? "",
  };
}

/**
 * All shown keys are always sent ("" → null clears an agent, per PATCH
 * semantics). BYO SIP numbers are inbound-only, so their outbound key is
 * omitted entirely.
 */
export function toUpdatePhoneNumberPayload(
  values: EditPhoneNumberValues,
  provider: PhoneNumber["provider"]
): UpdatePhoneNumberPayload {
  return {
    friendly_name: values.friendly_name.trim(),
    inbound_agent_id: values.inbound_agent_id === "" ? null : values.inbound_agent_id,
    ...(provider === "twilio"
      ? { outbound_agent_id: values.outbound_agent_id === "" ? null : values.outbound_agent_id }
      : {}),
  };
}

/**
 * Loose AU-shape check only — the backend canonicalizes to E.164 and is the
 * validation authority; its 422 lands on this `e164` field via applyServerErrors.
 */
export const sipNumberSchema = z.object({
  e164: auPhoneField("Enter the number your trunk carries"),
  friendly_name: friendlyName,
  inbound_agent_id: z.string(),
});

export type SipNumberValues = z.infer<typeof sipNumberSchema>;

export function defaultSipNumberValues(): SipNumberValues {
  return { e164: "", friendly_name: "", inbound_agent_id: "" };
}

export function toRegisterSipNumberPayload(values: SipNumberValues): PurchasePhoneNumberPayload {
  return {
    e164: normalizeAuPhone(values.e164),
    friendly_name: values.friendly_name.trim(),
    ...(values.inbound_agent_id !== "" ? { inbound_agent_id: values.inbound_agent_id } : {}),
  };
}

/** Step 2 of the buy dialog — the number itself comes from the picker. */
export const buyDetailsSchema = z.object({
  friendly_name: friendlyName,
  inbound_agent_id: z.string(),
  outbound_agent_id: z.string(),
});

export type BuyDetailsValues = z.infer<typeof buyDetailsSchema>;

export function defaultBuyDetailsValues(): BuyDetailsValues {
  return { friendly_name: "", inbound_agent_id: "", outbound_agent_id: "" };
}

export function toPurchasePayload(
  e164: string,
  values: BuyDetailsValues
): PurchasePhoneNumberPayload {
  return {
    e164,
    friendly_name: values.friendly_name.trim(),
    ...(values.inbound_agent_id !== "" ? { inbound_agent_id: values.inbound_agent_id } : {}),
    ...(values.outbound_agent_id !== "" ? { outbound_agent_id: values.outbound_agent_id } : {}),
  };
}
