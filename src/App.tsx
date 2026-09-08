import React, { useState, useEffect } from 'react';
import { 
  INITIAL_STUDENTS, 
  INITIAL_CLASSES, 
  generateInitialRecords 
} from './data/mockData';
import { 
  Student, 
  ClassSubject, 
  AttendanceRecord, 
  AttendanceStatus,
  UserAccount,
  Period,
  DEFAULT_PERIODS,
  getActivePeriod,
  SchoolConfig
} from './types';
import { 
  formatDateYYYYMMDD, 
  formatTime12h, 
  calculateMinutesLate, 
  generateAttendanceCSV 
} from './utils/timeUtils';
import { getStoredCurrentUser, setCurrentUserSession } from './utils/authStorage';
import { getStoredSchoolConfig, saveSchoolConfig } from './utils/schoolStorage';
import { 
  syncSchoolConfigWithCloud,
  saveSchoolConfigToCloud,
  syncStudentsWithCloud,
  saveStudentsToCloud,
  deleteStudentFromCloud,
  syncClassesWithCloud,
  saveClassesToCloud,
  deleteClassFromCloud,
  syncRecordsWithCloud,
  saveRecordsToCloud,
  deleteRecordFromCloud
} from './lib/firebase';

import { Navbar } from './components/Navbar';
import { AttendanceSheet } from './components/AttendanceSheet';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { StudentRoster } from './components/StudentRoster';
import { ReportsView } from './components/ReportsView';
import { ClassManagerModal } from './components/ClassManagerModal';
import { PeriodManagerModal } from './components/PeriodManagerModal';
import { LoginPage } from './components/LoginPage';
import { TeacherManagerModal } from './components/TeacherManagerModal';
import { SchoolSettingsModal } from './components/SchoolSettingsModal';

const STORAGE_KEY_STUDENTS = 'timemark_students_v1';
const STORAGE_KEY_CLASSES = 'timemark_classes_v1';
const STORAGE_KEY_RECORDS = 'timemark_records_v1';
const STORAGE_KEY_PERIODS = 'timemark_periods_v1';

