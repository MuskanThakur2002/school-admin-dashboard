// Flip to `false` (or set VITE_USE_MOCK_API=false) once the backend is wired up.
export const USE_MOCK_API =
  (import.meta.env.VITE_USE_MOCK_API ?? 'true').toString().toLowerCase() !== 'false';
