import { useAuthStore } from '@/stores/auth.store';

/**
 * True if the user holds the given permission. When passed an array, returns
 * true if the user holds ANY of them (used by nav items / routes that are
 * reachable via more than one backend permission, e.g. Admissions).
 */
export function usePermission(permission: string | string[]): boolean {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const required = Array.isArray(permission) ? permission : [permission];
  return required.some((p) => permissions.includes(p));
}

/** True only if the user holds ALL of the given permissions. */
export function usePermissions(requiredPermissions: string[]): boolean {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  return requiredPermissions.every((p) => permissions.includes(p));
}
