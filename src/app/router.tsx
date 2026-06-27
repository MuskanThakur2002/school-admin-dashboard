import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell/AppShell';
import { AuthGuard } from '@/guards/AuthGuard';
import { RoleGuard } from '@/guards/RoleGuard';
import { RequireActiveSchool } from '@/guards/RequireActiveSchool';
import { RequirePermission } from '@/guards/RequirePermission';
import { PERMISSIONS, ROLES } from '@/constants/permissions';
import { LoginPage } from '@/modules/auth/LoginPage';
import { Skeleton } from '@/components/ui/Skeleton/Skeleton';

function PageLoader() {
  return (
    <div className="space-y-4 p-page">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-6 w-96" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function lazyPage(importFn: () => Promise<{ default: React.ComponentType }>) {
  const Component = lazy(importFn);
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },

  {
    path: '/',
    element: <AuthGuard />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },

          // Tenants (super-admin only) — reachable even without an active school
          {
            path: 'tenants',
            element: <RoleGuard superAdminOnly />,
            children: [
              { index: true, element: lazyPage(() => import('@/modules/tenant/pages/TenantListPage')) },
              { path: ':id', element: lazyPage(() => import('@/modules/tenant/pages/TenantDetailPage')) },
            ],
          },

          // School-scoped routes — super admins must pick a school first
          {
            element: <RequireActiveSchool />,
            children: [
              // Dashboard — open to every authenticated user
              {
                path: 'dashboard',
                element: lazyPage(() => import('@/modules/dashboard/pages/DashboardPage')),
              },

              // Admissions
              {
                path: 'admissions',
                element: <RequirePermission permission={[PERMISSIONS.MANAGE_ENQUIRIES, PERMISSIONS.MANAGE_APPLICATIONS]} />,
                children: [
                  { index: true, element: lazyPage(() => import('@/modules/admissions/pages/AdmissionsHubPage')) },
                  { path: 'new', element: lazyPage(() => import('@/modules/admissions/pages/NewAdmissionPage')) },
                  { path: 'enquiries', element: lazyPage(() => import('@/modules/admissions/pages/EnquiryListPage')) },
                  { path: 'applications', element: lazyPage(() => import('@/modules/admissions/pages/ApplicationListPage')) },
                  { path: 'approvals', element: lazyPage(() => import('@/modules/admissions/pages/ApprovalWorkflowPage')) },
                ],
              },

              // Academic Setup
              {
                path: 'academic',
                element: <RequirePermission permission={[PERMISSIONS.MANAGE_CLASSES, PERMISSIONS.MANAGE_SUBJECTS, PERMISSIONS.MANAGE_TIMETABLE]} />,
                children: [
                  { index: true, element: lazyPage(() => import('@/modules/academic-setup/pages/AcademicHubPage')) },
                  { path: 'years', element: lazyPage(() => import('@/modules/academic-setup/pages/AcademicYearPage')) },
                  { path: 'classes', element: lazyPage(() => import('@/modules/academic-setup/pages/ClassSectionPage')) },
                  { path: 'subjects', element: lazyPage(() => import('@/modules/academic-setup/pages/SubjectMappingPage')) },
                  { path: 'timetable', element: lazyPage(() => import('@/modules/academic-setup/pages/TimetablePage')) },
                  { path: 'promotion', element: lazyPage(() => import('@/modules/academic-setup/pages/PromotionPage')) },
                  { path: 'houses', element: lazyPage(() => import('@/modules/academic-setup/pages/HouseGroupingPage')) },
                  { path: 'rollover', element: lazyPage(() => import('@/modules/academic-setup/pages/RolloverWizardPage')) },
                ],
              },

              // Students
              {
                element: <RequirePermission permission={PERMISSIONS.READ_STUDENT} blockRoles={[ROLES.PARENT]} />,
                children: [
                  { path: 'students', element: lazyPage(() => import('@/modules/students/pages/StudentListPage')) },
                  { path: 'students/:id', element: lazyPage(() => import('@/modules/students/pages/StudentProfilePage')) },
                ],
              },

              // Teachers
              {
                element: <RequirePermission permission={PERMISSIONS.READ_TEACHER} blockRoles={[ROLES.PARENT, ROLES.TEACHER]} />,
                children: [
                  { path: 'teachers', element: lazyPage(() => import('@/modules/teachers/pages/TeacherListPage')) },
                  { path: 'teachers/:id', element: lazyPage(() => import('@/modules/teachers/pages/TeacherProfilePage')) },
                ],
              },

              // Attendance (admin viewer — teachers mark via separate app)
              {
                path: 'attendance',
                element: <RequirePermission permission={PERMISSIONS.READ_ATTENDANCE} blockRoles={[ROLES.PARENT]} />,
                children: [{ index: true, element: lazyPage(() => import('@/modules/attendance/pages/AttendanceListPage')) }],
              },
              {
                path: 'teacher-attendance',
                element: <RequirePermission permission={PERMISSIONS.READ_TEACHER_ATTENDANCE} />,
                children: [{ index: true, element: lazyPage(() => import('@/modules/attendance/pages/TeacherAttendanceListPage')) }],
              },

              // Homework
              {
                element: <RequirePermission permission={PERMISSIONS.READ_HOMEWORK} blockRoles={[ROLES.PARENT]} />,
                children: [
                  { path: 'homework', element: lazyPage(() => import('@/modules/homework/pages/HomeworkListPage')) },
                  { path: 'homework/:id', element: lazyPage(() => import('@/modules/homework/pages/HomeworkDetailPage')) },
                ],
              },

              // Assessments & Marks (management — staff only)
              {
                path: 'assessments',
                element: <RequirePermission permission={PERMISSIONS.MANAGE_ASSESSMENTS} />,
                children: [
                  { index: true, element: lazyPage(() => import('@/modules/assessments/pages/AssessmentListPage')) },
                  { path: 'marks', element: lazyPage(() => import('@/modules/assessments/pages/MarksEntryPage')) },
                ],
              },

              // My Child (parent-only consolidated hub for their own child/children)
              {
                path: 'my-child',
                element: <RoleGuard roles={[ROLES.PARENT]} />,
                children: [
                  { index: true, element: lazyPage(() => import('@/modules/my-child/pages/MyChildPage')) },
                ],
              },

              // Results (parent-only read-only view of their own child's marks)
              {
                path: 'results',
                element: <RoleGuard roles={[ROLES.PARENT]} />,
                children: [
                  { index: true, element: lazyPage(() => import('@/modules/results/pages/ResultsPage')) },
                ],
              },

              // My Fees (parent-only read-only view of their own child's fee ledger)
              {
                path: 'my-fees',
                element: <RoleGuard roles={[ROLES.PARENT]} />,
                children: [
                  { index: true, element: lazyPage(() => import('@/modules/my-fees/pages/MyFeesPage')) },
                ],
              },

              // Parents — teachers hold READ_PARENT for scoped data but the
              // guardians directory is an admin page, so keep them out.
              {
                element: <RequirePermission permission={PERMISSIONS.READ_PARENT} blockRoles={[ROLES.TEACHER]} />,
                children: [
                  { path: 'parents', element: lazyPage(() => import('@/modules/parents/pages/ParentListPage')) },
                  { path: 'parents/:id', element: lazyPage(() => import('@/modules/parents/pages/ParentProfilePage')) },
                ],
              },

              // Fee Engine
              {
                path: 'fees',
                element: <RequirePermission permission={[PERMISSIONS.MANAGE_FEE_STRUCTURES, PERMISSIONS.MANAGE_FEE_ASSIGNMENTS]} />,
                children: [
                  { index: true, element: lazyPage(() => import('@/modules/fee-engine/pages/FeeStructurePage')) },
                  { path: 'structures', element: lazyPage(() => import('@/modules/fee-engine/pages/FeeStructurePage')) },
                  { path: 'heads', element: lazyPage(() => import('@/modules/fee-engine/pages/FeeHeadsPage')) },
                  { path: 'assignments', element: lazyPage(() => import('@/modules/fee-engine/pages/AssignmentsPage')) },
                  { path: 'installments', element: lazyPage(() => import('@/modules/fee-engine/pages/InstallmentPlanPage')) },
                  { path: 'concessions', element: lazyPage(() => import('@/modules/fee-engine/pages/ConcessionPage')) },
                  { path: 'late-fee', element: lazyPage(() => import('@/modules/fee-engine/pages/LateFeeConfigPage')) },
                  { path: 'adjustments', element: lazyPage(() => import('@/modules/fee-engine/pages/ManualAdjustmentPage')) },
                ],
              },

              // Ledger
              {
                element: <RequirePermission permission={PERMISSIONS.MANAGE_LEDGER} />,
                children: [
                  { path: 'ledger', element: lazyPage(() => import('@/modules/ledger/pages/LedgerListPage')) },
                  { path: 'ledger/:enrollmentId', element: lazyPage(() => import('@/modules/ledger/pages/StudentLedgerPage')) },
                  // Expenses
                  { path: 'expenses', element: lazyPage(() => import('@/modules/expenses/pages/ExpensePostingPage')) },
                ],
              },

              // Receipts
              {
                path: 'receipts',
                element: <RequirePermission permission={PERMISSIONS.COLLECT_FEES} />,
                children: [
                  { index: true, element: lazyPage(() => import('@/modules/receipts/pages/ReceiptListPage')) },
                  { path: 'post', element: lazyPage(() => import('@/modules/receipts/pages/PaymentPostingPage')) },
                ],
              },

              // Notifications
              {
                path: 'notifications',
                element: <RequirePermission permission={[PERMISSIONS.MANAGE_NOTIFICATIONS, PERMISSIONS.SEND_NOTIFICATIONS]} />,
                children: [
                  { index: true, element: lazyPage(() => import('@/modules/notifications/pages/TemplateListPage')) },
                  { path: 'templates', element: lazyPage(() => import('@/modules/notifications/pages/TemplateListPage')) },
                  { path: 'triggers', element: lazyPage(() => import('@/modules/notifications/pages/TriggerConfigPage')) },
                  { path: 'logs', element: lazyPage(() => import('@/modules/notifications/pages/DeliveryLogPage')) },
                ],
              },

              // Reports (no dedicated backend permission yet — left open)
              { path: 'reports', element: lazyPage(() => import('@/modules/reports/pages/ReportsDashboardPage')) },
              { path: 'reports/:reportId', element: lazyPage(() => import('@/modules/reports/pages/ReportViewerPage')) },

              // Settings
              {
                path: 'settings',
                element: <RequirePermission permission={PERMISSIONS.READ_ROLE} />,
                children: [
                  { index: true, element: lazyPage(() => import('@/modules/settings/pages/SettingsPage')) },
                  { path: 'users', element: lazyPage(() => import('@/modules/settings/pages/UsersPage')) },
                  { path: 'roles', element: lazyPage(() => import('@/modules/settings/pages/RolesPage')) },
                  { path: 'holidays', element: lazyPage(() => import('@/modules/settings/pages/HolidaysPage')) },
                  { path: 'payment-modes', element: lazyPage(() => import('@/modules/settings/pages/PaymentModesPage')) },
                  { path: 'document-types', element: lazyPage(() => import('@/modules/settings/pages/DocumentTypesPage')) },
                  { path: 'grading', element: lazyPage(() => import('@/modules/settings/pages/GradingRulesPage')) },
                  { path: 'communication', element: lazyPage(() => import('@/modules/settings/pages/CommunicationPage')) },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
