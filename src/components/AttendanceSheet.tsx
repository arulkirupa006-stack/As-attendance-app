import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Search, 
  UserCheck, 
  UserX, 
  Edit3, 
  FileText, 
  LogOut, 
  Sparkles, 
  Info,
  Check,
  ShieldCheck,
  Download,
  FileType,
  Trash2,
  Calendar,
  Layers,
  Settings,
  Plus,
  Users,
  Save
} from 'lucide-react';
import { 
  Student, 
  ClassSubject, 
  AttendanceRecord, 
  AttendanceStatus, 
  UserAccount, 
  Period, 
  getActivePeriod,
  SchoolConfig
} from '../types';
import { formatTime12h, format24hTo12h, determineAutoStatus, formatDateYYYYMMDD } from '../utils/timeUtils';
import { exportAttendanceToPDF } from '../utils/pdfExporter';

interface AttendanceSheetProps {
  currentClass: ClassSubject;
  classes?: ClassSubject[];
  onSelectClass?: (classId: string) => void;
  students: Student[];
  records: AttendanceRecord[];
  selectedDate: string;
  periods: Period[];
  selectedPeriodId: string;
  onSelectPeriod: (periodId: string) => void;
  onOpenPeriodManager: () => void;
  onUpdateRecord: (
    studentId: string, 
    status: AttendanceStatus, 
    customCheckInTime?: string | null, 
    customNotes?: string, 
    targetPeriodId?: string
  ) => void;
  onCheckOutRecord: (studentId: string, targetPeriodId?: string) => void;
  onMarkAll: (status: AttendanceStatus, targetPeriodId?: string) => void;
  onOpenStudentProfile: (student: Student) => void;
  onDeleteStudentRecordForDate?: (studentId: string, classId: string, date: string, targetPeriodId?: string) => void;
  currentUser?: UserAccount | null;
  schoolConfig?: SchoolConfig;
  onUpdateClass?: (updated: ClassSubject) => void;
  onOpenClassManager?: () => void;
}

