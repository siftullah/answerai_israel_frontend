import type { Business } from "./business";
import type { Membership } from "./membership";
import type { User } from "./user";

export interface LoginPayload {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  business_name: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  email: string;
  password: string;
}

export interface AcceptInvitationPayload {
  token: string;
  first_name?: string;
  last_name?: string;
  password?: string;
}

/** Flat responses (no `data` wrapper) — login, /me. */
export interface MeResponse {
  user: User;
  memberships: Membership[];
}

export type LoginResponse = MeResponse;

/** Flat responses — register, accept-invitation. */
export interface RegisterResponse {
  user: User;
  business: Business;
}

export type AcceptInvitationResponse = RegisterResponse;

export interface MessageResponse {
  message: string;
}
