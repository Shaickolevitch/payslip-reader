import { useState, useEffect } from "react";
import api from "../lib/api";

export default function ProjectSidebar({ activeProject, onSelect }) {
  const [projects, setProjects] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/projects");
      setProjects(data);
      if (data.length > 0 && !activeProject) onSelect(data[0]);
    } catch (err) {
      console.error("Load projects error:", err.response?.data || err.message);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const { data } = await api.post("/projects", { name: newName.trim() });
      setNewName("");
      setCreating(false);
      await load();
      onSelect(data);
    } catch (err) {
      console.error("Create project error:", err.response?.data || err.message);
      alert("Failed to create project: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this project and all its data?")) return;
    try {
      await api.delete(`/projects/${id}`);
      if (activeProject?.id === id) onSelect(null);
      await load();
    } catch (err) {
      console.error("Delete project error:", err.response?.data || err.message);
    }
  };

  return (
    <aside className="w-56 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col min-h-screen">
      <div className="px-4 py-4 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Projects</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {projects.map((p) => (
          <div
            key={p.id}
            onClick={() => onSelect(p)}
            className={`group flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
              activeProject?.id === p.id
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                activeProject?.id === p.id ? "bg-emerald-400" : "bg-slate-300"
              }`} />
              <span className="text-sm truncate">{p.name}</span>
            </div>
            <button
              onClick={(e) => handleDelete(e, p.id)}
              className={`opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0 ${
                activeProject?.id === p.id ? "text-slate-400 hover:text-white" : "text-slate-300 hover:text-red-400"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {projects.length === 0 && !creating && (
          <p className="px-4 py-3 text-xs text-slate-400">No projects yet.</p>
        )}
      </nav>

      <div className="p-3 border-t border-slate-100">
        {creating ? (
          <div className="space-y-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Project name…"
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-slate-400"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="flex-1 text-xs py-1.5 bg-slate-900 text-white rounded-lg"
              >
                Create
              </button>
              <button
                onClick={() => { setCreating(false); setNewName(""); }}
                className="flex-1 text-xs py-1.5 border border-slate-200 text-slate-500 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors px-1 py-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New project
          </button>
        )}
      </div>
    </aside>
  );
}