import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Mail, 
  Phone, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  Trash2, 
  GraduationCap,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  AlertTriangle,
  RefreshCw,
  X,
  Plus,
  Edit2,
  FileSpreadsheet
} from 'lucide-react';
import { Student, ClassSubject, AttendanceRecord } from '../types';
import { formatDisplayDate } from '../utils/timeUtils';
import { ExcelImportModal } from './ExcelImportModal';

interface StudentRosterProps {
  students: Student[];
  classes: ClassSubject[];
  records: AttendanceRecord[];
  onAddStudent: (newStudent: Omit<Student, 'id'>) => void;
  onAddBulkStudents: (newStudentsList: Student[]) => void;
  onUpdateStudent: (updated: Student) => void;
  onDeleteStudent: (id: string) => void;
  onDeleteBulkStudents: (ids: string[]) => void;
  onDeleteAllStudents: () => void;
}

export const StudentRoster: React.FC<StudentRosterProps> = ({
  students,
  classes,
  records,
  onAddStudent,
  onAddBulkStudents,
  onUpdateStudent,
  onDeleteStudent,
  onDeleteBulkStudents,
  onDeleteAllStudents,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('ALL');
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Single Add student modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGrade, setNewGrade] = useState('Grade 10-A');
  const [newRollNumber, setNewRollNumber] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  // Confirm Delete All Modal state
  const [isConfirmDeleteAllOpen, setIsConfirmDeleteAllOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Excel Import Modal state
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Edit Student Modal state
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGrade, setEditGrade] = useState('Grade 10-A');
  const [editRollNumber, setEditRollNumber] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const handleOpenEditModal = (student: Student) => {
    setStudentToEdit(student);
    setEditName(student.name);
    setEditStudentId(student.studentId);
    setEditEmail(student.email);
    setEditPhone(student.phone);
    setEditGrade(student.grade);
    setEditRollNumber(student.rollNumber);
    setEditNotes(student.notes || '');
  };

  const handleSaveEditedStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToEdit || !editName.trim() || !editStudentId.trim()) return;

    const updated: Student = {
      ...studentToEdit,
      name: editName.trim(),
      studentId: editStudentId.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      grade: editGrade,
      rollNumber: editRollNumber.trim() || '100',
      notes: editNotes.trim()
    };

    onUpdateStudent(updated);
    setStudentToEdit(null);
    showNotification(`Student "${updated.name}" updated successfully`);
  };

  // Grades list for filter
  const grades = Array.from(new Set(students.map(s => s.grade))).sort();

  // Filter students
  const filteredStudents = students.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGrade = selectedGradeFilter === 'ALL' || s.grade === selectedGradeFilter;
    return matchesSearch && matchesGrade;
  });

  // Pagination Math
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + pageSize);

  // Multi-select handlers
  const handleToggleSelectStudent = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllInPage = () => {
    const pageIds = paginatedStudents.map(s => s.id);
    const allPageSelected = pageIds.every(id => selectedIds.includes(id));

    if (allPageSelected) {
      // Unselect all on current page
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      // Select all on current page
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredStudents.map(s => s.id);
    if (selectedIds.length === allFilteredIds.length && allFilteredIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allFilteredIds);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    onDeleteBulkStudents(selectedIds);
    showNotification(`Successfully deleted ${count} student record(s)`);
    setSelectedIds([]);
  };

  const handleConfirmDeleteAll = () => {
    onDeleteAllStudents();
    setSelectedIds([]);
    setIsConfirmDeleteAllOpen(false);
    showNotification('All students have been cleared from the roster');
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newStudentId.trim()) {
      alert('Name and Student ID are required');
      return;
    }

    onAddStudent({
      studentId: newStudentId.trim(),
      name: newName.trim(),
      email: newEmail.trim() || `${newName.toLowerCase().replace(/\s+/g, '.')}@school.edu`,
      phone: newPhone.trim(),
      grade: newGrade,
      rollNumber: newRollNumber || '100',
      notes: newNotes,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newName)}`
    });

    // Reset & close
    setNewName('');
    setNewStudentId('');
    setNewEmail('');
    setNewPhone('');
    setNewNotes('');
    setIsAddModalOpen(false);
    showNotification(`Student "${newName}" added successfully`);
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white font-medium text-xs sm:text-sm px-4 py-3 rounded-xl shadow-xl border border-emerald-400 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header & Main Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-400" />
              Student Adding & Directory
            </h2>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {students.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Add individual students, import from Excel spreadsheets, select and multi-delete, or manage class rosters
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          
          {/* Import Excel File Button */}
          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/30 transition-all"
            title="Import students from an Excel (.xlsx, .xls, .csv) spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            Import Excel
          </button>



          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/30 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Add Student
          </button>

          {/* Clear All Students Button */}
          {students.length > 0 && (
            <button
              onClick={() => setIsConfirmDeleteAllOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs sm:text-sm font-semibold transition-colors"
              title="Delete all students in roster"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              Clear Roster ({students.length})
            </button>
          )}

        </div>
      </div>

      {/* Floating Multi-Select Action Bar (if items selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-950/90 border border-indigo-500/50 p-3.5 rounded-2xl flex items-center justify-between shadow-xl backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-indigo-500 text-white font-mono font-bold text-xs flex items-center justify-center">
              {selectedIds.length}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-indigo-100">
              {selectedIds.length} student(s) selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedIds.length})
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Filter, Search & View Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student by name, email, or ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filters & View Switches */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          
          {/* Grade filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Grade:</span>
            <select
              value={selectedGradeFilter}
              onChange={(e) => {
                setSelectedGradeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none"
            >
              <option value="ALL">All Grades ({students.length})</option>
              {grades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Page Size */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none"
            >
              <option value={12}>12 per page</option>
              <option value={24}>24 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>

          {/* Select All Checkbox Button */}
          <button
            onClick={handleSelectAllFiltered}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              selectedIds.length === filteredStudents.length && filteredStudents.length > 0
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {selectedIds.length === filteredStudents.length && filteredStudents.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-indigo-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
            Select All ({filteredStudents.length})
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400'}`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg ${viewMode === 'table' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400'}`}
              title="Table List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Roster Main Content */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl p-8 space-y-4">
          <GraduationCap className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">No students found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your roster is currently empty or no students match the search filter. Add individual students or import from an Excel sheet.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Student
            </button>
            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Import Excel
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedStudents.map(student => {
            const isSelected = selectedIds.includes(student.id);

            // Calculate attendance stats
            const studentRecs = records.filter(r => r.studentId === student.id);
            const totalPresent = studentRecs.filter(r => r.status === 'PRESENT').length;
            const totalLate = studentRecs.filter(r => r.status === 'LATE').length;
            const totalMinsLate = studentRecs.reduce((acc, r) => acc + (r.minutesLate || 0), 0);
            const totalSessions = studentRecs.length;
            const attendancePct = totalSessions > 0
              ? Math.round(((totalPresent + totalLate) / totalSessions) * 100)
              : 100;

            return (
              <div
                key={student.id}
                className={`bg-slate-900 border rounded-2xl p-5 space-y-4 transition-all relative ${
                  isSelected ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleSelectStudent(student.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-indigo-400 transition-colors shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-indigo-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                      )}
                    </button>

                    <div>
                      <h3 
                        onClick={() => setSelectedStudentForProfile(student)}
                        className="font-bold text-slate-100 text-sm hover:text-indigo-300 cursor-pointer transition-colors"
                      >
                        {student.name}
                      </h3>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {student.studentId} • Roll #{student.rollNumber}
                      </div>
                      <span className="inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mt-1">
                        {student.grade}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(student);
                      }}
                      title="Edit Student"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStudentToDelete(student);
                      }}
                      title="Delete Student"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-1 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{student.email}</span>
                  </div>
                  {student.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{student.phone}</span>
                    </div>
                  )}
                </div>

                {/* Attendance Mini Stat Box */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Attendance</div>
                    <div className="font-mono font-bold text-emerald-400 text-sm">{attendancePct}%</div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Total Delay</div>
                    <div className="font-mono font-bold text-amber-300 text-xs">+{totalMinsLate} mins</div>
                  </div>

                  <button
                    onClick={() => setSelectedStudentForProfile(student)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium text-[11px] transition-colors"
                  >
                    History
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      ) : (

        /* TABLE VIEW */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                  <th className="py-3 px-4 w-10">
                    <button onClick={handleSelectAllInPage}>
                      {paginatedStudents.every(s => selectedIds.includes(s.id)) ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">ID & Roll Number</th>
                  <th className="py-3 px-4">Grade</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-sm">
                {paginatedStudents.map(student => {
                  const isSelected = selectedIds.includes(student.id);

                  return (
                    <tr 
                      key={student.id} 
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <button onClick={() => handleToggleSelectStudent(student.id)}>
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        <div 
                          className="flex items-center gap-3 cursor-pointer group"
                          onClick={() => setSelectedStudentForProfile(student)}
                        >
                          <span className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                            {student.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-xs text-slate-300">
                        {student.studentId} <span className="text-slate-500">#{student.rollNumber}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {student.grade}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-400">
                        <div>{student.email}</div>
                        <div className="text-slate-500">{student.phone}</div>
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-400 max-w-[150px] truncate">
                        {student.notes || '—'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(student);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                            title="Edit student"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStudentToDelete(student);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {filteredStudents.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl text-xs text-slate-400">
          <div>
            Showing <strong className="text-slate-200">{startIndex + 1}</strong> to{' '}
            <strong className="text-slate-200">{Math.min(startIndex + pageSize, filteredStudents.length)}</strong> of{' '}
            <strong className="text-indigo-400">{filteredStudents.length}</strong> students
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={validCurrentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-semibold text-slate-300 px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl font-mono">
              Page {validCurrentPage} of {totalPages}
            </span>

            <button
              disabled={validCurrentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}


      {/* CONFIRM DELETE ALL MODAL */}
      {isConfirmDeleteAllOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <h3 className="font-bold text-lg text-white">Clear All Roster Data?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong>all {students.length} students</strong> from the roster and class enrollments? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsConfirmDeleteAllOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteAll}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30"
              >
                Yes, Delete All {students.length} Students
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM SINGLE STUDENT DELETE MODAL */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Delete Student Record</h3>
                <p className="text-xs text-slate-400">Permanently remove student & all attendance history</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently remove <strong className="text-white">{studentToDelete.name}</strong> (<span className="font-mono text-amber-300">{studentToDelete.studentId}</span>)? This will erase their student entry, class enrollments, and all associated attendance logs across all dates.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteStudent(studentToDelete.id);
                  showNotification(`Permanently deleted student record for ${studentToDelete.name}`);
                  setStudentToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD SINGLE STUDENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg text-white pb-2 border-b border-slate-800 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              Add New Student
            </h3>

            <form onSubmit={handleCreateStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Benjamin Hayes"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Student ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. STU-2026-009"
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Roll Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 109"
                    value={newRollNumber}
                    onChange={(e) => setNewRollNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Class & Section (Syncs to Teacher's App) *
                </label>
                <select
                  value={newGrade}
                  onChange={(e) => setNewGrade(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.code}) {c.classTeacherName ? `• Teacher: ${c.classTeacherName}` : ''}
                    </option>
                  ))}
                  <option value="All Classes">All Classes (Global Student)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Students added here immediately sync to this class and appear in the assigned teacher's portal.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="student@school.edu"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Parent Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Tags</label>
                <input
                  type="text"
                  placeholder="e.g. Bus Route 2, Science Olympiad"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SINGLE STUDENT MODAL */}
      {studentToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg text-white pb-2 border-b border-slate-800 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-indigo-400" />
              Edit Student Details
            </h3>

            <form onSubmit={handleSaveEditedStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Student ID *</label>
                  <input
                    type="text"
                    required
                    value={editStudentId}
                    onChange={(e) => setEditStudentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Roll Number</label>
                  <input
                    type="text"
                    value={editRollNumber}
                    onChange={(e) => setEditRollNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Class & Section (Syncs to Teacher's App) *
                </label>
                <select
                  value={editGrade}
                  onChange={(e) => setEditGrade(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.code}) {c.classTeacherName ? `• Teacher: ${c.classTeacherName}` : ''}
                    </option>
                  ))}
                  <option value="All Classes">All Classes (Global Student)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Parent Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStudentToEdit(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT HISTORY MODAL */}
      {selectedStudentForProfile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-bold text-slate-100 text-base">{selectedStudentForProfile.name}</h3>
                  <div className="text-xs text-slate-400 font-mono">
                    {selectedStudentForProfile.studentId} • {selectedStudentForProfile.grade}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForProfile(null)}
                className="text-slate-400 hover:text-white p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <h4 className="font-semibold text-xs text-slate-300 uppercase tracking-wider">Attendance Log History</h4>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {records
                .filter(r => r.studentId === selectedStudentForProfile.id)
                .map(r => {
                  const cls = classes.find(c => c.id === r.classId);
                  return (
                    <div key={r.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-200">{formatDisplayDate(r.date)} — {cls?.code || r.classId}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Check-in: <strong className="text-indigo-300">{r.checkInTime || 'N/A'}</strong>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`inline-block font-bold px-2 py-0.5 rounded text-[10px] ${
                          r.status === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          r.status === 'LATE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          r.status === 'EXCUSED' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                          'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {r.status} {r.minutesLate > 0 ? `(+${r.minutesLate}m)` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              {records.filter(r => r.studentId === selectedStudentForProfile.id).length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">No historical records recorded yet for this student.</p>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedStudentForProfile(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* EXCEL IMPORT MODAL */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        defaultGrade={selectedGradeFilter === 'ALL' ? 'Grade 10-A' : selectedGradeFilter}
        onImportStudents={(importedStudents) => {
          onAddBulkStudents(importedStudents);
          showNotification(`Successfully imported ${importedStudents.length} student(s) from Excel!`);
        }}
      />

    </div>
  );
};
