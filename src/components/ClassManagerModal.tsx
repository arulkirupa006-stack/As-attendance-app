import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  X, 
  Check, 
  Edit2, 
  UserCheck, 
  UserPlus, 
  Clock, 
  Users, 
  Key, 
  AlertCircle,
  Save,
  ChevronDown,
  Search
} from 'lucide-react';
import { ClassSubject, Student, Period, DEFAULT_PERIODS, UserAccount } from '../types';
import { getStoredAccounts, createNewAccount } from '../utils/authStorage';

interface ClassManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassSubject[];
  students: Student[];
  onAddClass: (newClass: Omit<ClassSubject, 'id'>) => void;
  onUpdateClass: (updated: ClassSubject) => void;
  onDeleteClass: (id: string) => void;
  onOpenTeacherManager?: () => void;
}

interface PeriodFormState {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  assignedTeacherId: string;
  // Inline new teacher creation
  isCreatingNewTeacher: boolean;
  newTeacherName: string;
  newTeacherUsername: string;
  newTeacherPassword: string;
}

const DEFAULT_8_PERIODS_SCHEDULE = [
  { id: 'p1', name: 'Period 1', startTime: '09:00', endTime: '09:40', subjectName: 'Mathematics' },
  { id: 'p2', name: 'Period 2', startTime: '09:40', endTime: '10:20', subjectName: 'English Language' },
  { id: 'p3', name: 'Period 3', startTime: '10:20', endTime: '11:00', subjectName: 'Physics' },
  { id: 'p4', name: 'Period 4', startTime: '11:00', endTime: '11:40', subjectName: 'Computer Science' },
  { id: 'p5', name: 'Period 5', startTime: '11:40', endTime: '12:20', subjectName: 'Chemistry' },
  { id: 'p6', name: 'Period 6', startTime: '13:00', endTime: '13:40', subjectName: 'World Literature' },
  { id: 'p7', name: 'Period 7', startTime: '13:40', endTime: '14:20', subjectName: 'Biology' },
  { id: 'p8', name: 'Period 8', startTime: '14:20', endTime: '15:00', subjectName: 'History & Civics' },
];

