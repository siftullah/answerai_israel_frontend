/** Mirrors app/Enums/ModuleKey.php */
export type ModuleKey = "appointments" | "leads" | "quotes" | "jobs" | "invoices" | "callbacks";

/** Mirrors app/Http/Resources/BusinessModuleResource.php */
export interface BusinessModule {
  key: ModuleKey;
  enabled: boolean;
  /** Agent-tool keys the module contributes when enabled. */
  tools: string[];
}