export const AttendanceSheet: React.FC<AttendanceSheetProps> = ({
  currentClass,
  classes = [],
  onSelectClass,
  students,
  records,
  selectedDate,
  periods,
  selectedPeriodId,
  onSelectPeriod,
  onOpenPeriodManager,
  onUpdateRecord,
  onCheckOutRecord,
  onMarkAll,
  onOpenStudentProfile,
  onDeleteStudentRecordForDate,
  currentUser = null,
  schoolConfig,
  onUpdateClass,
  onOpenClassManager,
}) => {
  const [workflowStep, setWorkflowStep] = useState<'classes' | 'sections' | 'attendance'>('classes');
  const [selectedBaseClassName, setSelectedBaseClassName] = useState<string | null>(null);
  const [classSearchTerm, setClassSearchTerm] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AttendanceStatus | 'UNMARKED'>('ALL');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [pdfToastMsg, setPdfToastMsg] = useState<string | null>(null);
  const [saveToastMsg, setSaveToastMsg] = useState<string | null>(null);
  
  // Real-time ticking clock
  const [currentTime, setCurrentTime] = useState<string>(formatTime12h(new Date(), true));
  
  // Quick Class Name Change State
  const [isRenamingClass, setIsRenamingClass] = useState(false);
  const [newClassNameInput, setNewClassNameInput] = useState(currentClass.name);

  useEffect(() => {
    setNewClassNameInput(currentClass.name);
  }, [currentClass.name]);

  // Modal for editing custom check-in time or notes
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editCheckInTime, setEditCheckInTime] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatTime12h(new Date(), true));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // System Clock & Teacher Access Controls
  const isTeacher = currentUser?.role === 'TEACHER';
  const accessiblePeriods = isTeacher 
    ? periods.filter(p => p.assignedTeacherId === currentUser?.id) 
    : periods;

  // Active period based on system clock
  const activePeriod = getActivePeriod(periods);

  // Sync selected period for teacher if current selection is not one of their assigned periods
  useEffect(() => {
    if (isTeacher && accessiblePeriods.length > 0) {
      if (!accessiblePeriods.some(p => p.id === selectedPeriodId)) {
        onSelectPeriod(accessiblePeriods[0].id);
      }
    }
  }, [isTeacher, accessiblePeriods, selectedPeriodId, onSelectPeriod]);

  const currentSelectedPeriod = accessiblePeriods.find(p => p.id === selectedPeriodId) || accessiblePeriods[0] || periods[0] || activePeriod;

  // Filter enrolled students for the current class in teacher portal, or all students in main view
  const displayedStudents = isTeacher 
    ? students.filter(s => currentClass.studentIds.includes(s.id))
    : students.filter(s => currentClass.studentIds.includes(s.id)); // Exclusively enrolled students in this class/section
  const classStudents = displayedStudents;

  // Map studentId -> record for currently selected period or daily record
  const recordsMap = new Map<string, AttendanceRecord>();
  records.forEach(r => {
    if (r.date === selectedDate && r.classId === currentClass.id) {
      const pId = r.periodId || 'p1';
      if (pId === currentSelectedPeriod.id) {
        recordsMap.set(r.studentId, r);
      }
    }
  });

  // Map composite `${studentId}_${periodId}` -> record for multi-period matrix view
  const periodRecordsMap = new Map<string, AttendanceRecord>();
  records.forEach(r => {
    if (r.classId === currentClass.id && r.date === selectedDate) {
      const pId = r.periodId || 'p1';
      periodRecordsMap.set(`${r.studentId}_${pId}`, r);
    }
  });

  // Calculate statistics
  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;
  let excusedCount = 0;
  let unmarkedCount = 0;

  displayedStudents.forEach(s => {
    const rec = recordsMap.get(s.id);
    if (!rec) {
      unmarkedCount++;
    } else {
      if (rec.status === 'PRESENT') presentCount++;
      else if (rec.status === 'LATE') lateCount++;
      else if (rec.status === 'ABSENT') absentCount++;
      else if (rec.status === 'EXCUSED') excusedCount++;
    }
  });

  const totalEnrolled = displayedStudents.length;

  // Filtered student list
  const filteredStudents = displayedStudents.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    const rec = recordsMap.get(s.id);
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'UNMARKED') return !rec;
    return rec?.status === statusFilter;
  });

  // Quick action: Check in student right now with current exact time
  const handleQuickCheckIn = (studentId: string) => {
    const now12h = formatTime12h(new Date(), false);
    const { status } = determineAutoStatus(now12h, currentClass.startTime, currentClass.gracePeriodMins);
    onUpdateRecord(studentId, status, now12h, isTeacher ? currentSelectedPeriod.id : undefined);
  };

  // Open edit modal
  const handleOpenEditModal = (student: Student, rec?: AttendanceRecord) => {
    setEditingStudent(student);
    setEditCheckInTime(rec?.checkInTime || formatTime12h(new Date(), false));
    setEditNotes(rec?.notes || '');
  };

  const handleSaveEditModal = () => {
    if (!editingStudent) return;
    const rec = recordsMap.get(editingStudent.id);
    const currentStatus = rec?.status || 'PRESENT';
    onUpdateRecord(editingStudent.id, currentStatus, editCheckInTime, editNotes, isTeacher ? currentSelectedPeriod.id : undefined);
    setEditingStudent(null);
  };

  const handleExportPDF = () => {
    setIsExportingPDF(true);
    try {
      exportAttendanceToPDF({
        schoolName: schoolConfig?.name || 'Student Attendance App',
        schoolLogo: schoolConfig?.logo,
        currentClass: isTeacher ? currentClass : { ...currentClass, name: 'Student Attendance Register', code: 'ATT' },
        selectedDate,
        students: displayedStudents,
        records,
        currentUser,
        period: isTeacher ? currentSelectedPeriod : undefined
      });
      setPdfToastMsg(`Official PDF generated for ${isTeacher && currentSelectedPeriod ? currentSelectedPeriod.name : (isTeacher ? currentClass.name : 'Student Attendance Tracker')} (${selectedDate})!`);
      setTimeout(() => setPdfToastMsg(null), 4500);
    } catch (err) {
      console.error('PDF generation error', err);
      alert('An error occurred while generating the PDF document.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Group classes by base name for the workflow
  const availableClasses = classes.length > 0 ? classes : [currentClass];
  const classGroupsMap = new Map<string, ClassSubject[]>();
  availableClasses.forEach(cls => {
    let baseName = cls.name;
    if (cls.section && cls.name.includes(cls.section)) {
      baseName = cls.name.replace(new RegExp(`\\\\s*[-–—]\\\\s*${cls.section}`, 'i'), '').trim();
    } else if (cls.name.includes(' - Section')) {
      baseName = cls.name.split(' - Section')[0].trim();
    }
    if (!classGroupsMap.has(baseName)) {
      classGroupsMap.set(baseName, []);
    }
    classGroupsMap.get(baseName)!.push(cls);
  });

  const classGroups = Array.from(classGroupsMap.entries()).map(([baseName, secList]) => ({
    baseName,
    code: secList[0]?.code || '',
    instructor: secList[0]?.instructor || secList[0]?.classTeacherName,
    room: secList[0]?.room,
    sections: secList,
    totalStudents: Array.from(new Set(secList.flatMap(s => s.studentIds))).length
  })).filter(g => g.baseName.toLowerCase().includes(classSearchTerm.toLowerCase()) || g.code.toLowerCase().includes(classSearchTerm.toLowerCase()));

  const selectedGroup = classGroups.find(g => g.baseName === selectedBaseClassName) || classGroups[0];

  // Workflow Step 1: List of Classes
  if (workflowStep === 'classes') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
                <Layers className="w-4 h-4" />
                <span>Take Attendance Workflow</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Select a Class</h1>
              <p className="text-slate-400 text-sm mt-1">Choose a class to view its sections and take attendance</p>
            </div>
            {onOpenClassManager && (
              <button
                onClick={onOpenClassManager}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/20 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Manage Classes & Sections</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search classes by name or code..."
            value={classSearchTerm}
            onChange={(e) => setClassSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classGroups.map((group) => (
            <div
              key={group.baseName}
              onClick={() => {
                setSelectedBaseClassName(group.baseName);
                if (group.sections.length === 1 && onSelectClass) {
                  onSelectClass(group.sections[0].id);
                  setWorkflowStep('attendance');
                } else {
                  setWorkflowStep('sections');
                }
              }}
              className="bg-slate-900 border border-slate-800/80 hover:border-indigo-500/50 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {group.code}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    {group.totalStudents} Students
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {group.baseName}
                  </h3>
                  {group.instructor && (
                    <p className="text-xs text-slate-400 mt-1">Instructor: {group.instructor}</p>
                  )}
                  {group.room && (
                    <p className="text-xs text-slate-500">Room: {group.room}</p>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300 bg-slate-800 px-3 py-1 rounded-lg">
                  {group.sections.length} {group.sections.length === 1 ? 'Section' : 'Sections'} Available
                </span>
                <span className="text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  Select Class →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Workflow Step 2: Sections List for Selected Class
  if (workflowStep === 'sections') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb & Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <button 
                onClick={() => setWorkflowStep('classes')} 
                className="hover:text-white transition-colors flex items-center gap-1 text-indigo-400 font-medium"
              >
                ← Back to Classes
              </button>
              <span>/</span>
              <span className="text-white font-semibold">{selectedGroup?.baseName}</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{selectedGroup?.baseName} — Select Section</h1>
                <p className="text-slate-400 text-sm mt-1">Choose a specific section to launch the attendance register</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {selectedGroup?.code}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {selectedGroup?.sections.map((sec) => {
            const secStudents = students.filter(s => sec.studentIds.includes(s.id));
            return (
              <div
                key={sec.id}
                className="bg-slate-900 border border-slate-800/80 hover:border-emerald-500/50 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {sec.section || 'Standard Section'}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      {secStudents.length} Students
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {sec.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Class Teacher: <span className="text-slate-200 font-medium">{sec.classTeacherName || 'Unassigned'}</span>
                    </p>
                    {sec.room && (
                      <p className="text-xs text-slate-500">Room: {sec.room}</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (onSelectClass) onSelectClass(sec.id);
                      setWorkflowStep('attendance');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Take Attendance Register</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Breadcrumb Navigation for Attendance View */}
      <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-900/60 border border-slate-800/60 px-4 py-2.5 rounded-xl">
        <button 
          onClick={() => setWorkflowStep('classes')} 
          className="hover:text-white transition-colors text-indigo-400 font-medium"
        >
          Classes
        </button>
        <span>/</span>
        <button 
          onClick={() => setWorkflowStep('sections')} 
          className="hover:text-white transition-colors"
        >
          {selectedBaseClassName || currentClass.name}
        </button>
        <span>/</span>
        <span className="text-white font-semibold">{currentClass.section || currentClass.name}</span>
      </div>

      {/* PDF & Save Toast Notifications */}
      <div className="flex flex-col gap-2 mb-4">
        {pdfToastMsg && (
          <div className="p-3.5 bg-emerald-950/90 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xl animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{pdfToastMsg}</span>
            </div>
            <button 
              onClick={() => setPdfToastMsg(null)}
              className="text-emerald-400 hover:text-white text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}
        
        {saveToastMsg && (
          <div className="p-3.5 bg-indigo-950/90 border border-indigo-500/40 rounded-xl text-indigo-200 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xl animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>{saveToastMsg}</span>
            </div>
            <button 
              onClick={() => setSaveToastMsg(null)}
              className="text-indigo-400 hover:text-white text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm text-slate-100 relative overflow-hidden">
        {/* Ambient Gradient Glow */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Header Info: Teacher Portal displays Class Details; Main View displays Student Attendance Tracker */}
          {isTeacher ? (
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentClass.code}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  {classStudents.length} Enrolled Students
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-white">{currentClass.name}</h1>
                {onUpdateClass && (
                  <button
                    onClick={() => {
                      setNewClassNameInput(currentClass.name);
                      setIsRenamingClass(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
                    title="Change Class Name"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Change Class Name</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Daily Attendance Register
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  {displayedStudents.length} Students Registered
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-white">Student Attendance Tracker</h1>
              </div>
              <p className="text-xs text-slate-400">
                Mark student attendance, monitor real-time check-in timestamps, and generate verified PDF registers.
              </p>
            </div>
          )}

          {/* Attendance Summary Panel with Save as PDF at bottom */}
          <div className="flex flex-col bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 gap-3 min-w-[280px]">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
              <div className="text-xs font-bold text-slate-200">
                Attendance Counts
              </div>

              {/* Attendance Status Counter Pills */}
              <div className="flex items-center gap-1.5">
                <div className="text-center px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 min-w-[42px]">
                  <div className="text-xs text-emerald-400 font-bold">{presentCount}</div>
                  <div className="text-[8px] uppercase font-semibold text-slate-400">Present</div>
                </div>
                <div className="text-center px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 min-w-[42px]">
                  <div className="text-xs text-amber-400 font-bold">{lateCount}</div>
                  <div className="text-[8px] uppercase font-semibold text-slate-400">Late</div>
                </div>
                <div className="text-center px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 min-w-[42px]">
                  <div className="text-xs text-rose-400 font-bold">{absentCount}</div>
                  <div className="text-[8px] uppercase font-semibold text-slate-400">Absent</div>
                </div>
                <div className="text-center px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 min-w-[42px]">
                  <div className="text-xs text-purple-400 font-bold">{excusedCount}</div>
                  <div className="text-[8px] uppercase font-semibold text-slate-400">Excused</div>
                </div>
              </div>
            </div>

            {/* SAVE AS PDF BUTTON AT BOTTOM OF ATTENDANCE SUMMARY PANEL */}
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-md shadow-rose-600/20 border border-rose-400/30 transition-all hover:scale-[1.01] active:scale-98"
              title="Download official PDF attendance register for this class & date"
            >
              <FileType className="w-4 h-4 text-rose-100" />
              <span>Save as PDF Register</span>
              <Download className="w-3.5 h-3.5 text-rose-200" />
            </button>
          </div>

        </div>
      </div>

      {/* Assigned Period Info - Only for Teachers (Removed from Admin Portal) */}
      {isTeacher && (
        accessiblePeriods.length === 0 ? (
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 text-center space-y-3 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-white">No Assigned Period</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              Welcome, <strong className="text-white">{currentUser?.name}</strong> (@{currentUser?.username}). 
              The School Administrator has not yet mapped any period to your teacher account. 
              Please request the Administrator to assign your period in the Class & Section Manager.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Assigned Period: <span className="text-emerald-400">{currentSelectedPeriod?.name}</span>
                    {currentSelectedPeriod?.subjectName && (
                      <span className="text-xs text-indigo-300 font-medium">({currentSelectedPeriod.subjectName})</span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Take attendance for your assigned class period ({currentSelectedPeriod?.startTime}–{currentSelectedPeriod?.endTime}). Mark students Present or Absent.
                  </p>
                </div>
              </div>
            </div>

            {accessiblePeriods.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {accessiblePeriods.map(p => {
                  const isSelected = p.id === selectedPeriodId;
                  const isLive = activePeriod?.id === p.id;

                  return (
                    <button
                      key={p.id}
                      onClick={() => onSelectPeriod(p.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                          : isLive
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/50'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div className="flex flex-col text-left">
                        <span className="font-bold flex items-center gap-1">
                          {p.name}
                          {p.subjectName && (
                            <span className="text-[10px] font-normal opacity-80">• {p.subjectName}</span>
                          )}
                          {isLive && !isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                        </span>
                        <span className={`text-[10px] font-mono ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {p.startTime} – {p.endTime}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}

      {/* Control & Bulk Actions Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student by name, ID, or roll number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Filter Tabs & View Mode */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Status Filter Dropdown or Pills */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'ALL' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({totalEnrolled})
            </button>
            <button
              onClick={() => setStatusFilter('PRESENT')}
              className={`px-2 py-1 rounded-md transition-all ${
                statusFilter === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30' : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              Present ({presentCount})
            </button>
            <button
              onClick={() => setStatusFilter('LATE')}
              className={`px-2 py-1 rounded-md transition-all ${
                statusFilter === 'LATE' ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30' : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              Late ({lateCount})
            </button>
            <button
              onClick={() => setStatusFilter('ABSENT')}
              className={`px-2 py-1 rounded-md transition-all ${
                statusFilter === 'ABSENT' ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30' : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              Absent ({absentCount})
            </button>
            {unmarkedCount > 0 && (
              <button
                onClick={() => setStatusFilter('UNMARKED')}
                className={`px-2 py-1 rounded-md transition-all ${
                  statusFilter === 'UNMARKED' ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30' : 'text-slate-400 hover:text-indigo-400'
                }`}
              >
                Unmarked ({unmarkedCount})
              </button>
            )}
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onMarkAll('PRESENT', isTeacher ? selectedPeriodId : undefined)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-colors"
              title={isTeacher ? `Mark all students as Present for ${currentSelectedPeriod?.name}` : "Mark all students as Present"}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Mark All Present
            </button>
            <button
              onClick={() => onMarkAll('ABSENT', isTeacher ? selectedPeriodId : undefined)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors"
              title={isTeacher ? `Mark all remaining as Absent for ${currentSelectedPeriod?.name}` : "Mark all remaining as Absent"}
            >
              <UserX className="w-3.5 h-3.5" />
              Mark All Absent
            </button>
          </div>
        </div>

      </div>

      {/* Student Attendance Display */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8">
          <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No students match your filter</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting search term or status filter</p>
        </div>
      ) : (
        
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => {
            const rec = recordsMap.get(student.id);
            const status = rec?.status || null;

            return (
              <div 
                key={student.id} 
                className={`bg-slate-900 border rounded-2xl p-4 transition-all duration-200 hover:border-slate-700 relative flex flex-col justify-between ${
                  status === 'PRESENT'
                    ? 'border-emerald-500/40 bg-emerald-950/10'
                    : status === 'LATE'
                    ? 'border-amber-500/40 bg-amber-950/10'
                    : status === 'ABSENT'
                    ? 'border-rose-500/40 bg-rose-950/10'
                    : status === 'EXCUSED'
                    ? 'border-purple-500/40 bg-purple-950/10'
                    : 'border-slate-800 hover:border-indigo-500/30'
                }`}
              >
                
                {/* Student Info Top Row */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 
                          onClick={() => onOpenStudentProfile(student)}
                          className="font-bold text-slate-100 hover:text-indigo-300 cursor-pointer transition-colors text-sm"
                        >
                          {student.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{student.studentId}</span>
                          <span>•</span>
                          <span>Roll #{student.rollNumber}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {status === 'PRESENT' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          PRESENT
                        </span>
                      )}
                      {status === 'LATE' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          LATE (+{rec?.minutesLate}m)
                        </span>
                      )}
                      {status === 'ABSENT' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          ABSENT
                        </span>
                      )}
                      {status === 'EXCUSED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          <AlertCircle className="w-3.5 h-3.5 text-purple-400" />
                          EXCUSED
                        </span>
                      )}
                      {!status && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          Unmarked
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Attendance Time Details */}
                  <div className="mt-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-slate-400">Check-In Time:</span>
                      <strong className={`font-mono ${rec?.checkInTime ? 'text-indigo-300' : 'text-slate-500'}`}>
                        {rec?.checkInTime || 'Not recorded'}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1">
                      {rec?.checkInTime ? (
                        <button
                          onClick={() => handleOpenEditModal(student, rec)}
                          title="Edit Timestamp or Note"
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-300 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleQuickCheckIn(student.id)}
                          className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors"
                        >
                          Check In Now
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notes snippet if exists */}
                  {rec?.notes && (
                    <div className="mt-2 text-[11px] text-slate-400 bg-slate-800/40 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5 truncate">
                      <FileText className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{rec.notes}</span>
                    </div>
                  )}
                </div>

                {/* Status Toggle Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-4 gap-1.5">
                  
                  <button
                    onClick={() => {
                      const now12h = rec?.checkInTime || formatTime12h(new Date(), false);
                      onUpdateRecord(student.id, 'PRESENT', now12h, isTeacher ? currentSelectedPeriod.id : undefined);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition-all ${
                      status === 'PRESENT'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-slate-800 text-slate-300 hover:bg-emerald-600/20 hover:text-emerald-300'
                    }`}
                  >
                    <span>Present</span>
                  </button>

                  <button
                    onClick={() => {
                      const now12h = rec?.checkInTime || formatTime12h(new Date(), false);
                      const minsLate = rec?.minutesLate || 15;
                      onUpdateRecord(student.id, 'LATE', now12h, rec?.notes, isTeacher ? currentSelectedPeriod.id : undefined);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition-all ${
                      status === 'LATE'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                        : 'bg-slate-800 text-slate-300 hover:bg-amber-600/20 hover:text-amber-300'
                    }`}
                  >
                    <span>Late</span>
                  </button>

                  <button
                    onClick={() => onUpdateRecord(student.id, 'ABSENT', null, undefined, isTeacher ? currentSelectedPeriod.id : undefined)}
                    className={`py-1.5 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition-all ${
                      status === 'ABSENT'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                        : 'bg-slate-800 text-slate-300 hover:bg-rose-600/20 hover:text-rose-300'
                    }`}
                  >
                    <span>Absent</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(student, rec)}
                    className={`py-1.5 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition-all ${
                      status === 'EXCUSED'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-slate-800 text-slate-300 hover:bg-purple-600/20 hover:text-purple-300'
                    }`}
                  >
                    <span>Excused</span>
                  </button>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Save Attendance Button */}
      {filteredStudents.length > 0 && (
        <div className="pt-8 pb-4 flex justify-center border-t border-slate-800/60 mt-6">
          <button
            onClick={() => {
              setSaveToastMsg('Attendance saved successfully to the system!');
              setTimeout(() => setSaveToastMsg(null), 4500);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-10 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/20 transition-all border border-indigo-500/50"
          >
            <Save className="w-5 h-5" />
            Save Attendance
          </button>
        </div>
      )}

      {/* EDIT TIMESTAMP & NOTES MODAL */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-bold text-slate-100">{editingStudent.name}</h3>
                  <p className="text-xs text-slate-400">{editingStudent.studentId} • {currentClass.code}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              
              {/* Check-In Timestamp Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Exact Check-In Time
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editCheckInTime}
                    onChange={(e) => setEditCheckInTime(e.target.value)}
                    placeholder="e.g. 09:05 AM"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setEditCheckInTime(formatTime12h(new Date(), false))}
                    className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold rounded-xl border border-indigo-500/30 transition-colors"
                  >
                    Set Now
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Class starts at {format24hTo12h(currentClass.startTime)}</p>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Attendance Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateRecord(editingStudent.id, 'PRESENT', editCheckInTime, editNotes, isTeacher ? currentSelectedPeriod.id : undefined);
                      setEditingStudent(null);
                    }}
                    className="py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-semibold text-xs border border-emerald-500/30 transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Set Present
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateRecord(editingStudent.id, 'LATE', editCheckInTime, editNotes, isTeacher ? currentSelectedPeriod.id : undefined);
                      setEditingStudent(null);
                    }}
                    className="py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white font-semibold text-xs border border-amber-500/30 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Clock className="w-4 h-4" /> Set Late
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateRecord(editingStudent.id, 'ABSENT', null, editNotes, isTeacher ? currentSelectedPeriod.id : undefined);
                      setEditingStudent(null);
                    }}
                    className="py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-semibold text-xs border border-rose-500/30 transition-all flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" /> Set Absent
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateRecord(editingStudent.id, 'EXCUSED', editCheckInTime, editNotes, isTeacher ? currentSelectedPeriod.id : undefined);
                      setEditingStudent(null);
                    }}
                    className="py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white font-semibold text-xs border border-purple-500/30 transition-all flex items-center justify-center gap-1.5"
                  >
                    <AlertCircle className="w-4 h-4" /> Set Excused
                  </button>
                </div>
              </div>

              {/* Remarks / Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Remarks / Notes (Reason for late/excused)
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Bus delay, Doctor's note, Participating in science fair..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <div>
                {onDeleteStudentRecordForDate && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteStudentRecordForDate(editingStudent.id, currentClass.id, selectedDate);
                      setEditingStudent(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold border border-rose-500/30 flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear Record
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditModal}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
                >
                  Save Record
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* QUICK RENAME CLASS MODAL (Option to change class name directly) */}
      {isRenamingClass && onUpdateClass && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Change Class Name</h3>
                <p className="text-xs text-slate-400">Update the official name of this class and section</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newClassNameInput.trim()) return;
                onUpdateClass({
                  ...currentClass,
                  name: newClassNameInput.trim()
                });
                setIsRenamingClass(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Class Name & Section <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newClassNameInput}
                  onChange={(e) => setNewClassNameInput(e.target.value)}
                  placeholder="e.g. Grade 10 - Section A"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Current Course Code: <strong className="text-indigo-300">{currentClass.code}</strong>
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRenamingClass(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all"
                >
                  Save New Class Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
