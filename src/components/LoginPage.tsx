import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  GraduationCap, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  KeyRound, 
  UserPlus, 
  ArrowRight, 
  School,
  AlertCircle,
  X,
  Building2,
  Mail
} from 'lucide-react';
import { UserAccount, UserRole, SchoolConfig } from '../types';
import { getStoredAccounts, saveAccounts, createNewAccount } from '../utils/authStorage';
import { syncAccountsWithCloud, saveAccountToCloud } from '../lib/firebase';

interface LoginPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  schoolConfig?: SchoolConfig;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, schoolConfig }) => {
  const [activeTab, setActiveTab] = useState<UserRole>('ADMIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin Self-Registration Modal State (Username & Password only - No OTP)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDept, setRegDept] = useState('');
  const [regErrorMsg, setRegErrorMsg] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Load and sync accounts from Firebase on mount
  useEffect(() => {
    const sync = async () => {
      try {
        const local = getStoredAccounts();
        const synced = await syncAccountsWithCloud(local);
        saveAccounts(synced);
      } catch (err) {
        console.error('Initial firebase account sync failed:', err);
      }
    };
    sync();
  }, []);

  // Login Submit Handler (Direct authentication with central database sync)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoggingIn(true);

    try {
      // First attempt to sync accounts from central database
      let accounts = getStoredAccounts();
      try {
        accounts = await syncAccountsWithCloud(accounts);
        saveAccounts(accounts);
      } catch (cloudErr) {
        console.warn('Network issue, authenticating against local cache:', cloudErr);
      }

      const cleanUser = username.trim().toLowerCase();

      // Strict credential match
      const matchedAccount = accounts.find(
        acc => acc.username.toLowerCase() === cleanUser && acc.password === password
      );

      if (!matchedAccount) {
        if (activeTab === 'TEACHER') {
          setErrorMsg('Access Denied: Invalid Teacher Username or Password. Teacher accounts are created by the Administrator.');
        } else {
          setErrorMsg('Access Denied: Invalid Administrator Username or Password.');
        }
        setIsLoggingIn(false);
        return;
      }

      // Role tab verification
      if (matchedAccount.role !== activeTab) {
        setErrorMsg(`This account is registered as ${matchedAccount.role === 'ADMIN' ? 'an Administrator' : 'a Teacher'}. Please switch to the ${matchedAccount.role === 'ADMIN' ? 'Administrator' : 'Teacher'} tab above.`);
        setIsLoggingIn(false);
        return;
      }

      // Direct login success
      onLoginSuccess(matchedAccount);
    } catch (err) {
      setErrorMsg('An unexpected login error occurred. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Admin Registration Submit (Username & Password only)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegErrorMsg(null);
    setIsRegistering(true);

    if (!regUsername.trim() || !regPassword.trim() || !regName.trim()) {
      setRegErrorMsg('Full Name, Username, and Password are required.');
      setIsRegistering(false);
      return;
    }

    if (regPassword.length < 6) {
      setRegErrorMsg('Password must be at least 6 characters long.');
      setIsRegistering(false);
      return;
    }

    const res = createNewAccount({
      username: regUsername.trim(),
      password: regPassword.trim(),
      name: regName.trim(),
      email: regEmail.trim() || `${regUsername.trim().toLowerCase()}@school.edu`,
      role: 'ADMIN',
      department: regDept.trim() || 'School Administration'
    });

    if (!res.success || !res.user) {
      setRegErrorMsg(res.error || 'Failed to create Administrator account.');
      setIsRegistering(false);
      return;
    }

    // Save newly created admin to central Firestore database
    try {
      await saveAccountToCloud(res.user);
    } catch (e) {
      console.error('Failed to sync new admin to cloud:', e);
    }

    setIsRegistering(false);
    // Successfully created -> immediately login
    setIsRegisterOpen(false);
    onLoginSuccess(res.user);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-8 max-w-md">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-700/80 flex items-center justify-center shadow-lg shadow-indigo-600/20 overflow-hidden shrink-0">
            {schoolConfig?.logo ? (
              <img src={schoolConfig.logo} alt="School Logo" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
            ) : (
              <School className="w-6 h-6 text-indigo-400" />
            )}
          </div>
          {(() => {
            const rawParts = (schoolConfig?.name || '').split('\n');
            const line1 = schoolConfig?.nameLine1 || rawParts[0] || 'Student Attendance App';
            const line2 = schoolConfig?.nameLine2 !== undefined ? schoolConfig?.nameLine2 : (rawParts[1] || '');

            return (
              <div className="text-left">
                <h1 className="font-extrabold text-xl sm:text-2xl tracking-tight text-white leading-tight">
                  {line1}
                </h1>
                {line2 && (
                  <p className="text-xs sm:text-sm text-indigo-300 font-semibold leading-tight mt-0.5">
                    {line2}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
        <p className="text-xs text-slate-400">
          Official attendance tracker with exact check-in logging, roster management, and verified PDF reports.
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl backdrop-blur-md relative">
        
        {/* Role Switcher Tabs */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('ADMIN');
              setErrorMsg(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ADMIN'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Administrator</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('TEACHER');
              setErrorMsg(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'TEACHER'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span>Teacher Portal</span>
          </button>
        </div>

        {/* Tab Notice */}
        <div className="mb-4 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-start gap-2">
          {activeTab === 'ADMIN' ? (
            <>
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Full control: Teacher management (add/edit/delete), period assignment & teacher mapping, student roster, and PDF exports.</span>
            </>
          ) : (
            <>
              <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Assigned period view: Directly take Present/Absent attendance for students in your assigned period.</span>
            </>
          )}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder={activeTab === 'ADMIN' ? 'e.g. admin' : 'e.g. john or emily'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 cursor-pointer"
          >
            <span>Log In as {activeTab === 'ADMIN' ? 'Administrator' : 'Teacher'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Administrator Self-Registration Trigger (Admin Tab Only) */}
        {activeTab === 'ADMIN' && (
          <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400 mb-2">Need a new Administrator account?</p>
            <button
              type="button"
              onClick={() => {
                setRegErrorMsg(null);
                setIsRegisterOpen(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register New Administrator (Username & Password)</span>
            </button>
          </div>
        )}

      </div>

      {/* ============================================================ */}
      {/* ADMIN REGISTRATION MODAL (USERNAME & PASSWORD ONLY, NO OTP)  */}
      {/* ============================================================ */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Register Administrator</h3>
                  <p className="text-xs text-slate-400">Create administrator login with username & password</p>
                </div>
              </div>

              <button
                onClick={() => setIsRegisterOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {regErrorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{regErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Principal Robert Vance"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. rvance"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="At least 6 chars"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. principal@school.edu"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Department / Office</label>
                <input
                  type="text"
                  placeholder="e.g. Principal's Office"
                  value={regDept}
                  onChange={(e) => setRegDept(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Register & Log In</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
