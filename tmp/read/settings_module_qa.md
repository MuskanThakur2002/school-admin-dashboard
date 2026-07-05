# Settings Module QA (2026-06-24)

Walked all 7 sub-section pages + settings.store.ts + roles.api.ts. Logged BUG-025..037 in bugs/Settings Bugs.

Key architecture facts found:
- Only **Roles** is real/school-scoped: settings.store.ts -> rolesApi (resolveSchoolId via auth.store activeSchoolId/schoolId). Role type has NO isSystem flag, DELETE unguarded.
- Holidays / PaymentModes / DocTypes / Grades / Channels are **module-level mutable arrays** (holidaysDb etc.) — NOT tenant-scoped, shared across all schools (BUG-026). When backend lands, these need school scoping + persistence.
- Recurring pattern bug: every Add modal does `if(!field) return;` with no inline validation (BUG-029) — matches earlier BUG-006..010 forms.
- DocTypes modal only captures name+required (size/formats hardcoded). PaymentModes can't set requiresReference. Holidays can't set recurring + formType not reset.
- Communication is read-only: "Edit Settings" = "Coming soon" toast only.
- Grading has no range validation; max<min -> negative flex width breaks Grade Scale visual.

Bug-doc format: TSV, columns = Bug ID, Severity, Role, Module, Title, Description, URL/Path, Steps to Reproduce, Expected, Actual, Status. IDs continue globally across files (All Bugs ended BUG-024; Settings = BUG-025+).
