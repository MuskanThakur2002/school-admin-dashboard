import { useEffect, useMemo } from 'react';
import { useAcademicStore } from '@/stores/academic.store';
import { classOptions as fallbackClassOptions } from '@/utils/constants';
import type { FilterOption } from '@/types/common.types';

/**
 * Returns class options sourced from the Academic Setup store.
 * Auto-fetches classes on first call.
 *
 * Falls back to the hardcoded `classOptions` constant if the store is empty
 * (e.g. before the first load completes).
 *
 * Used by:
 *   - NewAdmissionPage (Class Applied dropdown)
 *   - any other form that needs a class selector
 */
export function useClassOptions(): FilterOption[] {
  const classes = useAcademicStore((s) => s.classes);
  const fetchClasses = useAcademicStore((s) => s.fetchClasses);

  useEffect(() => {
    if (classes.length === 0) fetchClasses();
  }, [classes.length, fetchClasses]);

  return useMemo(() => {
    if (classes.length === 0) return fallbackClassOptions;
    return classes.map((c) => ({
      label: c.name,
      value: c.shortName,
    }));
  }, [classes]);
}
