/** Laravel cursor-paginated collection envelope (calls index; more to come). */
export interface CursorPaginated<T> {
  data: T[];
  meta: {
    path: string;
    per_page: number;
    next_cursor: string | null;
    prev_cursor: string | null;
  };
}
