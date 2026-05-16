/**
 * Expense Posting API — backend-swap point
 * Posts charges (books, uniform, fine, etc.) as debit entries to student ledgers.
 */
import { demoStudentsApi } from './students.api';

const D = 150;
const delay = <T>(data: T): Promise<T> => new Promise((r) => setTimeout(() => r(data), D));

export type ExpenseCategory = 'books' | 'uniform' | 'transport' | 'fine' | 'activity' | 'lab' | 'hostel' | 'other';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  class: string;
  amount: number;
  postedBy: string;
  ledgerEntryId?: string;
}

export interface PostExpenseDto {
  studentId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
}

// Mock DB — seed some entries
let expensesDb: Expense[] = [
  { id: 'exp-1', date: '2026-04-10', category: 'books', description: 'Science textbook — Class VIII', studentId: 'stu-1', studentName: 'Arjun Patel', admissionNo: 'ADM-2025-001', class: 'VIII-A', amount: 650, postedBy: 'Accounts' },
  { id: 'exp-2', date: '2026-04-09', category: 'uniform', description: 'Winter blazer replacement', studentId: 'stu-2', studentName: 'Priya Sharma', admissionNo: 'ADM-2025-002', class: 'VIII-A', amount: 1800, postedBy: 'Front Desk' },
  { id: 'exp-3', date: '2026-04-08', category: 'fine', description: 'Library book late return fine', studentId: 'stu-3', studentName: 'Rohan Gupta', admissionNo: 'ADM-2025-003', class: 'X-A', amount: 100, postedBy: 'Library' },
  { id: 'exp-4', date: '2026-04-07', category: 'activity', description: 'Science fair materials', studentId: 'stu-4', studentName: 'Ananya Iyer', admissionNo: 'ADM-2025-004', class: 'V-B', amount: 350, postedBy: 'Accounts' },
  { id: 'exp-5', date: '2026-04-05', category: 'transport', description: 'Extra bus trip — field visit', studentId: 'stu-5', studentName: 'Kabir Singh', admissionNo: 'ADM-2025-005', class: 'VIII-B', amount: 500, postedBy: 'Transport Dept' },
  { id: 'exp-6', date: '2026-04-04', category: 'lab', description: 'Chemistry lab breakage charge', studentId: 'stu-6', studentName: 'Meera Nair', admissionNo: 'ADM-2025-006', class: 'XII-A', amount: 250, postedBy: 'Lab Coordinator' },
  { id: 'exp-7', date: '2026-04-03', category: 'books', description: 'Workbook set — Term 2', studentId: 'stu-7', studentName: 'Dev Reddy', admissionNo: 'ADM-2025-007', class: 'II-A', amount: 420, postedBy: 'Accounts' },
  { id: 'exp-8', date: '2026-04-02', category: 'uniform', description: 'PE kit — new session', studentId: 'stu-8', studentName: 'Sneha Joshi', admissionNo: 'ADM-2024-089', class: 'X-B', amount: 950, postedBy: 'Front Desk' },
];

export const expenseApi = {
  getExpenses: (): Promise<Expense[]> => delay([...expensesDb]),

  postExpense: async (dto: PostExpenseDto): Promise<Expense> => {
    // Look up student
    const student = await demoStudentsApi.getStudent(dto.studentId);
    const today = new Date().toISOString().split('T')[0];

    const expense: Expense = {
      id: crypto.randomUUID(),
      date: today,
      category: dto.category,
      description: dto.description,
      studentId: dto.studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNo: student.admissionNo,
      class: `${student.class}-${student.section}`,
      amount: dto.amount,
      postedBy: 'Admin',
    };
    expensesDb = [expense, ...expensesDb];
    return delay(expense);
  },
};
