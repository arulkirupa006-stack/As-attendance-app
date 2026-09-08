import * as XLSX from 'xlsx';
import { Student, UserAccount } from '../types';

export interface ParseResult {
  students: Student[];
  errors: string[];
  totalRows: number;
  fileName: string;
}

export interface ParseTeacherResult {
  teachers: Partial<UserAccount>[];
  errors: string[];
  totalRows: number;
  fileName: string;
}

/**
 * Normalizes header string for fuzzy key matching
 */
function normalizeHeader(header: string): string {
  return header.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

/**
 * Parses an uploaded Excel (.xlsx, .xls) or CSV file and extracts student records.
 */
export async function parseExcelStudentFile(file: File, defaultGrade: string = 'Grade 10-A'): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          return resolve({ students: [], errors: ['File reading returned empty data.'], totalRows: 0, fileName: file.name });
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          return resolve({ students: [], errors: ['No worksheets found in the Excel file.'], totalRows: 0, fileName: file.name });
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          return resolve({ students: [], errors: ['The uploaded file appears to be empty or contains no readable rows.'], totalRows: 0, fileName: file.name });
        }

        const parsedStudents: Student[] = [];
        const errors: string[] = [];
        const timestamp = Date.now();

        rawJson.forEach((row: any, index: number) => {
          const rowNum = index + 2; // 1-indexed header + 1
          
          // Map dynamic header names
          let nameVal = '';
          let rollVal = '';
          let idVal = '';
          let gradeVal = '';
          let emailVal = '';
          let phoneVal = '';
          let notesVal = '';

          // Look through keys of row
          Object.keys(row).forEach(key => {
            const normKey = normalizeHeader(key);
            const rawVal = String(row[key] ?? '').trim();

            if (
              normKey.includes('name') || 
              normKey.includes('studentname') || 
              normKey.includes('fullname') ||
              normKey === 'student'
            ) {
              if (!nameVal) nameVal = rawVal;
            } else if (
              normKey.includes('roll') || 
              normKey.includes('rollno') || 
              normKey.includes('rollnumber') || 
              normKey === 'sno' || 
              normKey === 'serialno'
            ) {
              if (!rollVal) rollVal = rawVal;
            } else if (
              normKey.includes('studentid') || 
              normKey.includes('stuid') || 
              normKey === 'id' || 
              normKey.includes('admissionno') || 
              normKey.includes('regno')
            ) {
              if (!idVal) idVal = rawVal;
            } else if (
              normKey.includes('grade') || 
              normKey.includes('class') || 
              normKey.includes('section') || 
              normKey.includes('standard')
            ) {
              if (!gradeVal) gradeVal = rawVal;
            } else if (
              normKey.includes('email') || 
              normKey.includes('mail')
            ) {
              if (!emailVal) emailVal = rawVal;
            } else if (
              normKey.includes('phone') || 
              normKey.includes('mobile') || 
              normKey.includes('contact') || 
              normKey.includes('parent')
            ) {
              if (!phoneVal) phoneVal = rawVal;
            } else if (
              normKey.includes('note') || 
              normKey.includes('remark') || 
              normKey.includes('address') || 
              normKey.includes('tag') ||
              normKey.includes('comment')
            ) {
              if (!notesVal) notesVal = rawVal;
            }
          });

          // Fallback if header mapping failed (try array indexing or row fallback)
          if (!nameVal && Object.values(row).length > 0) {
            // First column value as name if non-empty
            const vals = Object.values(row).map(v => String(v ?? '').trim()).filter(Boolean);
            if (vals.length > 0) {
              nameVal = vals[0];
              if (vals.length > 1 && !rollVal) rollVal = vals[1];
            }
          }

          if (!nameVal) {
            errors.push(`Row ${rowNum}: Skipped because no student name was found.`);
            return;
          }

          // Generate clean fallback values if missing
          const cleanRoll = rollVal || `${100 + index + 1}`;
          const cleanId = idVal || `STU-EXCEL-${(index + 1).toString().padStart(3, '0')}`;
          const cleanGrade = gradeVal || defaultGrade;
          const cleanEmail = emailVal || `${nameVal.toLowerCase().replace(/[^a-z]/g, '')}${cleanRoll}@school.edu`;
          const cleanAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nameVal + '-' + index)}`;

          parsedStudents.push({
            id: `stu-excel-${timestamp}-${index + 1}-${Math.random().toString(36).substring(2, 6)}`,
            studentId: cleanId,
            name: nameVal,
            email: cleanEmail,
            phone: phoneVal || undefined,
            grade: cleanGrade,
            rollNumber: cleanRoll,
            notes: notesVal || undefined,
            avatar: cleanAvatar
          });
        });

        resolve({
          students: parsedStudents,
          errors,
          totalRows: rawJson.length,
          fileName: file.name
        });

      } catch (err: any) {
        resolve({
          students: [],
          errors: [`Failed to parse Excel file: ${err.message || 'Invalid format'}`],
          totalRows: 0,
          fileName: file.name
        });
      }
    };

    reader.onerror = () => {
      resolve({
        students: [],
        errors: ['Error reading file from disk.'],
        totalRows: 0,
        fileName: file.name
      });
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Downloads a pre-formatted sample Excel file (.xlsx) with standard column headers.
 */
export function downloadSampleExcelTemplate() {
  const sampleData = [
    {
      "Student Name": "Alexander Wright",
      "Roll Number": "101",
      "Student ID": "STU-2026-101",
      "Grade / Section": "Grade 10-A",
      "Email Address": "alexander.wright@school.edu",
      "Parent Phone": "+1 (555) 234-5678",
      "Notes & Clubs": "Robotics Club Captain"
    },
    {
      "Student Name": "Brianna Lopez",
      "Roll Number": "102",
      "Student ID": "STU-2026-102",
      "Grade / Section": "Grade 10-A",
      "Email Address": "brianna.lopez@school.edu",
      "Parent Phone": "+1 (555) 345-6789",
      "Notes & Clubs": "Honor Roll"
    },
    {
      "Student Name": "Caleb Montgomery",
      "Roll Number": "103",
      "Student ID": "STU-2026-103",
      "Grade / Section": "Grade 10-B",
      "Email Address": "caleb.montgomery@school.edu",
      "Parent Phone": "+1 (555) 456-7890",
      "Notes & Clubs": "School Bus Route 4"
    },
    {
      "Student Name": "David Chen",
      "Roll Number": "104",
      "Student ID": "STU-2026-104",
      "Grade / Section": "Grade 11-A",
      "Email Address": "david.chen@school.edu",
      "Parent Phone": "+1 (555) 567-8901",
      "Notes & Clubs": "Math Olympiad"
    },
    {
      "Student Name": "Elena Rostova",
      "Roll Number": "105",
      "Student ID": "STU-2026-105",
      "Grade / Section": "Grade 12-A",
      "Email Address": "elena.rostova@school.edu",
      "Parent Phone": "+1 (555) 678-9012",
      "Notes & Clubs": "Student Council President"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  
  // Set column widths for nice formatting
  worksheet['!cols'] = [
    { wch: 22 }, // Student Name
    { wch: 14 }, // Roll Number
    { wch: 16 }, // Student ID
    { wch: 16 }, // Grade
    { wch: 28 }, // Email
    { wch: 18 }, // Phone
    { wch: 25 }  // Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Student Roster");

  XLSX.writeFile(workbook, "Student_Attendance_Roster_Template.xlsx");
}

/**
 * Parses an uploaded Excel (.xlsx, .xls) or CSV file and extracts teacher accounts.
 */
export async function parseExcelTeacherFile(file: File): Promise<ParseTeacherResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          return resolve({ teachers: [], errors: ['File reading returned empty data.'], totalRows: 0, fileName: file.name });
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          return resolve({ teachers: [], errors: ['No worksheets found in the Excel file.'], totalRows: 0, fileName: file.name });
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          return resolve({ teachers: [], errors: ['The uploaded file appears to be empty or contains no readable rows.'], totalRows: 0, fileName: file.name });
        }

        const parsedTeachers: Partial<UserAccount>[] = [];
        const errors: string[] = [];

        rawJson.forEach((row: any, index: number) => {
          const rowNum = index + 2; 
          
          let nameVal = '';
          let usernameVal = '';
          let emailVal = '';
          let deptVal = '';
          let passVal = '';

          Object.keys(row).forEach(key => {
            const normKey = normalizeHeader(key);
            const rawVal = String(row[key] ?? '').trim();

            if (normKey.includes('name') && !normKey.includes('user')) {
              if (!nameVal) nameVal = rawVal;
            } else if (normKey.includes('user') || normKey.includes('login') || normKey === 'id') {
              if (!usernameVal) usernameVal = rawVal;
            } else if (normKey.includes('email') || normKey.includes('mail')) {
              if (!emailVal) emailVal = rawVal;
            } else if (normKey.includes('dept') || normKey.includes('department') || normKey.includes('subject') || normKey.includes('class')) {
              if (!deptVal) deptVal = rawVal;
            } else if (normKey.includes('pass') || normKey.includes('pwd')) {
              if (!passVal) passVal = rawVal;
            }
          });

          // Fallbacks
          if (!nameVal && Object.values(row).length > 0) {
            const vals = Object.values(row).map(v => String(v ?? '').trim()).filter(Boolean);
            if (vals.length > 0) {
              nameVal = vals[0];
            }
          }

          if (!nameVal) {
            errors.push(`Row ${rowNum}: Skipped because no teacher name was found.`);
            return;
          }

          const cleanUsername = usernameVal || nameVal.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanEmail = emailVal || `${cleanUsername}@school.edu`;
          const cleanDept = deptVal || 'General Faculty';
          const cleanPass = passVal || 'password123';

          parsedTeachers.push({
            name: nameVal,
            username: cleanUsername,
            email: cleanEmail,
            department: cleanDept,
            password: cleanPass,
            role: 'TEACHER'
          });
        });

        resolve({
          teachers: parsedTeachers,
          errors,
          totalRows: rawJson.length,
          fileName: file.name
        });

      } catch (err: any) {
        resolve({
          teachers: [],
          errors: [`Failed to parse Excel file: ${err.message || 'Invalid format'}`],
          totalRows: 0,
          fileName: file.name
        });
      }
    };

    reader.onerror = () => {
      resolve({
        teachers: [],
        errors: ['Error reading file from disk.'],
        totalRows: 0,
        fileName: file.name
      });
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Downloads a pre-formatted sample Excel file (.xlsx) for teachers.
 */
export function downloadSampleTeacherExcelTemplate() {
  const sampleData = [
    {
      "Teacher Name": "Alice Johnson",
      "Username": "ajohnson",
      "Email Address": "alice.j@school.edu",
      "Department / Subject": "Mathematics",
      "Temporary Password": "password123"
    },
    {
      "Teacher Name": "Bob Smith",
      "Username": "bsmith",
      "Email Address": "bob.s@school.edu",
      "Department / Subject": "Physics",
      "Temporary Password": "password123"
    },
    {
      "Teacher Name": "Carol Davis",
      "Username": "cdavis",
      "Email Address": "carol.d@school.edu",
      "Department / Subject": "English",
      "Temporary Password": "password123"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  
  worksheet['!cols'] = [
    { wch: 22 }, // Name
    { wch: 15 }, // Username
    { wch: 25 }, // Email
    { wch: 25 }, // Department
    { wch: 20 }  // Password
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Teachers");
  XLSX.writeFile(workbook, "Teacher_Import_Template.xlsx");
}
