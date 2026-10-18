/** Base URL of the Laravel backend (no trailing slash, no /api suffix). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://answerai.co.il.test";

/**
 * Central endpoint catalog. Paths are relative to the axios instance's
 * baseURL ({API_URL}/api/v1). Business-scoped endpoints rely on the
 * X-Business-Identifier header the client injects from the /b/{uuid} URL.
 */
export const endpoints = {
  auth: {
    register: "auth/register",
    login: "auth/login",
    logout: "auth/logout",
    forgotPassword: "auth/forgot-password",
    resetPassword: "auth/reset-password",
    acceptInvitation: "auth/accept-invitation",
    resendVerification: "auth/email/verification-notification",
  },
  me: "me",
  // The signed-in user's own account + membership: name/email/password/avatar
  // live on the user, phone/position on their membership. Email changes go
  // through a pending-confirm flow (see routes/web.php on the backend).
  profile: {
    update: "me",
    password: "me/password",
    avatar: "me/avatar",
    pendingEmail: "me/pending-email",
  },
  businesses: {
    index: "businesses",
    show: (uuid: string) => `businesses/${uuid}`,
  },
  modules: {
    index: "modules",
    settings: (key: string) => `modules/${key}/settings`,
  },
  /** Public plans + this business's custom plans. Outside the 402 gate. */
  plans: "plans",
  // Subscription lifecycle — like plans, reachable without an active
  // subscription so a locked-out business can always subscribe or fix payment.
  billing: {
    show: "billing",
    subscribe: "billing/subscribe",
    changePlan: "billing/change-plan",
    changePlanPreview: "billing/change-plan/preview",
    cancel: "billing/cancel",
    resume: "billing/resume",
    setupSession: "billing/setup-session",
    paymentMethod: "billing/payment-method",
    charges: "billing/charges",
  },
  businessProfile: {
    show: "business-profile",
    logo: "business-profile/logo",
  },
  // Business-level routing for the new-lead / new-job / quote-request / team-callback
  // emails: read all at once, saved and tested one notification at a time.
  notificationSettings: {
    index: "notification-settings",
    settings: (type: string) => `notification-settings/${type}`,
    test: (type: string) => `notification-settings/${type}/test`,
  },
  addressSearch: "address-search",
  businessHours: "business-hours",
  dashboard: "dashboard",
  agents: {
    index: "agents",
    show: (uuid: string) => `agents/${uuid}`,
    archive: (uuid: string) => `agents/${uuid}/archive`,
    restore: (uuid: string) => `agents/${uuid}/restore`,
    rotateToolToken: (uuid: string) => `agents/${uuid}/rotate-tool-token`,
    testCall: (uuid: string) => `agents/${uuid}/test-call`,
    // Standalone per-agent settings — not part of the versioned config.
    callSummarySettings: (uuid: string) => `agents/${uuid}/call-summary-settings`,
    callSummaryTest: (uuid: string) => `agents/${uuid}/call-summary-settings/test`,
  },
  voices: {
    index: "voices",
    preview: (id: string) => `voices/${id}/preview`,
  },
  services: {
    index: "services",
    show: (uuid: string) => `services/${uuid}`,
  },
  products: {
    index: "products",
    show: (uuid: string) => `products/${uuid}`,
    importPreview: "products/import/preview",
    import: "products/import",
  },
  faqs: {
    index: "faqs",
    show: (uuid: string) => `faqs/${uuid}`,
    duplicate: (uuid: string) => `faqs/${uuid}/duplicate`,
  },
  faqCategories: {
    index: "faq-categories",
    show: (uuid: string) => `faq-categories/${uuid}`,
  },
  businessPolicies: {
    index: "business-policies",
    show: (uuid: string) => `business-policies/${uuid}`,
  },
  documents: {
    index: "documents",
    show: (uuid: string) => `documents/${uuid}`,
    file: (uuid: string) => `documents/${uuid}/file`,
  },
  integrations: {
    index: "integrations",
    providers: "integrations/providers",
    show: (uuid: string) => `integrations/${uuid}`,
  },
  members: {
    index: "members",
    show: (uuid: string) => `members/${uuid}`,
  },
  invitations: {
    index: "invitations",
    show: (uuid: string) => `invitations/${uuid}`,
    resend: (uuid: string) => `invitations/${uuid}/resend`,
  },
  roles: {
    index: "roles",
  },
  transferTargets: {
    index: "transfer-targets",
    setMode: "transfer-targets/set-mode",
    show: (uuid: string) => `transfer-targets/${uuid}`,
  },
  calendar: {
    businessSettings: "calendar/business-settings",
    // Per-member external calendar connections (self-scoped).
    connections: "calendar/connections",
    connection: (id: string) => `calendar/connections/${id}`,
    authorize: (provider: string) => `integrations/${provider}/authorize`,
    // The two toggleable calendar views (never merged) + bookable slots.
    systemView: "calendar/system-view",
    connectedView: "calendar/connected-view",
    slots: "calendar/slots",
  },
  extractions: {
    index: "extractions",
    show: (uuid: string) => `extractions/${uuid}`,
  },
  contacts: {
    index: "contacts",
    show: (uuid: string) => `contacts/${uuid}`,
    tags: "contacts/tags",
    bulk: "contacts/bulk",
    export: "contacts/export",
    importPreview: "contacts/import/preview",
    import: "contacts/import",
  },
  dnc: {
    index: "dnc",
    show: (uuid: string) => `dnc/${uuid}`,
    export: "dnc/export",
  },
  appointments: {
    // ⚠ index is unpaginated unless per_page is sent (then cursor pagination) —
    // constrain with from/to or paginate.
    index: "appointments",
    counts: "appointments/counts",
    show: (uuid: string) => `appointments/${uuid}`,
    confirm: (uuid: string) => `appointments/${uuid}/confirm`,
    complete: (uuid: string) => `appointments/${uuid}/complete`,
    noShow: (uuid: string) => `appointments/${uuid}/no-show`,
    cancel: (uuid: string) => `appointments/${uuid}/cancel`,
    reschedule: (uuid: string) => `appointments/${uuid}/reschedule`,
    reassign: (uuid: string) => `appointments/${uuid}/reassign`,
  },
  leads: {
    // ⚠ index is unpaginated unless per_page is sent (then cursor pagination).
    index: "leads",
    counts: "leads/counts",
    show: (uuid: string) => `leads/${uuid}`,
    activities: (uuid: string) => `leads/${uuid}/activities`,
  },
  quotes: {
    // ⚠ index is unpaginated unless per_page is sent (then cursor pagination).
    index: "quotes",
    counts: "quotes/counts",
    show: (uuid: string) => `quotes/${uuid}`,
    items: (uuid: string) => `quotes/${uuid}/items`,
    send: (uuid: string) => `quotes/${uuid}/send`,
    resend: (uuid: string) => `quotes/${uuid}/resend`,
    accept: (uuid: string) => `quotes/${uuid}/accept`,
    decline: (uuid: string) => `quotes/${uuid}/decline`,
    void: (uuid: string) => `quotes/${uuid}/void`,
    duplicate: (uuid: string) => `quotes/${uuid}/duplicate`,
    convertToInvoice: (uuid: string) => `quotes/${uuid}/convert-to-invoice`,
  },
  /** Unauthenticated accept-link surface — addressed by public_token, not uuid. */
  publicQuotes: {
    show: (token: string) => `public/quotes/${token}`,
    accept: (token: string) => `public/quotes/${token}/accept`,
    decline: (token: string) => `public/quotes/${token}/decline`,
  },
  jobs: {
    // ⚠ index is unpaginated unless per_page is sent (then cursor pagination).
    index: "jobs",
    counts: "jobs/counts",
    fromLead: "jobs/from-lead",
    fromQuote: "jobs/from-quote",
    show: (uuid: string) => `jobs/${uuid}`,
    activities: (uuid: string) => `jobs/${uuid}/activities`,
    lineItems: (uuid: string) => `jobs/${uuid}/line-items`,
    lineItem: (uuid: string, itemUuid: string) => `jobs/${uuid}/line-items/${itemUuid}`,
    photos: (uuid: string) => `jobs/${uuid}/photos`,
    photo: (uuid: string, mediaUuid: string) => `jobs/${uuid}/photos/${mediaUuid}`,
    schedule: (uuid: string) => `jobs/${uuid}/schedule`,
    reschedule: (uuid: string) => `jobs/${uuid}/reschedule`,
    start: (uuid: string) => `jobs/${uuid}/start`,
    complete: (uuid: string) => `jobs/${uuid}/complete`,
    cancel: (uuid: string) => `jobs/${uuid}/cancel`,
    reopen: (uuid: string) => `jobs/${uuid}/reopen`,
  },
  invoices: {
    // ⚠ index is unpaginated unless per_page is sent (then cursor pagination).
    index: "invoices",
    counts: "invoices/counts",
    fromJob: "invoices/from-job",
    show: (uuid: string) => `invoices/${uuid}`,
    items: (uuid: string) => `invoices/${uuid}/items`,
    send: (uuid: string) => `invoices/${uuid}/send`,
    markPaid: (uuid: string) => `invoices/${uuid}/mark-paid`,
    void: (uuid: string) => `invoices/${uuid}/void`,
    duplicate: (uuid: string) => `invoices/${uuid}/duplicate`,
  },
  calls: {
    index: "calls",
    show: (uuid: string) => `calls/${uuid}`,
    transcript: (uuid: string) => `calls/${uuid}/transcript`,
    extraction: (uuid: string) => `calls/${uuid}/extraction`,
    recording: (uuid: string) => `calls/${uuid}/recording`,
    related: (uuid: string) => `calls/${uuid}/related`,
    cancel: (uuid: string) => `calls/${uuid}/cancel`,
  },
  callbacks: {
    index: "callbacks",
    counts: "callbacks/counts",
    show: (uuid: string) => `callbacks/${uuid}`,
    reschedule: (uuid: string) => `callbacks/${uuid}/reschedule`,
    cancel: (uuid: string) => `callbacks/${uuid}/cancel`,
    complete: (uuid: string) => `callbacks/${uuid}/complete`,
  },
  campaigns: {
    index: "campaigns",
    show: (uuid: string) => `campaigns/${uuid}`,
    start: (uuid: string) => `campaigns/${uuid}/start`,
    pause: (uuid: string) => `campaigns/${uuid}/pause`,
    resume: (uuid: string) => `campaigns/${uuid}/resume`,
    cancel: (uuid: string) => `campaigns/${uuid}/cancel`,
    duplicate: (uuid: string) => `campaigns/${uuid}/duplicate`,
    recipients: (uuid: string) => `campaigns/${uuid}/recipients`,
    recipientsFromContacts: (uuid: string) => `campaigns/${uuid}/recipients/from-contacts`,
    recipientsImportPreview: (uuid: string) => `campaigns/${uuid}/recipients/import/preview`,
    recipientsImport: (uuid: string) => `campaigns/${uuid}/recipients/import`,
    recipientsBulkRetry: (uuid: string) => `campaigns/${uuid}/recipients/retry`,
    recipientsBulkDelete: (uuid: string) => `campaigns/${uuid}/recipients/delete`,
    recipientRetry: (uuid: string, recipientUuid: string) =>
      `campaigns/${uuid}/recipients/${recipientUuid}/retry`,
    recipient: (uuid: string, recipientUuid: string) =>
      `campaigns/${uuid}/recipients/${recipientUuid}`,
  },
  phoneNumbers: {
    index: "phone-numbers",
    available: "phone-numbers/available",
    sip: "phone-numbers/sip",
    show: (uuid: string) => `phone-numbers/${uuid}`,
    retry: (uuid: string) => `phone-numbers/${uuid}/retry`,
  },
  // Singleton per business — GET, POST (connect/reconnect) and DELETE share the path.
  sipConnection: {
    show: "sip-connection",
    rotate: "sip-connection/rotate",
  },
} as const;
