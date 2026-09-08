import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  UserX, 
  Award, 
  Calendar,
  Filter,
  ShieldCheck,
  Zap,
  Users
} from 'lucide-react';
import { Student, ClassSubject, AttendanceRecord } from '../types';
import { formatDisplayDate } from '../utils/timeUtils';

interface AnalyticsDashboardProps {
  students: Student[];
  classes: ClassSubject[];
  records: AttendanceRecord[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  students,
  classes,
  records,
}) => {
  const [selectedClassIdFilter, setSelectedClassIdFilter] = useState<string>('ALL');

  // Filter records by selected class
  const filteredRecords = selectedClassIdFilter === 'ALL'
    ? records
    : records.filter(r => r.classId === selectedClassIdFilter);

  // Totals
  const totalRecords = filteredRecords.length;
  const presentCount = filteredRecords.filter(r => r.status === 'PRESENT').length;
  const lateCount = filteredRecords.filter(r => r.status === 'LATE').length;
  const absentCount = filteredRecords.filter(r => r.status === 'ABSENT').length;
  const excusedCount = filteredRecords.filter(r => r.status === 'EXCUSED').length;

  const attendanceRate = totalRecords > 0 
    ? Math.round(((presentCount + lateCount) / totalRecords) * 100) 
    : 0;

  const punctualityRate = (presentCount + lateCount) > 0
    ? Math.round((presentCount / (presentCount + lateCount)) * 100)
    : 0;

  // Average delay for late arrivals
  const lateRecords = filteredRecords.filter(r => r.status === 'LATE' && r.minutesLate > 0);
  const avgLateMins = lateRecords.length > 0
    ? Math.round(lateRecords.reduce((acc, r) => acc + r.minutesLate, 0) / lateRecords.length)
    : 0;

  // Arrival Time Distribution Breakdown
  let earlyOnTime = 0; // <= 0 mins
  let slightDelay = 0; // 1 - 10 mins
  let moderateDelay = 0; // 11 - 25 mins
  let severeDelay = 0; // > 25 mins

  filteredRecords.forEach(r => {
    if (r.status === 'PRESENT') {
      earlyOnTime++;
    } else if (r.status === 'LATE') {
      if (r.minutesLate <= 10) slightDelay++;
      else if (r.minutesLate <= 25) moderateDelay++;
      else severeDelay++;
    }
  });

  // Calculate Student-level stats for Leaderboard
  const studentStatsMap = new Map<string, {
    student: Student;
    total: number;
    present: number;
    late: number;
    absent: number;
    totalLateMins: number;
  }>();

  students.forEach(s => {
    studentStatsMap.set(s.id, {
      student: s,
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
      totalLateMins: 0,
    });
  });

  filteredRecords.forEach(r => {
    const entry = studentStatsMap.get(r.studentId);
    if (entry) {
      entry.total++;
      if (r.status === 'PRESENT') entry.present++;
      else if (r.status === 'LATE') {
        entry.late++;
        entry.totalLateMins += r.minutesLate;
      } else if (r.status === 'ABSENT') entry.absent++;
    }
  });

  const studentStatsArray = Array.from(studentStatsMap.values()).filter(st => st.total > 0);

  // Rank Most Punctual Students (Highest present % and lowest late mins)
  const mostPunctual = [...studentStatsArray].sort((a, b) => {
    const pctA = (a.present / a.total);
    const pctB = (b.present / b.total);
    if (pctA !== pctB) return pctB - pctA;
    return a.totalLateMins - b.totalLateMins;
  }).slice(0, 5);

  // Rank Students with highest late / absent count
  const needsAttention = [...studentStatsArray].sort((a, b) => {
    const badA = a.late + a.absent;
    const badB = b.late + b.absent;
    if (badA !== badB) return badB - badA;
    return b.totalLateMins - a.totalLateMins;
  }).slice(0, 5);

  // Date breakdown for recent daily trends
  const dateMap = new Map<string, { present: number; late: number; absent: number; total: number }>();
  filteredRecords.forEach(r => {
    if (!dateMap.has(r.date)) {
      dateMap.set(r.date, { present: 0, late: 0, absent: 0, total: 0 });
    }
    const dObj = dateMap.get(r.date)!;
    dObj.total++;
    if (r.status === 'PRESENT') dObj.present++;
    else if (r.status === 'LATE') dObj.late++;
    else if (r.status === 'ABSENT') dObj.absent++;
  });

  const sortedDates = Array.from(dateMap.keys()).sort();

  return (
    <div className="space-y-6">
      
      {/* Analytics Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Attendance & Time Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time punctuality tracking, arrival time distribution, and student insights
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Attendance Rate */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Attendance Rate</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white font-mono">{attendanceRate}%</div>
          <p className="text-xs text-slate-400 mt-1">
            {presentCount + lateCount} attended out of {totalRecords} total sessions
          </p>
        </div>

        {/* Punctuality Rate */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Punctuality Score</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-indigo-300 font-mono">{punctualityRate}%</div>
          <p className="text-xs text-slate-400 mt-1">
            {presentCount} on-time arrivals ({lateCount} late)
          </p>
        </div>

        {/* Average Delay */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg Arrival Delay</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-amber-300 font-mono">+{avgLateMins} <span className="text-sm font-normal">mins</span></div>
          <p className="text-xs text-slate-400 mt-1">
            Average late duration per tardy student
          </p>
        </div>

        {/* Absence Count */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Absences</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-rose-300 font-mono">{absentCount}</div>
          <p className="text-xs text-slate-400 mt-1">
            {excusedCount} additional excused absences
          </p>
        </div>

      </div>

      {/* Arrival Time Breakdown & Daily Trend Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Arrival Time Distribution */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Arrival Time Distribution
          </h3>

          <div className="space-y-3">
            {/* On Time */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> On Time / Early
                </span>
                <span className="font-mono text-slate-300">{earlyOnTime} records ({totalRecords > 0 ? Math.round((earlyOnTime/totalRecords)*100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${totalRecords > 0 ? (earlyOnTime/totalRecords)*100 : 0}%` }}
                />
              </div>
            </div>

            {/* Slight Delay */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Slight Delay (1 – 10 mins late)
                </span>
                <span className="font-mono text-slate-300">{slightDelay} records ({totalRecords > 0 ? Math.round((slightDelay/totalRecords)*100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${totalRecords > 0 ? (slightDelay/totalRecords)*100 : 0}%` }}
                />
              </div>
            </div>

            {/* Moderate Delay */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-orange-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Moderate Delay (11 – 25 mins late)
                </span>
                <span className="font-mono text-slate-300">{moderateDelay} records ({totalRecords > 0 ? Math.round((moderateDelay/totalRecords)*100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-orange-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${totalRecords > 0 ? (moderateDelay/totalRecords)*100 : 0}%` }}
                />
              </div>
            </div>

            {/* Severe Delay / Absent */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-rose-400 flex items-center gap-1.5">
                  <UserX className="w-3.5 h-3.5" /> Severe Delay (&gt;25 mins) / Absent
                </span>
                <span className="font-mono text-slate-300">{severeDelay + absentCount} records</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${totalRecords > 0 ? ((severeDelay + absentCount)/totalRecords)*100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Daily Attendance Trend */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            Daily Attendance Trend
          </h3>

          <div className="space-y-3 pt-2">
            {sortedDates.map(dateStr => {
              const dData = dateMap.get(dateStr)!;
              const pPct = dData.total > 0 ? Math.round((dData.present / dData.total) * 100) : 0;
              const lPct = dData.total > 0 ? Math.round((dData.late / dData.total) * 100) : 0;

              return (
                <div key={dateStr} className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-200">{formatDisplayDate(dateStr)}</span>
                    <span className="font-mono text-emerald-400 font-semibold">{dData.present} Present, {dData.late} Late, {dData.absent} Absent</span>
                  </div>

                  {/* Multi-segmented Bar */}
                  <div className="w-full bg-slate-900 h-3.5 rounded-full overflow-hidden flex border border-slate-800">
                    <div className="bg-emerald-500 h-full" style={{ width: `${pPct}%` }} title={`Present: ${pPct}%`} />
                    <div className="bg-amber-400 h-full" style={{ width: `${lPct}%` }} title={`Late: ${lPct}%`} />
                    <div className="bg-rose-500 h-full flex-1" title="Absent" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Most Punctual Students */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Most Punctual Students
          </h3>

          <div className="space-y-2.5">
            {mostPunctual.map((item, idx) => (
              <div key={item.student.id} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-slate-100">{item.student.name}</div>
                    <div className="text-[11px] text-slate-400">{item.student.studentId} • {item.student.grade}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-xs font-bold text-emerald-400">
                    {Math.round((item.present / item.total) * 100)}% On Time
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {item.present}/{item.total} sessions punctual
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Needs Attention (Frequent Late / Absences) */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            Tardiness & Absence Watchlist
          </h3>

          <div className="space-y-2.5">
            {needsAttention.map((item) => (
              <div key={item.student.id} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-slate-100">{item.student.name}</div>
                    <div className="text-[11px] text-slate-400">{item.student.studentId} • {item.student.grade}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-xs font-bold text-amber-300">
                    {item.late} Late, {item.absent} Absent
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Total {item.totalLateMins} mins tardy
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
