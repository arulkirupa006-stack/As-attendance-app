export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';

export type UserRole = 'ADMIN' | 'TEACHER';

export interface SchoolConfig {
  name: string;
  nameLine1?: string;
  nameLine2?: string;
  logo: string; // Image URL, base64 data URL, or SVG
  tagline?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  password: string; // Plain password for simple authentication
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  avatar?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  studentId: string; // e.g. "STU-2026-001"
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  grade: string;
  rollNumber: string;
  notes?: string;
}

export interface ClassSubject {
  id: string;
  name: string; // e.g. "Grade 10" or "Grade 10 - Section A"
  section?: string; // e.g. "Section A"
  code: string; // e.g. "G10-A"
  classTeacherId?: string; // Teacher assigned as Class Teacher
  classTeacherName?: string; // Display name of assigned Class Teacher
  periods?: Period[]; // The 8 specific periods configured for this class
  instructor?: string;
  room?: string;
  startTime?: string; // e.g. "09:00" (24h format)
  endTime?: string;   // e.g. "10:30"
  gracePeriodMins?: number; // e.g. 10
  daysOfWeek: string[]; // e.g. ["Mon", "Wed", "Fri"]
  studentIds: string[];
}

export interface Period {
  id: string;
  name: string;
  startTime: string; // "09:00" (24h format)
  endTime: string;   // "09:40" (24h format)
  durationMins?: number; // e.g. 40
  assignedTeacherId?: string; // Mapped teacher user account id
  subjectName?: string; // Optional course or subject title
  room?: string; // Classroom or lab room
}

export const DEFAULT_PERIODS: Period[] = [
  { id: 'p1', name: 'Period 1', startTime: '09:00', endTime: '09:40', durationMins: 40, assignedTeacherId: 'user-teacher-1', subjectName: 'Mathematics' },
  { id: 'p2', name: 'Period 2', startTime: '09:40', endTime: '10:20', durationMins: 40, assignedTeacherId: 'user-teacher-2', subjectName: 'English Language' },
  { id: 'p3', name: 'Period 3', startTime: '10:20', endTime: '11:00', durationMins: 40, assignedTeacherId: 'user-teacher-3', subjectName: 'Physics' },
  { id: 'p4', name: 'Period 4', startTime: '11:00', endTime: '11:40', durationMins: 40, assignedTeacherId: 'user-teacher-4', subjectName: 'Computer Science' },
  { id: 'p5', name: 'Period 5', startTime: '11:40', endTime: '12:20', durationMins: 40, assignedTeacherId: 'user-teacher-1', subjectName: 'Algebra II' },
  { id: 'p6', name: 'Period 6', startTime: '13:00', endTime: '13:40', durationMins: 40, assignedTeacherId: 'user-teacher-2', subjectName: 'World Literature' },
  { id: 'p7', name: 'Period 7', startTime: '13:40', endTime: '14:20', durationMins: 40, assignedTeacherId: 'user-teacher-3', subjectName: 'Chemistry' },
  { id: 'p8', name: 'Period 8', startTime: '14:20', endTime: '15:00', durationMins: 40, assignedTeacherId: 'user-teacher-4', subjectName: 'Robotics' },
];

export function getActivePeriod(periods: Period[], dateObj: Date = new Date()): Period {
  if (!periods || periods.length === 0) return DEFAULT_PERIODS[0];
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`;

  const matched = periods.find(p => currentTimeStr >= p.startTime && currentTimeStr < p.endTime);
  return matched || periods[0];
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string; // "YYYY-MM-DD"
  periodId?: string; // "p1", "p2", etc.
  checkInTime: string | null; // e.g. "09:05 AM"
  checkOutTime?: string | null; // e.g. "10:28 AM"
  status: AttendanceStatus;
  minutesLate: number; // 0 if on-time, positive if late
  notes?: string;
  updatedAt: string; // ISO string
}

export interface AttendanceStats {
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  attendancePercentage: number;
  punctualityRate: number;
  avgMinutesLate: number;
}
