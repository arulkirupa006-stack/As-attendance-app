import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  UserPlus, 
  FileSpreadsheet, 
  ChevronLeft, 
  ChevronRight, 
  LogOut,
  ShieldCheck,
  GraduationCap,
  Building,
  UserCheck,
  BookOpen,
  MoreVertical
} from 'lucide-react';
import { UserAccount, SchoolConfig, ClassSubject } from '../types';
import { formatDisplayDate, formatDateYYYYMMDD } from '../utils/timeUtils';

interface NavbarProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  activeTab: 'sheet' | 'roster' | string;
  onSelectTab: (tab: 'sheet' | 'roster') => void;
  schoolConfig: SchoolConfig;
  onOpenSchoolSettings: () => void;
  onOpenTeacherManager?: () => void;
  onOpenClassManager?: () => void;
  onOpenAddStudent: () => void;
  onExportCSV: () => void;
  currentUser: UserAccount | null;
  onLogout: () => void;
  classes?: ClassSubject[];
  selectedClassId?: string;
  onSelectClass?: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedDate,
  onSelectDate,
  activeTab,
  onSelectTab,
  schoolConfig,
  onOpenSchoolSettings,
  onOpenTeacherManager,
  onOpenClassManager,
  onExportCSV,
  currentUser,
  onLogout,
  classes = [],
  selectedClassId,
  onSelectClass
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const todayStr = formatDateYYYYMMDD(new Date());

  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() - 1);
    onSelectDate(formatDateYYYYMMDD(dateObj));
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + 1);
    onSelectDate(formatDateYYYYMMDD(dateObj));
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand with Two-Line School Name & Logo */}
          {(() => {
            const rawParts = (schoolConfig.name || '').split('\n');
            const schoolLine1 = schoolConfig.nameLine1 || rawParts[0] || 'Student Attendance App';
            const schoolLine2 = schoolConfig.nameLine2 !== undefined ? schoolConfig.nameLine2 : (rawParts[1] || '');

            return (
              <button
                type="button"
                onClick={currentUser?.role === 'ADMIN' ? onOpenSchoolSettings : undefined}
                title={currentUser?.role === 'ADMIN' ? 'Click to configure School Profile, First Line, Second Line & Logo' : undefined}
                className={`flex items-center space-x-3 shrink-0 text-left ${
                  currentUser?.role === 'ADMIN' ? 'cursor-pointer group' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700/80 flex items-center justify-center shadow-lg shadow-indigo-500/10 overflow-hidden shrink-0 group-hover:border-indigo-500/60 transition-colors">
                  {schoolConfig.logo ? (
                    <img src={schoolConfig.logo} alt="School Logo" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                  ) : (
                    <Building className="w-5 h-5 text-indigo-400" />
                  )}
                </div>
                <div>
                  {currentUser?.role === 'TEACHER' ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base leading-tight tracking-tight text-white line-clamp-1 max-w-[180px] sm:max-w-xs md:max-w-sm">
                          {schoolLine1}
                        </span>
                      </div>
                      {schoolLine2 ? (
                        <p className="text-xs text-slate-400 hidden sm:block truncate max-w-[240px] md:max-w-sm">
                          {schoolLine2}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 hidden sm:block truncate max-w-[240px] md:max-w-sm">
                          Teacher Attendance Portal
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold text-sm sm:text-base leading-tight tracking-tight text-white group-hover:text-indigo-200 transition-colors line-clamp-1 max-w-[200px] sm:max-w-xs md:max-w-sm">
                        {schoolLine1}
                      </div>
                      {schoolLine2 ? (
                        <p className="text-xs text-indigo-300 font-medium truncate max-w-[240px] md:max-w-sm">
                          {schoolLine2}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 hidden sm:block truncate max-w-[240px] md:max-w-sm">
                          {schoolConfig.tagline || 'Student Attendance Tracker'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })()}

          {/* Class & Section Switcher Dropdown - Only for Teacher Portal */}
          {currentUser?.role === 'TEACHER' && classes.length > 0 && onSelectClass && (
            <div className="hidden md:flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60">
              <BookOpen className="w-4 h-4 text-emerald-400 ml-1 shrink-0" />
              <select
                value={selectedClassId}
                onChange={(e) => onSelectClass(e.target.value)}
                className="bg-transparent text-xs font-bold text-emerald-300 focus:outline-none cursor-pointer pr-1"
                title="Select Active Class & Section"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white font-medium">
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Picker */}
          <div className="hidden lg:flex items-center gap-3 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60">
            {/* Date Controls */}
            <div className="flex items-center gap-1.5 px-1">
              <button
                onClick={handlePrevDay}
                title="Previous Day"
                className="p-1 hover:bg-slate-700/70 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-2 px-1 relative">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-200 whitespace-nowrap min-w-[130px] text-center">
                  {formatDisplayDate(selectedDate)}
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && onSelectDate(e.target.value)}
                  className="w-4 h-4 opacity-0 absolute cursor-pointer"
                  title="Choose Date"
                />
              </div>

              <button
                onClick={handleNextDay}
                title="Next Day"
                className="p-1 hover:bg-slate-700/70 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {selectedDate !== todayStr && (
                <button
                  onClick={() => onSelectDate(todayStr)}
                  className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 font-medium transition-colors border border-indigo-500/30 ml-1"
                >
                  Today
                </button>
              )}
            </div>
          </div>

          {/* Quick Action Dropdown Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
              title="Menu Options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-800 border border-slate-700 shadow-xl shadow-black/50 z-50 overflow-hidden py-1">
                {/* User Profile Info */}
                {currentUser && (
                  <div className="px-4 py-3 border-b border-slate-700/80 bg-slate-800/50">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        currentUser.role === 'ADMIN'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}>
                        {currentUser.role === 'ADMIN' ? <ShieldCheck className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-sm font-bold text-slate-200 truncate">
                          {currentUser.name}
                        </div>
                        <div className="text-[10px] font-mono font-semibold text-slate-400 mt-0.5 uppercase tracking-wider">
                          {currentUser.role === 'ADMIN' ? 'Administrator' : 'Teacher'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      onExportCSV();
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-700 transition-colors text-left"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Export Attendance CSV</span>
                  </button>
                </div>

                {currentUser && (
                  <div className="border-t border-slate-700/80 pt-1 pb-1">
                    <button
                      onClick={() => {
                        onLogout();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Date Bar */}
        <div className="lg:hidden py-2 border-t border-slate-800/80 flex items-center justify-center text-xs">
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700/80">
            <button onClick={handlePrevDay} className="p-0.5 text-slate-400">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-medium text-slate-200 min-w-[110px] text-center">
              {formatDisplayDate(selectedDate)}
            </span>
            <button onClick={handleNextDay} className="p-0.5 text-slate-400">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Main Navigation Row: Take Attendance followed by Student Adding, Classes & Sections, and Teacher Adding */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1.5 pb-2.5 border-t border-slate-800/60 no-scrollbar">
          <button
            onClick={() => onSelectTab('sheet')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'sheet'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            <span>Take Attendance</span>
          </button>

          <button
            onClick={() => onSelectTab('roster')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'roster'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>Student Adding</span>
          </button>

          {currentUser?.role === 'ADMIN' && onOpenClassManager && (
            <button
              onClick={onOpenClassManager}
              title="Add and Manage Classes & Sections"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 transition-all whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Classes & Sections</span>
            </button>
          )}

          {currentUser?.role === 'ADMIN' && onOpenTeacherManager && (
            <button
              onClick={onOpenTeacherManager}
              title="Add and Manage Teacher Accounts"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 transition-all whitespace-nowrap"
            >
              <UserCheck className="w-4 h-4 text-indigo-400" />
              <span>Teacher Adding</span>
            </button>
          )}

          {currentUser?.role === 'ADMIN' && onOpenSchoolSettings && (
            <button
              onClick={onOpenSchoolSettings}
              title="Configure School Profile, First Line, Second Line & Logo"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 transition-all whitespace-nowrap"
            >
              <Building className="w-4 h-4 text-amber-400" />
              <span>School Profile</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