export const ClassManagerModal: React.FC<ClassManagerModalProps> = ({
  isOpen,
  onClose,
  classes,
  students,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onOpenTeacherManager,
}) => {
  // Mode: list | form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  // Form Fields
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('Section A');
  const [code, setCode] = useState('');
  
  // Class Teacher
  const [selectedClassTeacherId, setSelectedClassTeacherId] = useState('');
  const [isCreatingClassTeacher, setIsCreatingClassTeacher] = useState(false);
  const [newClassTeacherName, setNewClassTeacherName] = useState('');
  const [newClassTeacherUsername, setNewClassTeacherUsername] = useState('');
  const [newClassTeacherPassword, setNewClassTeacherPassword] = useState('');

  // 8 Periods Definition
  const [periodsState, setPeriodsState] = useState<PeriodFormState[]>([]);

  // Enrolled Students
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // Available teachers
  const [teachers, setTeachers] = useState<UserAccount[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassSubject | null>(null);

  // Refresh teachers list
  const refreshTeachers = () => {
    const all = getStoredAccounts();
    setTeachers(all.filter(a => a.role === 'TEACHER'));
  };

  useEffect(() => {
    if (isOpen) {
      refreshTeachers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const initNewForm = () => {
    refreshTeachers();
    const teachersList = getStoredAccounts().filter(a => a.role === 'TEACHER');
    const defaultTeacherId = teachersList.length > 0 ? teachersList[0].id : '';

    setEditingClassId(null);
    setClassName('Grade 10');
    setSection('Section A');
    setCode('G10-A');
    setSelectedClassTeacherId(defaultTeacherId);
    setIsCreatingClassTeacher(false);
    setNewClassTeacherName('');
    setNewClassTeacherUsername('');
    setNewClassTeacherPassword('');

    // Initialize 8 periods with default schedule and rotation of teachers
    const initialPeriods: PeriodFormState[] = DEFAULT_8_PERIODS_SCHEDULE.map((p, idx) => ({
      id: p.id,
      name: p.name,
      startTime: p.startTime,
      endTime: p.endTime,
      subjectName: p.subjectName,
      assignedTeacherId: teachersList.length > 0 ? teachersList[idx % teachersList.length].id : '',
      isCreatingNewTeacher: false,
      newTeacherName: '',
      newTeacherUsername: '',
      newTeacherPassword: ''
    }));

    setPeriodsState(initialPeriods);
    setSelectedStudentIds(students.map(s => s.id));
    setStudentSearchTerm('');
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const handleStartEdit = (cls: ClassSubject) => {
    refreshTeachers();
    const teachersList = getStoredAccounts().filter(a => a.role === 'TEACHER');

    setEditingClassId(cls.id);
    const sec = cls.section || 'Section A';
    let baseName = cls.name;
    if (sec && cls.name.includes(sec)) {
      baseName = cls.name.replace(new RegExp(`\\s*[-–—]\\s*${sec}`, 'i'), '').trim();
    } else if (cls.name.includes(' - Section')) {
      baseName = cls.name.split(' - Section')[0].trim();
    }
    setClassName(baseName);
    setSection(sec);
    setCode(cls.code);
    setSelectedClassTeacherId(cls.classTeacherId || (teachersList.length > 0 ? teachersList[0].id : ''));
    setIsCreatingClassTeacher(false);
    setNewClassTeacherName('');
    setNewClassTeacherUsername('');
    setNewClassTeacherPassword('');

    // If the class already had 8 periods defined, use them; otherwise fallback to defaults
    const existingPeriods = cls.periods && cls.periods.length === 8 ? cls.periods : DEFAULT_8_PERIODS_SCHEDULE.map((p, idx) => ({
      id: p.id,
      name: p.name,
      startTime: p.startTime,
      endTime: p.endTime,
      durationMins: 40,
      assignedTeacherId: teachersList.length > 0 ? teachersList[idx % teachersList.length].id : '',
      subjectName: p.subjectName
    }));

    const formattedPeriods: PeriodFormState[] = existingPeriods.map(p => ({
      id: p.id,
      name: p.name,
      startTime: p.startTime,
      endTime: p.endTime,
      subjectName: p.subjectName || 'General',
      assignedTeacherId: p.assignedTeacherId || (teachersList.length > 0 ? teachersList[0].id : ''),
      isCreatingNewTeacher: false,
      newTeacherName: '',
      newTeacherUsername: '',
      newTeacherPassword: ''
    }));

    setPeriodsState(formattedPeriods);
    setSelectedStudentIds(cls.studentIds || []);
    setStudentSearchTerm('');
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const toggleStudentSelection = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(sId => sId !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const handleSelectAllStudents = () => {
    setSelectedStudentIds(students.map(s => s.id));
  };

  const handleDeselectAllStudents = () => {
    setSelectedStudentIds([]);
  };

  const updatePeriodField = (index: number, field: keyof PeriodFormState, value: any) => {
    setPeriodsState(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanClassName = className.trim();
    const cleanSection = section.trim();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanClassName || !cleanCode) {
      setErrorMsg('Class Name and Class Code are required.');
      return;
    }

    let classTeacherIdToSave = selectedClassTeacherId;
    let classTeacherNameToSave = '';

    // If creating a new Class Teacher account with username and password
    if (isCreatingClassTeacher) {
      if (!newClassTeacherName.trim() || !newClassTeacherUsername.trim() || !newClassTeacherPassword.trim()) {
        setErrorMsg('Please provide Name, Username, and Password for the new Class Teacher.');
        return;
      }

      const res = createNewAccount({
        name: newClassTeacherName.trim(),
        username: newClassTeacherUsername.trim(),
        password: newClassTeacherPassword.trim(),
        email: `${newClassTeacherUsername.trim().toLowerCase()}@school.edu`,
        role: 'TEACHER',
        department: `${cleanClassName} Faculty`
      });

      if (!res.success || !res.user) {
        setErrorMsg(`Failed to create Class Teacher login: ${res.error || 'Unknown error'}`);
        return;
      }

      classTeacherIdToSave = res.user.id;
      classTeacherNameToSave = res.user.name;
    } else {
      const foundTeacher = teachers.find(t => t.id === selectedClassTeacherId);
      classTeacherNameToSave = foundTeacher ? foundTeacher.name : 'Unassigned';
    }

    // Process the 8 periods and create any inline teacher accounts
    const finalizedPeriods: Period[] = [];

    for (let i = 0; i < periodsState.length; i++) {
      const pState = periodsState[i];
      let assignedTeacherId = pState.assignedTeacherId;

      if (pState.isCreatingNewTeacher) {
        if (!pState.newTeacherName.trim() || !pState.newTeacherUsername.trim() || !pState.newTeacherPassword.trim()) {
          setErrorMsg(`Please provide Name, Username, and Password for the new teacher in ${pState.name}.`);
          return;
        }

        const tRes = createNewAccount({
          name: pState.newTeacherName.trim(),
          username: pState.newTeacherUsername.trim(),
          password: pState.newTeacherPassword.trim(),
          email: `${pState.newTeacherUsername.trim().toLowerCase()}@school.edu`,
          role: 'TEACHER',
          department: pState.subjectName || 'Academics'
        });

        if (!tRes.success || !tRes.user) {
          setErrorMsg(`Failed to create teacher for ${pState.name}: ${tRes.error || 'Unknown error'}`);
          return;
        }

        assignedTeacherId = tRes.user.id;
      }

      finalizedPeriods.push({
        id: pState.id || `p${i + 1}`,
        name: pState.name || `Period ${i + 1}`,
        startTime: pState.startTime,
        endTime: pState.endTime,
        durationMins: 40,
        assignedTeacherId: assignedTeacherId,
        subjectName: pState.subjectName.trim() || 'General Subject'
      });
    }

    // Full display title
    const fullDisplayName = cleanSection ? `${cleanClassName} - ${cleanSection}` : cleanClassName;

    if (editingClassId) {
      // Update existing class
      const target = classes.find(c => c.id === editingClassId);
      const updatedClass: ClassSubject = {
        id: editingClassId,
        name: fullDisplayName,
        section: cleanSection,
        code: cleanCode,
        classTeacherId: classTeacherIdToSave,
        classTeacherName: classTeacherNameToSave,
        periods: finalizedPeriods,
        daysOfWeek: target?.daysOfWeek || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        studentIds: selectedStudentIds
      };

      onUpdateClass(updatedClass);
      setNotification(`Class "${fullDisplayName}" was updated successfully!`);
    } else {
      // Create new class
      const newClassData: Omit<ClassSubject, 'id'> = {
        name: fullDisplayName,
        section: cleanSection,
        code: cleanCode,
        classTeacherId: classTeacherIdToSave,
        classTeacherName: classTeacherNameToSave,
        periods: finalizedPeriods,
        daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        studentIds: selectedStudentIds
      };

      onAddClass(newClassData);
      setNotification(`New Class "${fullDisplayName}" created with 8 periods and assigned teachers!`);
    }

    refreshTeachers();
    setIsFormOpen(false);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
    s.studentId.toLowerCase().includes(studentSearchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-5 shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">Classes & Sections Management</h2>
              <p className="text-xs text-slate-400">
                Define classes, assign class teachers, configure 8 periods with teacher logins, and sync students
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Notification */}
        {notification && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ========================================================== */}
        {/* VIEW 1: LIST OF CLASSES & SECTIONS                         */}
        {/* ========================================================== */}
        {!isFormOpen ? (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
              <span className="text-xs font-semibold uppercase text-slate-400">
                Active Classes & Sections ({classes.length})
              </span>
              <div className="flex items-center gap-2">
                {onOpenTeacherManager && (
                  <button
                    onClick={onOpenTeacherManager}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Teacher Adding</span>
                  </button>
                )}

                <button
                  onClick={initNewForm}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-md shadow-emerald-600/30"
                >
                  <Plus className="w-4 h-4" /> Add New Class & Section
                </button>
              </div>
            </div>

            {/* Classes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {classes.map((cls) => {
                const classTeacher = teachers.find(t => t.id === cls.classTeacherId);
                const periodCount = cls.periods?.length || 8;

                return (
                  <div 
                    key={cls.id} 
                    className="bg-slate-950 p-4 rounded-2xl border border-slate-800/90 hover:border-slate-700 flex flex-col justify-between space-y-3 transition-colors shadow-sm"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {cls.code}
                          </span>
                          <h4 className="font-bold text-white text-base mt-1.5">{cls.name}</h4>
                          {cls.section && (
                            <span className="text-xs text-slate-400 font-medium">{cls.section}</span>
                          )}
                        </div>

                        {/* Action buttons: Edit/Rename and Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleStartEdit(cls)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-indigo-200 border border-slate-800 text-xs font-semibold transition-colors"
                            title="Edit class name, section, class teacher, or 8 periods"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Edit / Rename</span>
                          </button>

                          <button
                            onClick={() => setClassToDelete(cls)}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete Class"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Class Details & Assigned Teachers */}
                      <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Class Teacher:
                          </span>
                          <span className="font-semibold text-emerald-300">
                            {cls.classTeacherName || classTeacher?.name || 'Unassigned'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" /> Timetable:
                          </span>
                          <span className="font-medium text-slate-200">
                            {periodCount} Periods Configured
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-amber-400" /> Students:
                          </span>
                          <span className="font-semibold text-white">
                            {cls.studentIds.length} Enrolled
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ========================================================== */
          /* VIEW 2: ADD / EDIT CLASS & SECTION FORM                    */
          /* ========================================================== */
          <form onSubmit={handleSaveClass} className="space-y-5 flex-1 overflow-y-auto pr-1">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-emerald-300 flex items-center gap-2">
                {editingClassId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingClassId ? 'Edit Class & Section Details' : 'Configure New Class & Section'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                Back to Class List
              </button>
            </div>

            {/* 1. Basic Class Information */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block">
                1. Class & Section Identification
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Class Name * <span className="text-slate-400 font-normal">(Editable)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Grade 10"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Section *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Section A"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Class / Course Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. G10-A"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* 2. Class Teacher Assignment */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                  2. Assigned Class Teacher
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingClassTeacher(!isCreatingClassTeacher)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {isCreatingClassTeacher ? 'Select Existing Teacher' : '+ Create New Teacher Login'}
                </button>
              </div>

              {!isCreatingClassTeacher ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Choose Class Teacher
                  </label>
                  <select
                    value={selectedClassTeacherId}
                    onChange={(e) => setSelectedClassTeacherId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Unassigned Class Teacher --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} (@{t.username}) — {t.department}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* Inline New Class Teacher Credentials */
                <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                    <Key className="w-3.5 h-3.5" />
                    <span>Create New Teacher Account (Class Teacher)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-0.5">Teacher Full Name *</label>
                      <input
                        type="text"
                        required={isCreatingClassTeacher}
                        placeholder="e.g. Ms. Sarah Connor"
                        value={newClassTeacherName}
                        onChange={(e) => setNewClassTeacherName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-0.5">Username (Login ID) *</label>
                      <input
                        type="text"
                        required={isCreatingClassTeacher}
                        placeholder="e.g. sarah.connor"
                        value={newClassTeacherUsername}
                        onChange={(e) => setNewClassTeacherUsername(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-0.5">Password *</label>
                      <input
                        type="text"
                        required={isCreatingClassTeacher}
                        placeholder="e.g. teachpass123"
                        value={newClassTeacherPassword}
                        onChange={(e) => setNewClassTeacherPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. 8 Periods per Class Definition */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block">
                    3. Define 8 Periods for this Class
                  </span>
                  <p className="text-xs text-slate-400">
                    Set start/end timings, subject names, and assign specific teachers with login accounts to each period
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  8 Periods Active
                </span>
              </div>

              {/* 8 Periods Row List */}
              <div className="space-y-2.5">
                {periodsState.map((period, idx) => (
                  <div 
                    key={period.id || idx} 
                    className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      
                      {/* Period Name & Timings */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 min-w-[75px] text-center">
                          {period.name}
                        </span>
                        
                        <div className="flex items-center gap-1 text-xs">
                          <input
                            type="time"
                            value={period.startTime}
                            onChange={(e) => updatePeriodField(idx, 'startTime', e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 font-mono"
                          />
                          <span className="text-slate-500">–</span>
                          <input
                            type="time"
                            value={period.endTime}
                            onChange={(e) => updatePeriodField(idx, 'endTime', e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 font-mono"
                          />
                        </div>
                      </div>

                      {/* Subject Name Input */}
                      <div className="flex-1 max-w-xs">
                        <input
                          type="text"
                          placeholder="Subject Name (e.g. Mathematics)"
                          value={period.subjectName}
                          onChange={(e) => updatePeriodField(idx, 'subjectName', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 placeholder-slate-500"
                        />
                      </div>

                      {/* Assigned Teacher or Toggle New Login */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!period.isCreatingNewTeacher ? (
                          <select
                            value={period.assignedTeacherId}
                            onChange={(e) => updatePeriodField(idx, 'assignedTeacherId', e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 min-w-[150px]"
                          >
                            <option value="">-- Assign Teacher --</option>
                            {teachers.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name} (@{t.username})
                              </option>
                            ))}
                          </select>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => updatePeriodField(idx, 'isCreatingNewTeacher', !period.isCreatingNewTeacher)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                            period.isCreatingNewTeacher
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30'
                          }`}
                          title="Create a new teacher account with username & password for this period"
                        >
                          {period.isCreatingNewTeacher ? 'Use Existing' : '+ New Teacher Login'}
                        </button>
                      </div>

                    </div>

                    {/* Inline New Teacher Account for this Period */}
                    {period.isCreatingNewTeacher && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs animate-fade-in">
                        <div>
                          <label className="block text-[10px] font-medium text-amber-300 mb-0.5">Teacher Full Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Dr. Jane Doe"
                            value={period.newTeacherName}
                            onChange={(e) => updatePeriodField(idx, 'newTeacherName', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-amber-300 mb-0.5">Username (Login) *</label>
                          <input
                            type="text"
                            placeholder="e.g. jane.doe"
                            value={period.newTeacherUsername}
                            onChange={(e) => updatePeriodField(idx, 'newTeacherUsername', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-amber-300 mb-0.5">Password *</label>
                          <input
                            type="text"
                            placeholder="e.g. pass123"
                            value={period.newTeacherPassword}
                            onChange={(e) => updatePeriodField(idx, 'newTeacherPassword', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Enrolled Students Selector */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block">
                    4. Enrolled Students
                  </span>
                  <span className="text-xs text-slate-400">
                    {selectedStudentIds.length} of {students.length} students enrolled in this class
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllStudents}
                    className="text-[10px] font-semibold px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllStudents}
                    className="text-[10px] font-semibold px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Search box for students */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter students by name or student ID..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Scrollable list of students */}
              <div className="max-h-44 overflow-y-auto bg-slate-900/60 p-2 rounded-xl border border-slate-800/80 space-y-1 scrollbar-thin">
                {filteredStudents.map(s => {
                  const isSelected = selectedStudentIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleStudentSelection(s.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        isSelected 
                          ? 'bg-emerald-600/20 text-emerald-200 border border-emerald-500/30' 
                          : 'text-slate-400 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-[10px] text-slate-400">{s.studentId}</span>
                        <span className="font-medium text-slate-200">{s.name}</span>
                        <span className="text-[10px] text-slate-500">({s.grade})</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{editingClassId ? 'Save Class & Timetable Changes' : 'Create Class & Timetable'}</span>
              </button>
            </div>

          </form>
        )}

      </div>

      {/* Delete Confirmation Modal */}
      {classToDelete && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in rounded-3xl">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Permanently Delete Class?</h3>
              <p className="text-slate-400 text-sm mt-1.5">
                Are you sure you want to delete <span className="font-semibold text-slate-200">"{classToDelete.name}"</span> ({classToDelete.code})? All enrolled records for this class will be removed.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClassToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteClass(classToDelete.id);
                  setNotification(`Class "${classToDelete.name}" was deleted successfully.`);
                  setClassToDelete(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
