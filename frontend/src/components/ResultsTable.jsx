import api from "../lib/api";

const SKIP_KEYS = ["_raw"];

const formatVal = (val) => {
  if (val === null || val === undefined) return <span className="text-slate-300">—</span>;
  if (typeof val === "number") return val.toLocaleString();
  return val;
};

const friendlyLabel = (key) => {
  const labels = {
    source_filename: "File", employee_name: "Name", employee_id: "ID",
    employer_name: "Employer", pay_period_month: "Month", pay_period_year: "Year",
    currency: "Currency", base_salary: "Base Salary", gross_pay: "Gross Pay",
    total_deductions: "Total Deductions", net_pay: "Net Pay",
    income_tax: "Income Tax", national_insurance: "Nat. Insurance",
    health_insurance: "Health Ins.", pension_employee: "Pension (Emp)",
    pension_employer: "Pension (Emplr)",
  };
  return labels[key] || key.replace(/_/g, " ");
};

export default function ResultsTable({ session }) {
  const { session_id, processed, failed, results, errors } = session;

  // Collect all unique keys across all results (excluding _raw)
  const allKeys = Array.from(
    new Set(results.flatMap((r) => Object.keys(r.data || {}).filter((k) => !SKIP_KEYS.includes(k))))
  );

  const handleDownload = async () => {
    try {
      const response = await api.get(`/files/${session_id}/excel`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payslips_${session_id.slice(0, 8)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download Excel file.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{processed}</span> extracted
          </span>
          {failed > 0 && <span className="text-sm text-red-500">{failed} failed</span>}
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-8m0 8-3-3m3 3 3-3M4 20h16" />
          </svg>
          Download Excel
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900 text-white">
              {allKeys.map((k) => (
                <th key={k} className="text-left px-4 py-3 font-medium text-slate-300 text-xs uppercase tracking-wide whitespace-nowrap">
                  {friendlyLabel(k)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.map((row, i) => (
              <tr key={i} className="bg-white hover:bg-slate-50 transition-colors">
                {allKeys.map((k) => (
                  <td key={k} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {formatVal(row.data?.[k])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {errors?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-red-500 uppercase tracking-wide">Failed files</p>
          {errors.map((e, i) => (
            <div key={i} className="flex items-start gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-100">
              <span className="text-sm text-red-700 font-medium">{e.filename}:</span>
              <span className="text-sm text-red-600">{e.error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
