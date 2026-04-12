import { useAuthStore } from '@/stores/auth.store';

export function usePermission(permission: string): boolean {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  return permissions.includes(permission);
}

export function usePermissions(requiredPermissions: string[]): boolean {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  return requiredPermissions.every((p) => permissions.includes(p));
}
