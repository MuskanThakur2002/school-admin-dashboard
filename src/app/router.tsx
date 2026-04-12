import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell/AppShell';
import { AuthGuard } from '@/guards/AuthGuard';
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

          // Dashboard
          {
            path: 'dashboard',
            element: lazyPage(() => import('@/modules/dashboard/pages/DashboardPage')),
          },

          // Admissions
          {
            path: 'admissions',
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
            children: [
              { index: true, element: lazyPage(() => import('@/modules/academic-setup/pages/AcademicHubPage')) },
              { path: 'years', element: lazyPage(() => import('@/modules/academic-setup/pages/AcademicYearPage')) },
              { path: 'classes', element: lazyPage(() => import('@/modules/academic-setup/pages/ClassSectionPage')) },
              { path: 'subjects', element: lazyPage(() => import('@/modules/academic-setup/pages/SubjectMappingPage')) },
              { path: 'timetable', element: lazyPage(() => import('@/modules/academic-setup/pages/TimetablePage')) },
              { path: 'promotion', element: lazyPage(() => import('@/modules/academic-setup/pages/PromotionPage')) },
            ],
          },

          // Students
          { path: 'students', element: lazyPage(() => import('@/modules/students/pages/StudentListPage')) },
          { path: 'students/:id', element: lazyPage(() => import('@/modules/students/pages/StudentProfilePage')) },

          // Fee Engine
          {
            path: 'fees',
            children: [
              { index: true, element: lazyPage(() => import('@/modules/fee-engine/pages/FeeStructurePage')) },
              { path: 'structures', element: lazyPage(() => import('@/modules/fee-engine/pages/FeeStructurePage')) },
              { path: 'heads', element: lazyPage(() => import('@/modules/fee-engine/pages/FeeHeadsPage')) },
              { path: 'installments', element: lazyPage(() => import('@/modules/fee-engine/pages/InstallmentPlanPage')) },
              { path: 'concessions', element: lazyPage(() => import('@/modules/fee-engine/pages/ConcessionPage')) },
              { path: 'late-fee', element: lazyPage(() => import('@/modules/fee-engine/pages/LateFeeConfigPage')) },
            ],
          },

          // Ledger
          { path: 'ledger', element: lazyPage(() => import('@/modules/ledger/pages/LedgerListPage')) },
          { path: 'ledger/:studentId', element: lazyPage(() => import('@/modules/ledger/pages/StudentLedgerPage')) },

          // Expenses
          { path: 'expenses', element: lazyPage(() => import('@/modules/expenses/pages/ExpensePostingPage')) },

          // Receipts
          {
            path: 'receipts',
            children: [
              { index: true, element: lazyPage(() => import('@/modules/receipts/pages/ReceiptListPage')) },
              { path: 'post', element: lazyPage(() => import('@/modules/receipts/pages/PaymentPostingPage')) },
              { path: 'reconciliation', element: lazyPage(() => import('@/modules/receipts/pages/ReconciliationPage')) },
            ],
          },

          // Notifications
          {
            path: 'notifications',
            children: [
              { index: true, element: lazyPage(() => import('@/modules/notifications/pages/TemplateListPage')) },
              { path: 'templates', element: lazyPage(() => import('@/modules/notifications/pages/TemplateListPage')) },
              { path: 'triggers', element: lazyPage(() => import('@/modules/notifications/pages/TriggerConfigPage')) },
              { path: 'logs', element: lazyPage(() => import('@/modules/notifications/pages/DeliveryLogPage')) },
            ],
          },

          // Reports
          { path: 'reports', element: lazyPage(() => import('@/modules/reports/pages/ReportsDashboardPage')) },

          // Tenants (super-admin)
          { path: 'tenants', element: lazyPage(() => import('@/modules/tenant/pages/TenantListPage')) },

          // Settings
          {
            path: 'settings',
            children: [
              { index: true, element: lazyPage(() => import('@/modules/settings/pages/SettingsPage')) },
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
]);
