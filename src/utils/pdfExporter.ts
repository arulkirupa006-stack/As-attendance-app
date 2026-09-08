import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, ClassSubject, AttendanceRecord, UserAccount, Period } from '../types';
import { formatDisplayDate } from './timeUtils';

export interface PDFExportOptions {
  schoolName?: string;
  schoolLogo?: string;
  currentClass: ClassSubject;
  selectedDate: string; // "YYYY-MM-DD"
  students: Student[];
  records: AttendanceRecord[];
  currentUser: UserAccount | null;
  period?: Period;
}

/**
 * Generates and triggers download of an official EMIS PDF Attendance Register
 */
export function exportAttendanceToPDF(options: PDFExportOptions) {
  const schoolName = options.schoolName || 'EMIS School Attendance';
  const schoolLogo = options.schoolLogo;
  const currentClass = options.currentClass;
  const selectedDate = options.selectedDate;
  const students = options.students;
  const records = options.records;
  const currentUser = options.currentUser;
  const period = options.period;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const displayDateStr = formatDisplayDate(selectedDate);
  const nowStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  // Filter students belonging to this class
  const classStudents = students.filter(s => currentClass.studentIds.includes(s.id));
  const recordMap = new Map<string, AttendanceRecord>();
  records.forEach(r => {
    if (period) {
      if (r.periodId === period.id || (!r.periodId && period.id === 'p1')) {
        recordMap.set(r.studentId, r);
      }
    } else {
      recordMap.set(r.studentId, r);
    }
  });

  // Calculate statistics
  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;
  let excusedCount = 0;

  classStudents.forEach(stu => {
    const rec = recordMap.get(stu.id);
    const status = rec?.status || 'ABSENT';
    if (status === 'PRESENT') presentCount++;
    else if (status === 'LATE') lateCount++;
    else if (status === 'ABSENT') absentCount++;
    else if (status === 'EXCUSED') excusedCount++;
  });

  const totalStudents = classStudents.length;
  const attendanceRate = totalStudents > 0 
    ? Math.round(((presentCount + lateCount) / totalStudents) * 100) 
    : 0;

  // ==========================================
  // 1. INSTITUTIONAL HEADER & EMBEDDED CREST
  // ==========================================
  // Header Banner Background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 36, 'F');

  // Draw School Logo / Crest ON THE TOP RIGHT (Requested by user)
  const logoX = 174;
  const logoY = 5;
  const logoW = 22;
  const logoH = 24;
  let drewCustomLogo = false;

  if (schoolLogo && typeof schoolLogo === 'string' && (schoolLogo.startsWith('data:image') || schoolLogo.startsWith('http') || schoolLogo.startsWith('/'))) {
    try {
      doc.addImage(schoolLogo, 'PNG', logoX, logoY, logoW, logoH);
      drewCustomLogo = true;
    } catch {
      drewCustomLogo = false;
    }
  }

  if (!drewCustomLogo) {
    // Draw Clean Geometric Institutional Shield / Crest on Top Right (Fallback)
    doc.setFillColor(79, 70, 229); // indigo-600
    doc.roundedRect(logoX, logoY, logoW, logoH, 3, 3, 'F');
    
    // Inner crest detail (Emblem)
    doc.setFillColor(255, 255, 255);
    doc.rect(logoX + 4.5, logoY + 6, 4, 12, 'F');
    doc.rect(logoX + 11.5, logoY + 6, 4, 12, 'F');
    // Gold peak
    doc.setFillColor(251, 191, 36); // amber-400
    doc.circle(logoX + 10, logoY + 4.5, 2, 'F');
  }

  // Left Top Header: School Name (Spans two lines if configured), Chosen Class Name & Period
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  
  const isTeacher = currentUser?.role === 'TEACHER';

  // Support two-line or single-line school name cleanly
  const schoolLines = doc.splitTextToSize(schoolName, 105);
  if (schoolLines.length > 1) {
    doc.setFontSize(12);
    doc.text(schoolLines[0], 14, 10);
    doc.text(schoolLines[1], 14, 15);
  } else {
    doc.setFontSize(14);
    doc.text(schoolName, 14, 11);
  }

  // PROMINENTLY DISPLAY CHOSEN CLASS NAME IN HEADER (Only if Teacher portal)
  const classBannerY = schoolLines.length > 1 ? 21 : 18;
  if (isTeacher) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(52, 211, 153); // emerald-400
    doc.text(`CLASS: ${currentClass.name.toUpperCase()} (${currentClass.code})`, 14, classBannerY);
  }

  // Period and Register Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(199, 210, 254); // indigo-200
  const periodText = (isTeacher && period)
    ? `${period.name}: ${period.subjectName || 'General'} (${period.startTime}–${period.endTime})` 
    : 'Daily Attendance Register';
  const subLineY = isTeacher ? classBannerY + 5.5 : classBannerY;
  doc.text(`Official Attendance Register • ${periodText}`, 14, subLineY);

  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFontSize(7);
  doc.text('Ministry of Education EMIS Standard Compliance • Verified Daily Record', 14, subLineY + 5);

  // Right Top Date & Time Badge (Positioned left of the Top-Right Logo)
  doc.setFillColor(30, 41, 59); // slate-800
  doc.roundedRect(122, 6, 48, 22, 2, 2, 'F');
  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`DATE: ${selectedDate}`, 125, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(displayDateStr, 125, 17);
  doc.setTextColor(148, 163, 184);
  doc.text(`Printed: ${nowStr}`, 125, 23);

  // ==========================================
  // 2. METADATA SECTION (Compact, No Extra Space)
  // ==========================================
  let currentY = 41;

  // Metadata Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, currentY, 182, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  if (isTeacher) {
    doc.text(`Class/Grade: ${currentClass.name}`, 18, currentY + 6);
    const periodTimings = period 
      ? `Period: ${period.name} (${period.startTime} – ${period.endTime})`
      : `Course Code: ${currentClass.code}`;
    doc.text(periodTimings, 105, currentY + 6);
  } else {
    doc.text(`Record Type: Administrative Master Register`, 18, currentY + 6);
    doc.text(`Scope: All Enrolled Students`, 105, currentY + 6);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const operator = currentUser?.role === 'TEACHER'
    ? `Class Teacher: ${currentUser.name}${currentUser.department ? ` (${currentUser.department})` : ''}`
    : (currentUser ? `Logged By: ${currentUser.name} (${currentUser.role})` : 'Logged By: Administrator');
  doc.text(`Enrolled: ${totalStudents} Students`, 18, currentY + 12);
  doc.text(operator, 105, currentY + 12);

  // ==========================================
  // 3. STATS SUMMARY BOXES (Compact 14mm Height)
  // ==========================================
  currentY += 19;
  const boxWidth = 28;
  const boxHeight = 12;
  const boxGap = 2.8;
  let startX = 14;

  const statBoxes = [
    { label: 'Total Enrolled', val: `${totalStudents}`, color: [241, 245, 249], textCol: [30, 41, 59] },
    { label: 'Present', val: `${presentCount}`, color: [220, 252, 231], textCol: [22, 101, 52] },
    { label: 'Late', val: `${lateCount}`, color: [254, 243, 199], textCol: [146, 64, 14] },
    { label: 'Absent', val: `${absentCount}`, color: [254, 226, 226], textCol: [153, 27, 27] },
    { label: 'Excused', val: `${excusedCount}`, color: [224, 231, 255], textCol: [55, 48, 163] },
    { label: 'Rate %', val: `${attendanceRate}%`, color: [240, 253, 250], textCol: [15, 118, 110] },
  ];

  statBoxes.forEach(box => {
    doc.setFillColor(box.color[0], box.color[1], box.color[2]);
    doc.roundedRect(startX, currentY, boxWidth, boxHeight, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(box.textCol[0], box.textCol[1], box.textCol[2]);
    doc.text(box.val, startX + boxWidth / 2, currentY + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(box.label, startX + boxWidth / 2, currentY + 10, { align: 'center' });

    startX += boxWidth + boxGap;
  });

  currentY += boxHeight + 5;

  // ==========================================
  // 4. ATTENDANCE TABLE (Compact & Clean)
  // ==========================================
  const tableRows = classStudents.map((student, idx) => {
    const rec = recordMap.get(student.id);
    const status = rec?.status || 'ABSENT';

    return [
      (idx + 1).toString(),
      student.name,
      student.grade || (isTeacher ? currentClass.name : 'General'),
      status
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Student Name', 'Grade', 'Status']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica',
      textColor: [30, 41, 59],
      lineWidth: 0.1,
      lineColor: [226, 232, 240]
    },
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5,
      halign: 'left'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold', cellWidth: 'auto' },
      2: { cellWidth: 35 },
      3: { halign: 'center', cellWidth: 30, fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      // High-contrast color coding for Attendance Status
      if (data.section === 'body' && data.column.index === 3) {
        const val = data.cell.raw as string;
        if (val === 'PRESENT') {
          data.cell.styles.textColor = [22, 101, 52]; // Dark green
          data.cell.styles.fillColor = [240, 253, 244];
        } else if (val === 'LATE') {
          data.cell.styles.textColor = [180, 83, 9]; // Dark amber
          data.cell.styles.fillColor = [254, 243, 199];
        } else if (val === 'ABSENT') {
          data.cell.styles.textColor = [185, 28, 28]; // Dark red
          data.cell.styles.fillColor = [254, 242, 242];
        } else if (val === 'EXCUSED') {
          data.cell.styles.textColor = [67, 56, 202]; // Dark indigo
          data.cell.styles.fillColor = [238, 242, 255];
        }
      }
    },
    didDrawPage: (data) => {
      // Running Footer on every page
      const pageCount = doc.getNumberOfPages();
      const pageCurrent = data.pageNumber;

      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `EMIS Attendance System • ${schoolName} • Page ${pageCurrent} of ${pageCount}`,
        14,
        290
      );

      // Sign-off line on right
      doc.text(
        'Teacher / Administrator Signature: _______________________',
        115,
        290
      );
    }
  });

  // Save the PDF
  const filename = isTeacher
    ? `EMIS_Attendance_${currentClass.name.replace(/[^a-zA-Z0-9]/g, '_')}${period ? `_${period.name.replace(/\s+/g, '')}` : ''}_${selectedDate}.pdf`
    : `EMIS_Attendance_Register_${selectedDate}.pdf`;
  doc.save(filename);
}

export interface ExportLogsPDFOptions {
  filteredRecords: AttendanceRecord[];
  studentsMap: Map<string, Student>;
  classesMap: Map<string, ClassSubject>;
  filterSummary?: string;
  schoolName?: string;
}

/**
 * Generates an aggregated logs report PDF for the Reports View
 */
export function exportLogsToPDF({
  filteredRecords,
  studentsMap,
  classesMap,
  filterSummary = 'Attendance Activity Report',
  schoolName = 'EMIS School Attendance'
}: ExportLogsPDFOptions) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const nowStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Institutional Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  // Emblem
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.roundedRect(14, 5, 20, 22, 3, 3, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(19, 10, 4, 11, 'F');
  doc.rect(25, 10, 4, 11, 'F');
  doc.setFillColor(251, 191, 36);
  doc.circle(24, 8, 1.8, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(schoolName, 39, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(199, 210, 254);
  doc.text(`Official Attendance Logs Report — ${filterSummary}`, 39, 19);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7.5);
  doc.text('Ministry of Education EMIS Standard Compliance • Multi-Session Audit Record', 39, 25);

  // Right Date box
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(142, 5, 54, 22, 2, 2, 'F');
  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`DATE: ${todayStr}`, 146, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Total Records: ${filteredRecords.length}`, 146, 16);
  doc.setTextColor(148, 163, 184);
  doc.text(`Printed: ${nowStr}`, 146, 22);

  // Table
  const tableRows = filteredRecords.map((r, idx) => {
    const student = studentsMap.get(r.studentId);
    const cls = classesMap.get(r.classId);
    return [
      (idx + 1).toString(),
      r.date,
      student?.rollNumber || '-',
      student?.name || 'Unknown',
      cls?.name || 'General',
      r.periodId?.toUpperCase() || 'P1',
      r.status,
      r.checkInTime || '-',
      r.notes || '-'
    ];
  });

  autoTable(doc, {
    startY: 38,
    head: [['#', 'Date', 'Roll', 'Student Name', 'Class/Grade', 'Period', 'Status', 'Check-In', 'Notes']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica',
      textColor: [30, 41, 59],
      lineWidth: 0.1,
      lineColor: [226, 232, 240]
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'center', cellWidth: 14 },
      3: { fontStyle: 'bold', cellWidth: 36 },
      4: { cellWidth: 26 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      7: { halign: 'center', cellWidth: 18 },
      8: { cellWidth: 'auto' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const val = data.cell.raw as string;
        if (val === 'PRESENT') {
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fillColor = [240, 253, 244];
        } else if (val === 'LATE') {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fillColor = [254, 243, 199];
        } else if (val === 'ABSENT') {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fillColor = [254, 242, 242];
        } else if (val === 'EXCUSED') {
          data.cell.styles.textColor = [67, 56, 202];
          data.cell.styles.fillColor = [238, 242, 255];
        }
      }
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `EMIS Attendance System • ${schoolName} • Page ${data.pageNumber} of ${pageCount}`,
        14,
        290
      );
      doc.text(
        'Verified EMIS Official Signature: _______________________',
        115,
        290
      );
    }
  });

  const reportTodayStr = new Date().toISOString().split('T')[0];
  doc.save(`EMIS_Attendance_Report_${reportTodayStr}.pdf`);
}

