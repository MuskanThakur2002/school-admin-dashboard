// Flip to `false` (or set VITE_USE_MOCK_API=false) once the backend is wired up.
export const USE_MOCK_API =
  (import.meta.env.VITE_USE_MOCK_API ?? 'true').toString().toLowerCase() !== 'false';

// Per-module overrides — set VITE_USE_MOCK_<MODULE>=false to integrate one
// API at a time without exposing un-integrated modules to the real backend.
// When unset, falls back to the global USE_MOCK_API flag.
function moduleFlag(envValue: unknown): boolean {
  if (envValue === undefined || envValue === null) return USE_MOCK_API;
  return envValue.toString().toLowerCase() !== 'false';
}

export const USE_MOCK_SCHOOLS = moduleFlag(import.meta.env.VITE_USE_MOCK_SCHOOLS);
