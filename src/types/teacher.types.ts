export type TeacherStatus = 'active' | 'inactive' | 'on_leave';

export interface ClassAssignment {
  classShortName: string;
  sections: string[];
}

export interface Teacher {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  qualification: string;
  specialization?: string;
  joiningDate: string;
  subjects: string[];
  classAssignments: ClassAssignment[];
  status: TeacherStatus;
  address: string;
  city: string;
  state: string;
  pincode: string;
  avatar?: string;
  emergencyContact?: string;
  bloodGroup?: string;
}
