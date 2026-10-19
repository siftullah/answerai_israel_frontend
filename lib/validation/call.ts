import { z } from "zod";
import type { PhoneNumber, PlaceCallPayload } from "@/lib/api/types";
import type { Translator } from "@/lib/i18n/types";
import { ilPhoneField, normalizeIlPhone } from "@/lib/phone";

/**
 * Numbers a call can be placed from: platform (Twilio) voice numbers only —
 * BYO SIP numbers are inbound-only by design.
 */
export function callablePhoneNumbers(numbers: PhoneNumber[] | undefined): PhoneNumber[] {
  return (numbers ?? []).filter(
    (number) =>
      number.provider === "twilio" && number.status === "active" && number.capabilities.voice
  );
}

/**
 * Loose IL shape check only — the backend's Phone rule is the validation
 * authority; its 422 lands on `to_number` via applyServerErrors. The payload
 * mapper canonicalizes to +972 E.164. `t` is scoped to the `validation` namespace.
 */
export function placeCallSchema(t: Translator) {
  return z.object({
    agent_id: z.string().min(1, t("call.agentRequired")),
    from_phone_number_id: z.string().min(1, t("common.fromNumberRequired")),
    to_number: ilPhoneField(t, t("call.toNumberRequired")),
    /** Carried through when the call starts from a contact; never rendered. */
    contact_id: z.string().optional(),
    /**
     * One pair per variable the chosen agent declares, prefilled with its default.
     * Every value must be given: the backend rejects a blank one rather than falling
     * back. Pairs, not a record — RHF paths with user-authored keys are fragile.
     */
    dynamic_variables: z.array(
      z.object({
        name: z.string(),
        value: z.string().trim().min(1, t("call.variableValueRequired")),
      })
    ),
  });
}

export type PlaceCallValues = z.infer<ReturnType<typeof placeCallSchema>>;

export function defaultPlaceCallValues(
  overrides: Partial<PlaceCallValues> = {}
): PlaceCallValues {
  return {
    agent_id: "",
    from_phone_number_id: "",
    to_number: "",
    dynamic_variables: [],
    ...overrides,
  };
}

export function toPlaceCallPayload(values: PlaceCallValues): PlaceCallPayload {
  const variables: Record<string, string> = {};
  for (const pair of values.dynamic_variables) {
    variables[pair.name] = pair.value.trim();
  }
  return {
    agent_id: values.agent_id,
    from_phone_number_id: values.from_phone_number_id,
    to_number: normalizeIlPhone(values.to_number),
    ...(values.contact_id ? { contact_id: values.contact_id } : {}),
    ...(Object.keys(variables).length > 0 ? { dynamic_variables: variables } : {}),
  };
}

/**
 * Backend 422 keys for variables are `dynamic_variables.<name>`; the form keeps
 * pairs, so the message has to land on that pair's value field. Unknown names
 * fall through untouched and surface as the form-level alert.
 */
export function placeCallServerFieldKey(values: PlaceCallValues, key: string): string {
  const match = /^dynamic_variables\.(.+)$/.exec(key);
  if (!match) return key;
  const index = values.dynamic_variables.findIndex((pair) => pair.name === match[1]);
  return index >= 0 ? `dynamic_variables.${index}.value` : key;
}
