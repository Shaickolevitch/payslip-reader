import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import Dropzone from "../components/Dropzone";
import ResultsTable from "../components/ResultsTable";
import ChatAgent from "../components/ChatAgent";

export default function Home() {
  const { activeProject } = useOutletContext();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("upload"); // upload | chat

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 7h18M3 12h18M3 17h18" />
          </svg>
        </div>
        <p className="text-slate-500 text-sm">Select or create a project to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">{activeProject.name}</h1>
        <p className="text-slate-500 text-sm">Upload payslips or ask the AI agent questions about your data.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { id: "upload", label: "Upload & Extract" },
          { id: "chat", label: "Ask AI Agent" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "upload" && (
        <div className="space-y-8">
          <Dropzone
            projectId={activeProject.id}
            onResult={setSession}
            onLoading={setLoading}
            onError={setError}
            loading={loading}
          />
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {session && !loading && <ResultsTable session={session} />}
        </div>
      )}

      {tab === "chat" && (
        <ChatAgent projectId={activeProject.id} projectName={activeProject.name} />
      )}
    </div>
  );
}
