// Mocks are OFF by default — production-safe. Set VITE_USE_MOCK_API=true to opt
// in to the in-memory mock backend (typically in a local `.env.local`).
export const USE_MOCK_API =
  (import.meta.env.VITE_USE_MOCK_API ?? 'false').toString().toLowerCase() === 'true';

// Per-module overrides — set VITE_USE_MOCK_<MODULE>=true to keep mocks on for a
// single module while the rest of the app uses the real backend.
// When unset, falls back to the global USE_MOCK_API flag.
function moduleFlag(envValue: unknown): boolean {
  if (envValue === undefined || envValue === null) return USE_MOCK_API;
  return envValue.toString().toLowerCase() === 'true';
}

export const USE_MOCK_SCHOOLS = moduleFlag(import.meta.env.VITE_USE_MOCK_SCHOOLS);
