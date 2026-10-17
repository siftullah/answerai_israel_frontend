/** One entry of the fixed voice catalog. Fields are server-driven strings. */
export interface Voice {
  id: string;
  display_name: string;
  description: string;
  gender: string;
  accent: string;
  language: string;
}
