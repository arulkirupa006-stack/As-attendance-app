import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Download, 
  Calendar, 
  Filter, 
  Printer, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle,
  FileType,
  Trash2
} from 'lucide-react';
import { Student, ClassSubject, AttendanceRecord, AttendanceStatus } from '../types';
import { formatDisplayDate, generateAttendanceCSV } from '../utils/timeUtils';
import { exportLogsToPDF } from '../utils/pdfExporter';

interface ReportsViewProps {
  students: Student[];
  classes: ClassSubject[];
  records: AttendanceRecord[];
  onDeleteRecord?: (recordId: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  students,
  classes,
  records,
  onDeleteRecord,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  const studentsMap = new Map<string, Student>();
  students.forEach(s => studentsMap.set(s.id, s));

  const classesMap = new Map<string, ClassSubject>();
  classes.forEach(c => classesMap.set(c.id, c));

  // Filter records
  const filteredRecords = records.filter(r => {
    const student = studentsMap.get(r.studentId);
    const matchesSearch = !searchTerm || (
      student?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student?.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.date.includes(searchTerm)
    );

    const matchesClass = selectedClassFilter === 'ALL' || r.classId === selectedClassFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || r.status === selectedStatusFilter;

    return matchesSearch && matchesClass && matchesStatus;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const handleDownloadCSV = () => {
    const csvContent = generateAttendanceCSV(filteredRecords, studentsMap, classesMap);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    const selectedClassName = selectedClassFilter === 'ALL' 
      ? 'All Classes' 
      : classesMap.get(selectedClassFilter)?.name || 'Class';
    
    exportLogsToPDF({
      filteredRecords,
      studentsMap,
      classesMap,
      filterSummary: `${selectedClassName} (${selectedStatusFilter} Status)`
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            Attendance History & Export Logs
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Detailed time-stamped attendance logs for reporting and compliance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            Print
          </button>

          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4 text-amber-400" />
            CSV ({filteredRecords.length})
          </button>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all"
          >
            <FileType className="w-4 h-4 text-rose-100" />
            Save as PDF
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs">
        
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student, ID, or YYYY-MM-DD..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
          <Filter className="w-4 h-4 text-indigo-400 shrink-0" />
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="w-full bg-transparent text-slate-200 font-semibold focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late</option>
            <option value="ABSENT">Absent</option>
            <option value="EXCUSED">Excused</option>
          </select>
        </div>

      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Check-In Time</th>
                <th className="py-3 px-4">Late Delay</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs sm:text-sm">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No attendance logs found matching filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const student = studentsMap.get(r.studentId);
                  const cls = classesMap.get(r.classId);

                  return (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-200 whitespace-nowrap">
                        {formatDisplayDate(r.date)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {cls?.code || r.classId}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100">{student?.name || 'Unknown'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{student?.studentId}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {r.status === 'PRESENT' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> PRESENT
                          </span>
                        )}
                        {r.status === 'LATE' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <Clock className="w-3.5 h-3.5 text-amber-400" /> LATE
                          </span>
                        )}
                        {r.status === 'ABSENT' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <XCircle className="w-3.5 h-3.5 text-rose-400" /> ABSENT
                          </span>
                        )}
                        {r.status === 'EXCUSED' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            <AlertCircle className="w-3.5 h-3.5 text-purple-400" /> EXCUSED
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-indigo-300 whitespace-nowrap">
                        {r.checkInTime || '—'}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs">
                        {r.minutesLate > 0 ? (
                          <span className="text-amber-400 font-bold">+{r.minutesLate} mins</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-xs max-w-xs truncate">
                        {r.notes || '—'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {onDeleteRecord && (
                          <button
                            onClick={() => onDeleteRecord(r.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete this attendance log entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
