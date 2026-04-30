import { Outlet } from "react-router-dom";
import { useState } from "react";
import ProjectSidebar from "./ProjectSidebar";
import { useAuth } from "../contexts/AuthContext";

export default function Layout() {
  const [activeProject, setActiveProject] = useState(null);
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex bg-slate-50">
      <ProjectSidebar activeProject={activeProject} onSelect={setActiveProject} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="font-semibold text-slate-900 tracking-tight text-sm">PaySlip Reader</span>
            </div>

            <div className="flex items-center gap-4">
              {activeProject && (
                <span className="text-xs text-slate-400 hidden sm:block">
                  Project: <span className="text-slate-600 font-medium">{activeProject.name}</span>
                </span>
              )}
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{user?.email}</span>
                <button
                  onClick={signOut}
                  className="text-xs text-slate-400 hover:text-slate-700 transition-colors px-2 py-1 rounded border border-slate-200 hover:border-slate-300"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10">
          <Outlet context={{ activeProject }} />
        </main>
      </div>
    </div>
  );
}
