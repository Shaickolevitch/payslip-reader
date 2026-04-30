import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import api from "../lib/api";

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

export default function Dropzone({ projectId, onResult, onLoading, onError, loading }) {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState("idle");

  const onDrop = useCallback((accepted) => {
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const newFiles = accepted.filter((f) => !existingNames.has(f.name));
      return [...prev, ...newFiles];
    });
    onError(null);
    onResult(null);
    setProgress("idle");
  }, [onError, onResult]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
    disabled: loading,
  });

  const handleSubmit = async () => {
    if (!files.length) return;
    onLoading(true);
    onError(null);
    onResult(null);
    setProgress("uploading");

    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      if (projectId) form.append("project_id", projectId);

      setProgress("processing");
      const { data } = await api.post("/extract", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProgress("done");
      onResult(data);
    } catch (err) {
      const msg = err.response?.data?.detail || "Something went wrong. Try again.";
      onError(msg);
      setProgress("idle");
    } finally {
      onLoading(false);
    }
  };

  const removeFile = (name) => setFiles((prev) => prev.filter((f) => f.name !== name));

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl px-8 py-14 text-center cursor-pointer transition-all duration-200
          ${isDragActive ? "border-slate-700 bg-slate-50" : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"}
          ${loading ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 16v-8m0 0-3 3m3-3 3 3M6.5 19h11a2.5 2.5 0 0 0 0-5h-.457A6 6 0 1 0 6.5 19Z" />
            </svg>
          </div>
          {isDragActive ? (
            <p className="text-slate-700 font-medium">Drop the PDFs here</p>
          ) : (
            <>
              <p className="text-slate-700 font-medium">Drag & drop payslip PDFs here</p>
              <p className="text-slate-400 text-sm">or click to browse files</p>
            </>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
          {files.map((f) => (
            <li key={f.name} className="flex items-center justify-between px-4 py-3 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-red-500 text-xs font-bold">PDF</span>
                </div>
                <span className="text-sm text-slate-700 truncate">{f.name}</span>
                <span className="text-xs text-slate-400 flex-shrink-0">{formatBytes(f.size)}</span>
              </div>
              {!loading && (
                <button onClick={() => removeFile(f.name)} className="ml-4 text-slate-300 hover:text-slate-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {loading && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
          <svg className="w-4 h-4 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-slate-600">
            {progress === "uploading" ? "Uploading files…" : "Claude is reading the payslips…"}
          </span>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!files.length || loading}
        className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-150 bg-slate-900 text-white hover:bg-slate-700 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Processing…" : `Extract ${files.length > 0 ? files.length : ""} Payslip${files.length !== 1 ? "s" : ""}`}
      </button>
    </div>
  );
}
