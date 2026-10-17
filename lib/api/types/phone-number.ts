export const PHONE_NUMBER_STATUSES = [
  "purchasing",
  "configuring",
  "active",
  "releasing",
  "released",
  "error",
] as const;
export type PhoneNumberStatus = (typeof PHONE_NUMBER_STATUSES)[number];

/** Statuses the list keeps polling for. */
export const TRANSITIONAL_PHONE_STATUSES: readonly PhoneNumberStatus[] = [
  "purchasing",
  "configuring",
  "releasing",
];

export type PhoneNumberProvider = "twilio" | "byo_sip";
export type PhoneNumberType = "local" | "toll_free" | "mobile";

export interface PhoneNumberAgentRef {
  id: string;
  name: string;
}

export interface PhoneNumber {
  id: string;
  e164: string;
  provider: PhoneNumberProvider;
  friendly_name: string | null;
  country: string;
  number_type: PhoneNumberType;
  status: PhoneNumberStatus;
  capabilities: { voice: boolean };
  inbound_agent: PhoneNumberAgentRef | null;
  outbound_agent: PhoneNumberAgentRef | null;
  error: string | null;
  created_at: string;
}

/** A Twilio inventory search result — not yet owned. */
export interface AvailablePhoneNumber {
  e164: string;
  locality: string | null;
  number_type: PhoneNumberType;
  capabilities: { voice: boolean };
  monthly_price: { amount_cents: number; currency: string };
}

export interface PurchasePhoneNumberPayload {
  e164: string;
  friendly_name?: string;
  inbound_agent_id?: string;
  outbound_agent_id?: string;
}

/** Registering a BYO number over the business's SIP trunk — same shape. */
export type RegisterSipNumberPayload = PurchasePhoneNumberPayload;

/** PATCH semantics: absent key = untouched, `null` = clear. */
export interface UpdatePhoneNumberPayload {
  friendly_name?: string | null;
  inbound_agent_id?: string | null;
  outbound_agent_id?: string | null;
}
