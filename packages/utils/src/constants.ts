/** Application name */
export const APP_NAME = 'Teras Lmbur OS' as const;

/** Default pagination settings */
export const PAGINATION_DEFAULTS = {
  page: 1,
  pageSize: 20,
  maxPageSize: 100,
} as const;

/** Token storage keys */
export const TOKEN_KEYS = {
  accessToken: 'teras_lmbur_access_token',
  refreshToken: 'teras_lmbur_refresh_token',
} as const;

/** Theme storage key */
export const THEME_KEY = 'teras_lmbur_theme' as const;

/** Sidebar storage key */
export const SIDEBAR_KEY = 'teras_lmbur_sidebar_collapsed' as const;
