// ============================================================
// Common Types — Teras Lmbur OS
// ============================================================
// Shared API contracts, pagination, sorting, and filtering
// used across all domains.
// ============================================================

/** Standard API response envelope */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

/** Paginated API response */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Pagination query parameters */
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

/** Sort direction */
export type SortOrder = 'asc' | 'desc';

/** Sort query parameter */
export interface SortQuery {
  sortBy?: string;
  sortOrder?: SortOrder;
}

/** Search query parameter */
export interface SearchQuery {
  search?: string;
}

/** Combined list query */
export type ListQuery = PaginationQuery & SortQuery & SearchQuery;

/** API error response */
export interface ApiError {
  success: false;
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
  timestamp: string;
  path?: string;
}

/** Navigation item for sidebar */
export interface NavItem {
  title: string;
  href: string;
  icon: string;
  permission?: string;
  badge?: string | number;
  children?: NavItem[];
}

/** Navigation section grouping */
export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Trend direction for stat cards */
export type TrendDirection = 'up' | 'down' | 'neutral';

/** Dashboard stat card data */
export interface StatCardData {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: TrendDirection;
    label: string;
  };
  icon: string;
}
