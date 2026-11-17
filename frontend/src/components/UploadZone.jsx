import React, { useState, useRef } from 'react';
import { UploadCloud, File, X, CheckCircle2 } from 'lucide-react';

export const UploadZone = ({
  onFileSelect,
  accept = '.pdf,.docx,.txt',
  maxSizeMB = 10,
  label = 'Upload Document',
  hint = 'Supports PDF, DOCX, and TXT (Max 10MB)'
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndPass = (file) => {
    setError('');
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File is too large. Maximum size allowed is ${maxSizeMB}MB.`);
      return;
    }

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const allowed = accept.split(',').map((s) => s.trim().toLowerCase());
    if (!allowed.includes(ext)) {
      setError(`Unsupported format (${ext}). Allowed: ${accept}`);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndPass(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndPass(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setError('');
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !selectedFile && inputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
          dragActive
            ? 'border-indigo-400 bg-indigo-500/10 shadow-lg shadow-indigo-500/10 scale-[1.01]'
            : selectedFile
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : 'border-white/15 bg-white/[0.02] hover:border-indigo-500/40 hover:bg-white/[0.04]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />

        {selectedFile ? (
          <div className="flex items-center justify-between gap-4 max-w-md mx-auto">
            <div className="flex items-center gap-3 text-left overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <File className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-slate-100 truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-400">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyze
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-200">{label}</p>
              <p className="text-xs text-slate-400 mt-1">{hint}</p>
            </div>
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/5 border border-white/10 text-indigo-300">
              Browse from device or drop here
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs font-medium text-rose-400 text-center">{error}</p>
      )}
    </div>
  );
};
