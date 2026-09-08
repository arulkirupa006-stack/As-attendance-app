import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Sparkles,
  ArrowRight,
  FileText
} from 'lucide-react';
import { Student } from '../types';
import { parseExcelStudentFile, downloadSampleExcelTemplate, ParseResult } from '../utils/excelParser';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportStudents: (newStudents: Student[]) => void;
  defaultGrade?: string;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportStudents,
  defaultGrade = 'Grade 10-A'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string>(defaultGrade);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (file: File) => {
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ];

    const isExcelOrCsv = validTypes.includes(file.type) || 
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.xls') || 
      file.name.endsWith('.csv');

    if (!isExcelOrCsv) {
      alert('Please select a valid Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    setIsProcessing(true);
    setParseResult(null);

    try {
      const result = await parseExcelStudentFile(file, selectedGrade);
      setParseResult(result);
    } catch (err) {
      alert('An error occurred while reading the file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (!parseResult || parseResult.students.length === 0) return;
    onImportStudents(parseResult.students);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Import Students from Excel</h3>
              <p className="text-xs text-slate-400">
                Upload `.xlsx`, `.xls`, or `.csv` files to auto-add student names, roll numbers & IDs
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

        {/* Target Grade selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
          <span className="font-semibold text-slate-300">
            Default Grade / Class (if missing in file):
          </span>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="Grade 10-A">Grade 10-A</option>
            <option value="Grade 10-B">Grade 10-B</option>
            <option value="Grade 11-A">Grade 11-A</option>
            <option value="Grade 11-B">Grade 11-B</option>
            <option value="Grade 12-A">Grade 12-A</option>
          </select>
        </div>

        {/* Drag & Drop Upload Zone */}
        {!parseResult && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
              isDragging 
                ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-500/10' 
                : 'border-slate-800 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-950'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />

            {isProcessing ? (
              <div className="space-y-2 py-4">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-semibold text-emerald-400">Reading Excel sheet...</p>
              </div>
            ) : (
              <>
                <div className="p-3.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-bold text-slate-200 text-sm">
                    Click or drag & drop your Excel file here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports Microsoft Excel (`.xlsx`, `.xls`) or CSV files
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Download Sample Template bar */}
        <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Need an example file structure?</span>
          </div>
          <button
            type="button"
            onClick={downloadSampleExcelTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sample Excel (.xlsx)
          </button>
        </div>

        {/* PARSED PREVIEW TABLE */}
        {parseResult && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span>Found {parseResult.students.length} valid student record(s)</span>
              </div>

              <button
                type="button"
                onClick={() => setParseResult(null)}
                className="text-xs text-indigo-400 hover:underline"
              >
                Choose another file
              </button>
            </div>

            {parseResult.errors.length > 0 && (
              <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Warnings ({parseResult.errors.length})
                </div>
                <ul className="list-disc list-inside text-[11px] text-amber-200/80 max-h-20 overflow-y-auto">
                  {parseResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0 font-semibold">
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Roll No</th>
                    <th className="p-2.5">Student ID</th>
                    <th className="p-2.5">Grade</th>
                    <th className="p-2.5">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {parseResult.students.map((stu) => (
                    <tr key={stu.id} className="hover:bg-slate-900/40 text-slate-300">
                      <td className="p-2.5 font-sans font-semibold text-slate-100">{stu.name}</td>
                      <td className="p-2.5 text-indigo-300">#{stu.rollNumber}</td>
                      <td className="p-2.5 text-slate-400">{stu.studentId}</td>
                      <td className="p-2.5 font-sans">{stu.grade}</td>
                      <td className="p-2.5 text-slate-400 font-sans truncate max-w-[150px]">{stu.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>

          {parseResult && parseResult.students.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all"
            >
              <Users className="w-4 h-4" />
              Add {parseResult.students.length} Students to App
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
