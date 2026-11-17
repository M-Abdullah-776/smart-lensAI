import React from 'react';
import { AlertCircle } from 'lucide-react';

export const AiDisclaimer = ({ resume = false }) => {
  return (
    <div className="flex flex-col gap-1 my-3">
      <div className="flex items-center gap-1.5 text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg w-fit">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>AI-generated, may not be 100% accurate.</span>
      </div>
      {resume && (
        <div className="flex items-center gap-1.5 text-xs text-sky-400/90 bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 rounded-lg w-fit">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Suggestions only, no guarantee of interview selection.</span>
        </div>
      )}
    </div>
  );
};
