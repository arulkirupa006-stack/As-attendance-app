import { Student, ClassSubject, AttendanceRecord } from '../types';
import { formatDateYYYYMMDD } from '../utils/timeUtils';

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_CLASSES: ClassSubject[] = [];

// Helper to generate realistic sample records for today and recent days
export function generateInitialRecords(): AttendanceRecord[] {
  return [];
}
