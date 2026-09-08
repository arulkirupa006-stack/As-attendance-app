import { AttendanceRecord, ClassSubject, AttendanceStatus } from '../types';

// Format current time as "09:05:22 AM" or "09:05 AM"
export function formatTime12h(date: Date = new Date(), includeSeconds = false): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12; // hour '0' should be '12'
  
  const minStr = minutes < 10 ? '0' + minutes : minutes;
  const secStr = seconds < 10 ? '0' + seconds : seconds;
  
  if (includeSeconds) {
    return `${hours < 10 ? '0' + hours : hours}:${minStr}:${secStr} ${ampm}`;
  }
  return `${hours < 10 ? '0' + hours : hours}:${minStr} ${ampm}`;
}

// Format 24h string "09:00" to 12h "9:00 AM"
export function format24hTo12h(time24: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h}:${m < 10 ? '0' + m : m} ${ampm}`;
}

// Convert date to YYYY-MM-DD
export function formatDateYYYYMMDD(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Display date string like "Monday, Aug 9, 2026"
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Calculate how many minutes late checkInTime is relative to class startTime ("09:00")
export function calculateMinutesLate(checkIn12h: string, classStartTime24: string): number {
  if (!checkIn12h || !classStartTime24) return 0;
  
  try {
    // Parse checkIn12h e.g. "09:14 AM" or "09:14:22 AM"
    const match = checkIn12h.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)/i);
    if (!match) return 0;
    
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    const checkInTotalMins = hours * 60 + minutes;
    
    // Parse classStartTime24 e.g. "09:00"
    const [startH, startM] = classStartTime24.split(':').map(Number);
    const startTotalMins = startH * 60 + startM;
    
    const diff = checkInTotalMins - startTotalMins;
    return diff > 0 ? diff : 0;
  } catch (e) {
    return 0;
  }
}

// Determine status automatically based on checkInTime & Class grace period
export function determineAutoStatus(
  checkIn12h: string,
  classStartTime24: string,
  gracePeriodMins: number = 10
): { status: AttendanceStatus; minutesLate: number } {
  const minsLate = calculateMinutesLate(checkIn12h, classStartTime24);
  if (minsLate > gracePeriodMins) {
    return { status: 'LATE', minutesLate: minsLate };
  }
  return { status: 'PRESENT', minutesLate: 0 };
}

// Generate CSV data for export
export function generateAttendanceCSV(
  records: AttendanceRecord[],
  studentsMap: Map<string, any>,
  classesMap: Map<string, ClassSubject>
): string {
  const headers = ['Date', 'Class Code', 'Class Name', 'Student ID', 'Roll No', 'Student Name', 'Status', 'Check-In Time', 'Check-Out Time', 'Minutes Late', 'Notes'];
  
  const rows = records.map(r => {
    const student = studentsMap.get(r.studentId);
    const cls = classesMap.get(r.classId);
    
    return [
      r.date,
      cls ? cls.code : r.classId,
      cls ? `"${cls.name}"` : '',
      student ? student.studentId : r.studentId,
      student ? student.rollNumber : '',
      student ? `"${student.name}"` : 'Unknown',
      r.status,
      r.checkInTime || 'N/A',
      r.checkOutTime || 'N/A',
      r.minutesLate || 0,
      r.notes ? `"${r.notes.replace(/"/g, '""')}"` : ''
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
