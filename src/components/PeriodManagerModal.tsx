import React, { useState } from 'react';
import { 
  Clock, 
  Plus, 
  Trash2, 
  X, 
  RefreshCw, 
  Sparkles, 
  Check, 
  Edit2, 
  GraduationCap, 
  UserCheck, 
  BookOpen, 
  Building2,
  Calendar,
  Layers
} from 'lucide-react';
import { Period, UserAccount } from '../types';
import { getStoredAccounts } from '../utils/authStorage';

interface PeriodManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  periods: Period[];
  onSavePeriods: (periods: Period[]) => void;
  onOpenTeacherManager?: () => void;
}

export const PeriodManagerModal: React.FC<PeriodManagerModalProps> = ({
  isOpen,
  onClose,
  periods,
  onSavePeriods,
  onOpenTeacherManager,
}) => {
  const [localPeriods, setLocalPeriods] = useState<Period[]>(periods);
  const [teachers, setTeachers] = useState<UserAccount[]>(() => 
    getStoredAccounts().filter(acc => acc.role === 'TEACHER')
  );

  const [isAdding, setIsAdding] = useState(false);
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);

  // Add / Edit form fields
  const [formName, setFormName] = useState('');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formDuration, setFormDuration] = useState(40);
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formRoom, setFormRoom] = useState('');

  if (!isOpen) return null;

  // Calculate end time string from start time + duration
  const calculateEndTime = (start: string, durationMins: number): string => {
    const [h, m] = start.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + durationMins, 0, 0);
    const endH = date.getHours().toString().padStart(2, '0');
    const endM = date.getMinutes().toString().padStart(2, '0');
    return `${endH}:${endM}`;
  };

  const handleTeacherMappingChange = (periodId: string, teacherId: string) => {
    const updated = localPeriods.map(p => {
      if (p.id === periodId) {
        return { ...p, assignedTeacherId: teacherId || undefined };
      }
      return p;
    });
    setLocalPeriods(updated);
    onSavePeriods(updated);
  };

  const handleOpenAdd = () => {
    setEditingPeriodId(null);
    setFormName(`Period ${localPeriods.length + 1}`);
    const lastPeriod = localPeriods[localPeriods.length - 1];
    setFormStartTime(lastPeriod ? lastPeriod.endTime : '09:00');
    setFormDuration(40);
    setFormTeacherId(teachers[0]?.id || '');
    setFormSubject('');
    setFormRoom(`Room 10${(localPeriods.length % 5) + 1}`);
    setIsAdding(true);
  };

  const handleOpenEdit = (p: Period) => {
    setEditingPeriodId(p.id);
    setFormName(p.name);
    setFormStartTime(p.startTime);
    setFormDuration(p.durationMins || 40);
    setFormTeacherId(p.assignedTeacherId || '');
    setFormSubject(p.subjectName || '');
    setFormRoom(p.room || '');
    setIsAdding(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const endTime = calculateEndTime(formStartTime, formDuration);

    if (editingPeriodId) {
      const updated = localPeriods.map(p => {
        if (p.id === editingPeriodId) {
          return {
            ...p,
            name: formName.trim(),
            startTime: formStartTime,
            endTime,
            durationMins: formDuration,
            assignedTeacherId: formTeacherId || undefined,
            subjectName: formSubject.trim() || undefined,
            room: formRoom.trim() || undefined,
          };
        }
        return p;
      });
      setLocalPeriods(updated);
      onSavePeriods(updated);
    } else {
      const newPeriod: Period = {
        id: `p-${Date.now()}`,
        name: formName.trim(),
        startTime: formStartTime,
        endTime,
        durationMins: formDuration,
        assignedTeacherId: formTeacherId || undefined,
        subjectName: formSubject.trim() || undefined,
        room: formRoom.trim() || undefined,
      };
      const updated = [...localPeriods, newPeriod].sort((a, b) => a.startTime.localeCompare(b.startTime));
      setLocalPeriods(updated);
      onSavePeriods(updated);
    }

    setIsAdding(false);
    setEditingPeriodId(null);
  };

  const handleDeletePeriod = (id: string) => {
    if (localPeriods.length <= 1) {
      alert('You must keep at least one active period in the system.');
      return;
    }
    const updated = localPeriods.filter(p => p.id !== id);
    setLocalPeriods(updated);
    onSavePeriods(updated);
  };

  // Preset: Exactly 8 periods with automatic teacher rotation
  const handleGenerateStandard8Periods = () => {
    if (confirm('Setup exactly 8 standard periods (40 mins each) and map teachers across each period?')) {
      const sampleSubjects = [
        'Mathematics',
        'English Language',
        'Physics',
        'Computer Science',
        'Algebra II',
        'World Literature',
        'Chemistry Lab',
        'Robotics & AI',
      ];

      const generated: Period[] = [];
      let currentStart = '09:00';

      for (let i = 1; i <= 8; i++) {
        // Lunch recess between period 5 & 6
        if (i === 6 && currentStart < '13:00') {
          currentStart = '13:00';
        }
        const end = calculateEndTime(currentStart, 40);
        // Map one teacher in rotation if teachers are available
        const teacherForPeriod = teachers.length > 0 
          ? teachers[(i - 1) % teachers.length] 
          : undefined;

        generated.push({
          id: `p${i}`,
          name: `Period ${i}`,
          startTime: currentStart,
          endTime: end,
          durationMins: 40,
          assignedTeacherId: teacherForPeriod?.id,
          subjectName: sampleSubjects[i - 1] || `Subject ${i}`,
          room: `Room 10${(i % 4) + 1}`,
        });
        currentStart = end;
      }

      setLocalPeriods(generated);
      onSavePeriods(generated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Period Assignment & Teacher Mapping</h3>
              <p className="text-xs text-slate-400">
                Assign exactly 8 periods and map one teacher to each period. Each teacher sees only their assigned period.
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

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateStandard8Periods}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all hover:scale-[1.01]"
              title="Reset schedule to standard 8 consecutive 40-minute periods"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Setup Exactly 8 Standard Periods</span>
            </button>

            {onOpenTeacherManager && (
              <button
                onClick={onOpenTeacherManager}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
              >
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Teacher Adding</span>
              </button>
            )}
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Period</span>
          </button>
        </div>

        {/* Periods Table / List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
          {localPeriods.map((period, index) => {
            const mappedTeacher = teachers.find(t => t.id === period.assignedTeacherId);

            return (
              <div
                key={period.id}
                className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 hover:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {index + 1}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">{period.name}</h4>
                      <span className="font-mono text-xs text-indigo-300 font-semibold px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/60">
                        {period.startTime} – {period.endTime}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                      {period.subjectName && (
                        <span className="flex items-center gap-1 text-slate-300">
                          <BookOpen className="w-3 h-3 text-indigo-400" />
                          {period.subjectName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Assigned Teacher Mapping Dropdown */}
                <div className="flex items-center gap-3 self-end md:self-center">
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] uppercase font-semibold text-slate-500">Assigned Teacher</span>
                    <select
                      value={period.assignedTeacherId || ''}
                      onChange={(e) => handleTeacherMappingChange(period.id, e.target.value)}
                      className={`text-xs rounded-xl px-2.5 py-1.5 border font-medium focus:outline-none transition-colors ${
                        mappedTeacher 
                          ? 'bg-slate-900 text-emerald-300 border-emerald-500/40' 
                          : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}
                    >
                      <option value="">-- No Teacher Assigned --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} (@{t.username}) {t.department ? `• ${t.department}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
                    <button
                      onClick={() => handleOpenEdit(period)}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
                      title="Edit period details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeletePeriod(period.id)}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-rose-900/30 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30"
                      title="Delete period"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Configured Periods: <strong className="text-white">{localPeriods.length}</strong> (Recommended: 8)</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30"
          >
            Done & Apply
          </button>
        </div>

      </div>

      {/* ========================================================== */}
      {/* SUB-MODAL: ADD / EDIT PERIOD                               */}
      {/* ========================================================== */}
      {isAdding && (
        <div className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="font-bold text-base text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                <span>{editingPeriodId ? 'Edit Period Timings' : 'Add New Timetable Period'}</span>
              </h4>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Period Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Period 1 or Morning Assembly"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time (24h) *</label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min={10}
                    max={180}
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mapped Teacher</label>
                <select
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- No Teacher Assigned --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} (@{t.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Subject / Course</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
                >
                  Save Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
