import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ComplaintForm from '../components/ComplaintForm';
import AIAnalysisCard from '../components/AIAnalysisCard';
import { Sparkles, Cpu, AlertTriangle, CheckCircle2, FolderOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CitizenPortal() {
  const [submittedComplaint, setSubmittedComplaint] = useState(null);
  const { isAuthenticated, isCitizen } = useAuth();

  return (
    <div className="w-full flex flex-col items-center justify-center">
      {!submittedComplaint ? (
        <div className="w-full flex flex-col items-center space-y-8 animate-fadeIn">
          {/* Header Hero Section */}
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Smart Complaint Triage & Resolution (HN-AI-02)
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
              SmartCivic{' '}
              <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
                AI
              </span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-base leading-relaxed">
              Empowering citizens to report civic, road, and utility hazards. Powered by Google Gemini
              Multimodal AI to instantly evaluate severity, route issues, and produce concrete
              municipal resolution plans.
            </p>
          </div>

          {/* Quick Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center flex items-center justify-center gap-2 text-xs text-slate-300">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>Multimodal Vision Triage</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center flex items-center justify-center gap-2 text-xs text-slate-300">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>0-100 Priority Scoring</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center flex items-center justify-center gap-2 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Actionable Field Steps</span>
            </div>
          </div>

          {/* Complaint Submission Form */}
          <ComplaintForm onSuccess={(result) => setSubmittedComplaint(result)} />
        </div>
      ) : (
        <div className="w-full flex flex-col items-center space-y-6">
          {/* Post-submission Navigation Helper */}
          {isAuthenticated && isCitizen && (
            <div className="w-full max-w-4xl flex items-center justify-between p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs">
              <span>This issue is now logged under your citizen account.</span>
              <Link
                to="/my-complaints"
                className="font-bold underline hover:text-white flex items-center gap-1"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>View all your submissions</span>
              </Link>
            </div>
          )}

          <AIAnalysisCard
            complaint={submittedComplaint}
            onReset={() => setSubmittedComplaint(null)}
          />
        </div>
      )}
    </div>
  );
}