export default function App() {
  // Today's date YYYY-MM-DD
  const todayStr = formatDateYYYYMMDD(new Date());

  // State initialization with localStorage fallback
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STUDENTS);
      return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
    } catch (e) {
      return INITIAL_STUDENTS;
    }
  });

  const [classes, setClasses] = useState<ClassSubject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CLASSES);
      return saved ? JSON.parse(saved) : INITIAL_CLASSES;
    } catch (e) {
      return INITIAL_CLASSES;
    }
  });

  const [periods, setPeriods] = useState<Period[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PERIODS);
      return saved ? JSON.parse(saved) : DEFAULT_PERIODS;
    } catch (e) {
      return DEFAULT_PERIODS;
    }
  });

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(() => {
    const active = getActivePeriod(DEFAULT_PERIODS);
    return active.id;
  });

  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      return saved ? JSON.parse(saved) : generateInitialRecords();
    } catch (e) {
      return generateInitialRecords();
    }
  });

  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeTab, setActiveTab] = useState<'sheet' | 'analytics' | 'roster' | 'reports'>('sheet');

  // School Branding Config
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>(() => getStoredSchoolConfig());
  const [isSchoolSettingsOpen, setIsSchoolSettingsOpen] = useState(false);
  const [isLoadingCloudData, setIsLoadingCloudData] = useState(false);

  const handleUpdateSchoolConfig = (newConfig: SchoolConfig) => {
    setSchoolConfig(newConfig);
    saveSchoolConfig(newConfig);
    saveSchoolConfigToCloud(newConfig).catch(err => console.error('Failed to sync school config to cloud:', err));
  };

  // Authentication & Accounts state
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getStoredCurrentUser());
  const [isTeacherManagerOpen, setIsTeacherManagerOpen] = useState(false);

  // Modals
  const [isClassManagerOpen, setIsClassManagerOpen] = useState(false);
  const [isPeriodManagerOpen, setIsPeriodManagerOpen] = useState(false);
  const [profileStudent, setProfileStudent] = useState<Student | null>(null);

  // Synchronize school config, students, classes, and records with Firebase Firestore on login or mount
  useEffect(() => {
    if (!currentUser) return;

    let isSubscribed = true;
    
    const performFullCloudSync = async () => {
      setIsLoadingCloudData(true);
      try {
        // 1. Sync School Config
        const syncedConfig = await syncSchoolConfigWithCloud(schoolConfig);
        if (isSubscribed) {
          setSchoolConfig(syncedConfig);
          saveSchoolConfig(syncedConfig);
        }

        // 2. Sync Students
        const syncedStudents = await syncStudentsWithCloud(students);
        if (isSubscribed) {
          setStudents(syncedStudents);
          localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(syncedStudents));
        }

        // 3. Sync Classes
        const syncedClasses = await syncClassesWithCloud(classes);
        if (isSubscribed) {
          setClasses(syncedClasses);
          localStorage.setItem(STORAGE_KEY_CLASSES, JSON.stringify(syncedClasses));
          if (syncedClasses.length > 0 && !selectedClassId) {
            setSelectedClassId(syncedClasses[0].id);
          }
        }

        // 4. Sync Attendance Records
        const syncedRecords = await syncRecordsWithCloud(records);
        if (isSubscribed) {
          setRecords(syncedRecords);
          localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(syncedRecords));
        }
      } catch (err) {
        console.error('Firebase cloud sync failed:', err);
      } finally {
        if (isSubscribed) {
          setIsLoadingCloudData(false);
        }
      }
    };

    performFullCloudSync();

    return () => {
      isSubscribed = false;
    };
  }, [currentUser]);

  // Auth Session Handlers
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setCurrentUserSession(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserSession(null);
  };

  const handleSwitchUserSession = (newUser: UserAccount) => {
    setCurrentUser(newUser);
    setCurrentUserSession(newUser);
  };

  // Legacy demo data migration cleanup
  useEffect(() => {
    try {
      const savedStudents = localStorage.getItem(STORAGE_KEY_STUDENTS);
      const savedClasses = localStorage.getItem(STORAGE_KEY_CLASSES);
      
      let shouldPurge = false;
      
      if (savedStudents) {
        const parsedStu = JSON.parse(savedStudents);
        if (Array.isArray(parsedStu) && parsedStu.some(s => s.id === 'stu-1' || s.name === 'Sophia Chen')) {
          shouldPurge = true;
        }
      }
      
      if (savedClasses) {
        const parsedCls = JSON.parse(savedClasses);
        if (Array.isArray(parsedCls) && parsedCls.some(c => c.id === 'cls-1' || c.name === 'Computer Science' || c.code === 'CS-101')) {
          shouldPurge = true;
        }
      }
      
      if (shouldPurge) {
        localStorage.removeItem(STORAGE_KEY_STUDENTS);
        localStorage.removeItem(STORAGE_KEY_CLASSES);
        localStorage.removeItem(STORAGE_KEY_RECORDS);
        
        setStudents([]);
        setClasses([]);
        setRecords([]);
        
        window.location.reload();
      }
    } catch (e) {}
  }, []);

  // Sync state to localStorage and cloud
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
      if (currentUser && !isLoadingCloudData) {
        saveStudentsToCloud(students).catch(err => console.error('Cloud students sync failed:', err));
      }
    } catch (e) {}
  }, [students, currentUser, isLoadingCloudData]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CLASSES, JSON.stringify(classes));
      if (currentUser && !isLoadingCloudData) {
        saveClassesToCloud(classes).catch(err => console.error('Cloud classes sync failed:', err));
      }
    } catch (e) {}
  }, [classes, currentUser, isLoadingCloudData]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PERIODS, JSON.stringify(periods));
    } catch (e) {}
  }, [periods]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
      if (currentUser && !isLoadingCloudData) {
        saveRecordsToCloud(records).catch(err => console.error('Cloud records sync failed:', err));
      }
    } catch (e) {}
  }, [records, currentUser, isLoadingCloudData]);

  // Selected Class object
  const currentClass = classes.find(c => c.id === selectedClassId) || classes[0];

  // Handler: Update individual attendance record
  const handleUpdateRecord = (
    studentId: string,
    status: AttendanceStatus,
    customCheckInTime?: string | null,
    customNotes?: string,
    targetPeriodId?: string
  ) => {
    const periodIdToUse = targetPeriodId || selectedPeriodId;
    const targetPeriod = periods.find(p => p.id === periodIdToUse) || periods[0];

    const existingIndex = records.findIndex(
      r => r.studentId === studentId && 
           r.classId === selectedClassId && 
           r.date === selectedDate && 
           ((r.periodId || 'p1') === periodIdToUse)
    );

    let checkInTimeStr = customCheckInTime;
    if (checkInTimeStr === undefined) {
      checkInTimeStr = (status === 'PRESENT' || status === 'LATE' || status === 'EXCUSED')
        ? formatTime12h(new Date(), false)
        : null;
    }

    const startTimeToUse = targetPeriod.startTime || (currentClass?.startTime || '09:00');
    const minsLate = (status === 'LATE' && checkInTimeStr)
      ? calculateMinutesLate(checkInTimeStr, startTimeToUse)
      : (status === 'PRESENT' ? 0 : (existingIndex >= 0 ? records[existingIndex].minutesLate : 0));

    const updatedRecord: AttendanceRecord = {
      id: existingIndex >= 0 ? records[existingIndex].id : `rec-${selectedDate}-${studentId}-${selectedClassId}-${periodIdToUse}`,
      studentId,
      classId: selectedClassId,
      date: selectedDate,
      periodId: periodIdToUse,
      checkInTime: status === 'ABSENT' ? null : checkInTimeStr,
      checkOutTime: existingIndex >= 0 ? records[existingIndex].checkOutTime : null,
      status,
      minutesLate: minsLate,
      notes: customNotes !== undefined ? customNotes : (existingIndex >= 0 ? records[existingIndex].notes : ''),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      const copy = [...records];
      copy[existingIndex] = updatedRecord;
      setRecords(copy);
    } else {
      setRecords([updatedRecord, ...records]);
    }
  };

  // Handler: Checkout
  const handleCheckOutRecord = (studentId: string, targetPeriodId?: string) => {
    const periodIdToUse = targetPeriodId || selectedPeriodId;
    const now12h = formatTime12h(new Date(), false);
    setRecords(prev => prev.map(r => {
      if (
        r.studentId === studentId && 
        r.classId === selectedClassId && 
        r.date === selectedDate &&
        ((r.periodId || 'p1') === periodIdToUse)
      ) {
        return { ...r, checkOutTime: now12h, updatedAt: new Date().toISOString() };
      }
      return r;
    }));
  };

  // Handler: Bulk Mark
  const handleMarkAll = (status: AttendanceStatus, targetPeriodId?: string) => {
    const periodIdToUse = targetPeriodId || selectedPeriodId;
    const targetPeriod = periods.find(p => p.id === periodIdToUse) || periods[0];
    const enrolledStudentIds = currentClass?.studentIds || [];
    const now12h = formatTime12h(new Date(), false);

    const updatedRecords = [...records];

    enrolledStudentIds.forEach(sId => {
      const idx = updatedRecords.findIndex(
        r => r.studentId === sId && 
             r.classId === selectedClassId && 
             r.date === selectedDate &&
             ((r.periodId || 'p1') === periodIdToUse)
      );

      const startTimeToUse = targetPeriod.startTime || (currentClass?.startTime || '09:00');
      const minsLate = status === 'LATE' ? calculateMinutesLate(now12h, startTimeToUse) : 0;

      const rec: AttendanceRecord = {
        id: idx >= 0 ? updatedRecords[idx].id : `rec-${selectedDate}-${sId}-${selectedClassId}-${periodIdToUse}`,
        studentId: sId,
        classId: selectedClassId,
        date: selectedDate,
        periodId: periodIdToUse,
        checkInTime: status === 'ABSENT' ? null : now12h,
        checkOutTime: null,
        status,
        minutesLate: minsLate,
        updatedAt: new Date().toISOString()
      };

      if (idx >= 0) {
        updatedRecords[idx] = rec;
      } else {
        updatedRecords.push(rec);
      }
    });

    setRecords(updatedRecords);
  };

  // Student Roster CRUD
  const handleAddStudent = (newStudentData: Omit<Student, 'id'>) => {
    const newStudent: Student = {
      ...newStudentData,
      id: `stu-${Date.now()}`
    };
    setStudents([newStudent, ...students]);

    // Auto-enroll in current class
    if (currentClass) {
      setClasses(prev => prev.map(c => {
        if (c.id === currentClass.id) {
          return { ...c, studentIds: [...c.studentIds, newStudent.id] };
        }
        return c;
      }));
    }
  };

  const handleAddBulkStudents = (newStudentsList: Student[]) => {
    setStudents(prev => [...newStudentsList, ...prev]);

    // Auto-enroll all newly created bulk students into all existing classes so they show up everywhere
    const newIds = newStudentsList.map(s => s.id);
    setClasses(prev => prev.map(c => ({
      ...c,
      studentIds: Array.from(new Set([...c.studentIds, ...newIds]))
    })));
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));

    // Keep classes studentIds synced with updated student class/grade
    setClasses(prev => prev.map(c => {
      const isMatchingClass = 
        updatedStudent.grade === 'All Classes' ||
        c.name.trim().toLowerCase() === updatedStudent.grade.trim().toLowerCase() ||
        c.code.trim().toLowerCase() === updatedStudent.grade.trim().toLowerCase();

      if (isMatchingClass) {
        return {
          ...c,
          studentIds: Array.from(new Set([...c.studentIds, updatedStudent.id]))
        };
      }
      return c;
    }));
  };

  const handleDeleteStudent = (id: string) => {
    const targetStudent = students.find(s => s.id === id || s.studentId === id);
    const idsToRemove = new Set<string>();
    idsToRemove.add(id);
    if (targetStudent) {
      idsToRemove.add(targetStudent.id);
      if (targetStudent.studentId) idsToRemove.add(targetStudent.studentId);
    }

    setStudents(prev => prev.filter(s => !idsToRemove.has(s.id) && !idsToRemove.has(s.studentId)));
    setClasses(prev => prev.map(c => ({
      ...c,
      studentIds: c.studentIds.filter(sId => !idsToRemove.has(sId))
    })));

    // Cloud deletions
    if (targetStudent) {
      deleteStudentFromCloud(targetStudent.id).catch(err => console.error('Cloud delete student failed:', err));
    } else {
      deleteStudentFromCloud(id).catch(err => console.error('Cloud delete student failed:', err));
    }

    const recordsToDelete = records.filter(r => idsToRemove.has(r.studentId));
    recordsToDelete.forEach(r => deleteRecordFromCloud(r.id).catch(err => console.error('Cloud delete record failed:', err)));

    setRecords(prev => prev.filter(r => !idsToRemove.has(r.studentId)));
  };

  const handleDeleteBulkStudents = (idsToDelete: string[]) => {
    const idsToRemove = new Set<string>(idsToDelete);
    students.forEach(s => {
      if (idsToDelete.includes(s.id) || idsToDelete.includes(s.studentId)) {
        idsToRemove.add(s.id);
        if (s.studentId) idsToRemove.add(s.studentId);
      }
    });

    setStudents(prev => prev.filter(s => !idsToRemove.has(s.id) && !idsToRemove.has(s.studentId)));
    setClasses(prev => prev.map(c => ({
      ...c,
      studentIds: c.studentIds.filter(sId => !idsToRemove.has(sId))
    })));

    // Cloud deletions
    idsToDelete.forEach(id => {
      const target = students.find(s => s.id === id || s.studentId === id);
      if (target) {
        deleteStudentFromCloud(target.id).catch(err => console.error('Cloud delete student failed:', err));
      } else {
        deleteStudentFromCloud(id).catch(err => console.error('Cloud delete student failed:', err));
      }
    });

    const recordsToDelete = records.filter(r => idsToRemove.has(r.studentId));
    recordsToDelete.forEach(r => deleteRecordFromCloud(r.id).catch(err => console.error('Cloud delete record failed:', err)));

    setRecords(prev => prev.filter(r => !idsToRemove.has(r.studentId)));
  };

  const handleDeleteAllStudents = () => {
    students.forEach(s => deleteStudentFromCloud(s.id).catch(err => console.error('Cloud delete student failed:', err)));
    records.forEach(r => deleteRecordFromCloud(r.id).catch(err => console.error('Cloud delete record failed:', err)));

    setStudents([]);
    setClasses(prev => prev.map(c => ({
      ...c,
      studentIds: []
    })));
    setRecords([]);
  };

  const handleDeleteRecord = (recordId: string) => {
    deleteRecordFromCloud(recordId).catch(err => console.error('Cloud delete record failed:', err));
    setRecords(prev => prev.filter(r => r.id !== recordId));
  };

  const handleDeleteStudentRecordForDate = (studentId: string, classId: string, date: string, targetPeriodId?: string) => {
    const periodIdToUse = targetPeriodId || selectedPeriodId;
    const targetStudent = students.find(s => s.id === studentId || s.studentId === studentId);
    const idsToMatch = new Set<string>();
    idsToMatch.add(studentId);
    if (targetStudent) {
      idsToMatch.add(targetStudent.id);
      if (targetStudent.studentId) idsToMatch.add(targetStudent.studentId);
    }

    const recordsToDelete = records.filter(r => (idsToMatch.has(r.studentId) && r.classId === classId && r.date === date && ((r.periodId || 'p1') === periodIdToUse)));
    recordsToDelete.forEach(r => deleteRecordFromCloud(r.id).catch(err => console.error('Cloud delete record failed:', err)));

    setRecords(prev => prev.filter(r => !(idsToMatch.has(r.studentId) && r.classId === classId && r.date === date && ((r.periodId || 'p1') === periodIdToUse))));
  };

  // Class CRUD
  const handleAddClass = (newClassData: Omit<ClassSubject, 'id'>) => {
    const newCls: ClassSubject = {
      ...newClassData,
      id: `cls-${Date.now()}`
    };
    setClasses([...classes, newCls]);
    setSelectedClassId(newCls.id);
  };

  const handleUpdateClass = (updated: ClassSubject) => {
    setClasses(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const handleDeleteClass = (id: string) => {
    deleteClassFromCloud(id).catch(err => console.error('Cloud delete class failed:', err));

    const remaining = classes.filter(c => c.id !== id);
    if (remaining.length === 0) {
      const defaultCls: ClassSubject = {
        id: `cls-${Date.now()}`,
        name: 'Class 10-A',
        code: 'CLS-10A',
        instructor: 'Staff Instructor',
        room: 'Room 101',
        startTime: '09:00',
        endTime: '10:30',
        gracePeriodMins: 10,
        daysOfWeek: ['Mon', 'Wed', 'Fri'],
        studentIds: students.map(s => s.id)
      };
      setClasses([defaultCls]);
      setSelectedClassId(defaultCls.id);
    } else {
      setClasses(remaining);
      if (selectedClassId === id) {
        setSelectedClassId(remaining[0].id);
      }
    }

    const recordsToDelete = records.filter(r => r.classId === id);
    recordsToDelete.forEach(r => deleteRecordFromCloud(r.id).catch(err => console.error('Cloud delete record failed:', err)));

    setRecords(prev => prev.filter(r => r.classId !== id));
  };

  // Export CSV
  const handleExportCSV = () => {
    const studentsMap = new Map<string, Student>();
    students.forEach(s => studentsMap.set(s.id, s));
    const classesMap = new Map<string, ClassSubject>();
    classes.forEach(c => classesMap.set(c.id, c));

    const csvContent = generateAttendanceCSV(records, studentsMap, classesMap);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `all_student_attendance_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} schoolConfig={schoolConfig} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        classes={classes}
        selectedClassId={selectedClassId}
        onSelectClass={setSelectedClassId}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        schoolConfig={schoolConfig}
        onOpenSchoolSettings={() => setIsSchoolSettingsOpen(true)}
        onOpenTeacherManager={() => setIsTeacherManagerOpen(true)}
        onOpenClassManager={() => setIsClassManagerOpen(true)}
        onOpenAddStudent={() => setActiveTab('roster')}
        onExportCSV={handleExportCSV}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {activeTab === 'sheet' && currentClass && (
          <AttendanceSheet
            currentClass={currentClass}
            classes={classes}
            onSelectClass={setSelectedClassId}
            students={students}
            records={records}
            selectedDate={selectedDate}
            periods={periods}
            selectedPeriodId={selectedPeriodId}
            onSelectPeriod={setSelectedPeriodId}
            onOpenPeriodManager={() => setIsPeriodManagerOpen(true)}
            onUpdateRecord={handleUpdateRecord}
            onCheckOutRecord={handleCheckOutRecord}
            onMarkAll={handleMarkAll}
            onOpenStudentProfile={setProfileStudent}
            onDeleteStudentRecordForDate={handleDeleteStudentRecordForDate}
            currentUser={currentUser}
            schoolConfig={schoolConfig}
            onUpdateClass={handleUpdateClass}
            onOpenClassManager={() => setIsClassManagerOpen(true)}
          />
        )}

        {activeTab === 'sheet' && !currentClass && (
          <div id="no-classes-empty-state" className="flex flex-col items-center justify-center text-center p-8 sm:p-12 md:p-16 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-xl max-w-lg mx-auto my-12">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 shadow-inner">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Classes Found</h2>
            <p className="text-sm text-slate-400 mb-6 max-w-sm">
              Please configure classes or sections to manage daily schedules, take student attendance, and assign period logs.
            </p>
            <button
              onClick={() => setIsClassManagerOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] cursor-pointer"
            >
              Add Your First Class
            </button>
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            students={students}
            classes={classes}
            records={records}
          />
        )}

        {activeTab === 'roster' && (
          <StudentRoster
            students={students}
            classes={classes}
            records={records}
            onAddStudent={handleAddStudent}
            onAddBulkStudents={handleAddBulkStudents}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onDeleteBulkStudents={handleDeleteBulkStudents}
            onDeleteAllStudents={handleDeleteAllStudents}
            onOpenClassManager={() => setIsClassManagerOpen(true)}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            students={students}
            classes={classes}
            records={records}
          />
        )}

      </main>

      {/* Class Manager Modal */}
      <ClassManagerModal
        isOpen={isClassManagerOpen}
        onClose={() => setIsClassManagerOpen(false)}
        classes={classes}
        students={students}
        onAddClass={handleAddClass}
        onUpdateClass={handleUpdateClass}
        onDeleteClass={handleDeleteClass}
        onOpenTeacherManager={() => setIsTeacherManagerOpen(true)}
      />

      {/* 40-Minute Period Manager Modal */}
      <PeriodManagerModal
        isOpen={isPeriodManagerOpen}
        onClose={() => setIsPeriodManagerOpen(false)}
        periods={periods}
        onSavePeriods={setPeriods}
        onOpenTeacherManager={() => setIsTeacherManagerOpen(true)}
      />

      {/* Teacher Management Modal for Administrator */}
      {currentUser.role === 'ADMIN' && (
        <TeacherManagerModal
          isOpen={isTeacherManagerOpen}
          onClose={() => setIsTeacherManagerOpen(false)}
          currentUser={currentUser}
          periods={periods}
        />
      )}

      {/* School Settings Modal */}
      <SchoolSettingsModal
        isOpen={isSchoolSettingsOpen}
        onClose={() => setIsSchoolSettingsOpen(false)}
        currentConfig={schoolConfig}
        onUpdateConfig={handleUpdateSchoolConfig}
      />

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 py-4 text-center text-xs mt-auto">
        <p>EMIS Attendance System • Logged in as <strong className="text-slate-300">{currentUser.name}</strong> ({currentUser.role === 'ADMIN' ? 'Administrator' : 'Teacher'})</p>
      </footer>

    </div>
  );
}
