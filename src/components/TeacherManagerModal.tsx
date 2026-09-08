import React, { useState } from 'react';
import { 
  GraduationCap, 
  UserPlus, 
  Edit2, 
  Trash2, 
  X, 
  KeyRound, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Building2, 
  Mail, 
  User, 
  Clock, 
  Check,
  ShieldAlert,
  Upload,
  Download
} from 'lucide-react';
import { UserAccount, Period } from '../types';
import { getStoredAccounts, createNewAccount, updateAccount, deleteAccount } from '../utils/authStorage';
import { parseExcelTeacherFile, downloadSampleTeacherExcelTemplate } from '../utils/excelParser';

interface TeacherManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  periods: Period[];
  onTeachersUpdated?: () => void;
}

export const TeacherManagerModal: React.FC<TeacherManagerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  periods,
  onTeachersUpdated
}) => {
  const [accounts, setAccounts] = useState<UserAccount[]>(() => getStoredAccounts());
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<UserAccount | null>(null);

  // Form fields for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    department: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<UserAccount | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const result = await parseExcelTeacherFile(file);

      if (result.errors.length > 0 && result.teachers.length === 0) {
        setErrorMsg(`Import failed: ${result.errors[0]}`);
      } else {
        // Register teachers
        let addedCount = 0;
        let skipCount = 0;

        for (const teacher of result.teachers) {
          const res = createNewAccount({
            name: teacher.name || 'Unknown',
            username: teacher.username || '',
            password: teacher.password || 'password123',
            email: teacher.email,
            department: teacher.department,
            role: 'TEACHER',
          });

          if (res.success) {
            addedCount++;
          } else {
            skipCount++;
          }
        }

        let msg = `Successfully imported ${addedCount} teacher(s).`;
        if (skipCount > 0) {
          msg += ` Skipped ${skipCount} due to duplicate username or errors.`;
        }
        if (result.errors.length > 0) {
          msg += ` Some rows had issues.`;
        }

        setSuccessMsg(msg);
        refreshAccounts();
      }
    } catch (err: any) {
      setErrorMsg(`Import error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsImporting(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const refreshAccounts = () => {
    const list = getStoredAccounts();
    setAccounts(list);
    if (onTeachersUpdated) onTeachersUpdated();
  };

  const teachers = accounts.filter(acc => acc.role === 'TEACHER');

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.department && t.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openAddModal = () => {
    setEditingTeacher(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      email: '',
      department: '',
    });
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowPassword(false);
    setIsAddOpen(true);
  };

  const openEditModal = (teacher: UserAccount) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      username: teacher.username,
      password: teacher.password,
      email: teacher.email,
      department: teacher.department || '',
    });
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowPassword(false);
    setIsAddOpen(true);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!formData.name.trim() || !formData.username.trim() || !formData.password.trim()) {
      setErrorMsg('Teacher Full Name, Username, and Password are all required.');
      return;
    }

    if (formData.password.length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }

    if (editingTeacher) {
      // Update existing teacher
      const updated: UserAccount = {
        ...editingTeacher,
        name: formData.name.trim(),
        username: formData.username.trim(),
        password: formData.password.trim(),
        email: formData.email.trim() || `${formData.username.trim().toLowerCase()}@school.edu`,
        department: formData.department.trim() || 'General Faculty',
      };

      const res = updateAccount(updated);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update teacher.');
        return;
      }

      setSuccessMsg(`Teacher "${updated.name}" successfully updated!`);
      refreshAccounts();
      setIsAddOpen(false);
    } else {
      // Create new teacher
      const res = createNewAccount({
        name: formData.name.trim(),
        username: formData.username.trim(),
        password: formData.password.trim(),
        email: formData.email.trim() || `${formData.username.trim().toLowerCase()}@school.edu`,
        department: formData.department.trim() || 'General Faculty',
        role: 'TEACHER',
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to create teacher.');
        return;
      }

      setSuccessMsg(`New teacher "${formData.name.trim()}" created successfully!`);
      refreshAccounts();
      setIsAddOpen(false);
    }
  };

  const handleDeleteTeacher = (teacher: UserAccount) => {
    setTeacherToDelete(teacher);
  };

  const confirmDeleteTeacher = () => {
    if (!teacherToDelete) return;
    const res = deleteAccount(teacherToDelete.id, currentUser.role);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to delete teacher.');
      setTeacherToDelete(null);
      return;
    }
    setSuccessMsg(`Teacher "${teacherToDelete.name}" was permanently deleted.`);
    setTeacherToDelete(null);
    refreshAccounts();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Teacher Adding & Credentials</h3>
              <p className="text-xs text-slate-400">
                Add new teachers, configure accounts, and manage teacher credentials for attendance.
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

        {/* Notifications */}
        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search teachers by name, username, department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={downloadSampleTeacherExcelTemplate}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors text-xs font-semibold"
              title="Download Excel template for teacher import"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Template</span>
            </button>

            <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors text-xs font-semibold cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import Excel</span>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden"
                disabled={isImporting}
              />
            </label>

            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Teacher</span>
            </button>
          </div>
        </div>

        {/* Importing Status */}
        {isImporting && (
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 flex items-center justify-center animate-pulse shrink-0">
            Parsing Excel and saving teacher accounts... Please wait.
          </div>
        )}

        {/* Teachers List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
          {filteredTeachers.map(teacher => {
            const assigned = periods.filter(p => p.assignedTeacherId === teacher.id);

            return (
              <div
                key={teacher.id}
                className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
                    {teacher.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-100">{teacher.name}</h4>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 border border-slate-700">
                        @{teacher.username}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        {teacher.department || 'Academic Department'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-500" />
                        {teacher.email}
                      </span>
                    </div>

                    {/* Assigned Periods pill */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-slate-500 font-medium">Assigned Periods:</span>
                      {assigned.length > 0 ? (
                        assigned.map(p => (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          >
                            <Clock className="w-2.5 h-2.5" />
                            {p.name} ({p.startTime}–{p.endTime})
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">No periods assigned yet</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => openEditModal(teacher)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors text-xs font-medium"
                    title="Edit Teacher credentials"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDeleteTeacher(teacher)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-200 border border-rose-500/30 transition-colors text-xs font-semibold"
                    title="Delete Teacher Account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}

          {filteredTeachers.length === 0 && (
            <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-500 text-xs">
              No teachers found. Click <strong>Add New Teacher</strong> above to create a teacher account.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Total Teachers: <strong>{teachers.length}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
          >
            Close
          </button>
        </div>

      </div>

      {/* ========================================================== */}
      {/* SUB-MODAL: ADD / EDIT TEACHER FORM                         */}
      {/* ========================================================== */}
      {isAddOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {editingTeacher ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {editingTeacher ? 'Edit Teacher Credentials' : 'Create Teacher Login'}
                  </h3>
                  <p className="text-xs text-slate-400">Separate username & password for teacher access</p>
                </div>
              </div>

              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveTeacher} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr. John Miller"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. jmiller"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-8 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Department / Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics, Physics, English"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. teacher@school.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{editingTeacher ? 'Save Changes' : 'Create Teacher'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* IN-APP CONFIRM DELETE TEACHER MODAL (Guaranteed iframe safe) */}
      {teacherToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Delete Teacher Account</h3>
                <p className="text-xs text-slate-400">Permanently delete teacher login and permissions</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1.5">
              <div>Teacher: <strong className="text-white">{teacherToDelete.name}</strong> (@{teacherToDelete.username})</div>
              <div>Department: <span className="text-slate-400">{teacherToDelete.department || 'General Faculty'}</span></div>
              <div className="text-rose-400 text-[11px] pt-1 font-medium">
                Notice: Once deleted, this teacher will no longer be able to log in to the portal. Any period assignments will become unassigned.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTeacherToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteTeacher}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all"
              >
                Permanently Delete Teacher
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
