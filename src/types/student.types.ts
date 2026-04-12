export interface Student {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  class: string;
  section: string;
  rollNo: number;
  bloodGroup?: string;
  religion?: string;
  category?: string;
  nationality: string;
  motherTongue?: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  parents?: ParentGuardian[];
  address: string;
  city: string;
  state: string;
  pincode: string;
  transportRoute?: string;
  medicalNotes?: string;
  previousSchool?: string;
  siblingIds?: string[];
  status: 'active' | 'inactive' | 'alumni' | 'tc_issued';
  joinDate: string;
  avatar?: string;
}

export interface ParentGuardian {
  id: string;
  name: string;
  relation: 'father' | 'mother' | 'guardian';
  phone: string;
  email?: string;
  occupation?: string;
  annualIncome?: string;
}
