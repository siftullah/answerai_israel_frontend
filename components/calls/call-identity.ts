import { formatE164 } from "@/lib/phone";
import type { Call } from "@/lib/api/types";

/** The other party's number: caller for inbound, callee for outbound. */
export function counterpartNumber(call: Call): string {
  return call.direction === "inbound" ? call.from_e164 : call.to_e164;
}

/** Display identity for the other party: contact → spoken name → number. */
export function counterpartName(call: Call): string {
  return call.contact?.name ?? call.caller_name ?? formatE164(counterpartNumber(call));
}
