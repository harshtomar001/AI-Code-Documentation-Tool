export default function DocumentationOverview({
  month,
  setMonth,
  data = {},
  loading = false,
  darkMode,
}) {
  const border = darkMode ? "border-[#292d30]" : "border-[#dfe2e5]";
  const softBorder = darkMode ? "border-[#222628]" : "border-[#e8eaec]";
  const panel = darkMode ? "bg-[#111314]" : "bg-white";
  const text = darkMode ? "text-[#f2f3f4]" : "text-[#17191c]";
  const secondary = darkMode ? "text-[#9fa5ab]" : "text-[#5d6369]";

  const stats = [
  [
    "▤",
    loading ? "-" : (data.docstrings ?? 0),
    "Docstrings",
    "text-[#348ff2]",
  ],
  [
    "◌",
    loading ? "-" : (data.comments ?? 0),
    "Inline Comments",
    "text-[#36c989]",
  ],
  [
    "▣",
    loading ? "-" : (data.readme ?? 0),
    "README",
    "text-[#348ff2]",
  ],
  [
    "✓",
    loading ? "-" : (data.reviews ?? 0),
    "Reviews",
    "text-[#f6c344]",
  ],
];

  return (
    <div className={`overflow-hidden rounded-lg border ${border} ${panel}`}>
      <div
        className={`flex min-h-[46px] items-center justify-between border-b px-[17px] ${softBorder}`}
      >
        <h2 className={`text-base font-semibold ${text}`}>
          Documentation Overview
        </h2>

        <select
          value={month ?? "This month"}
          onChange={(event) => setMonth(event.target.value)}
          className={`rounded-md border px-2 py-1 text-xs outline-none ${
            darkMode
              ? "border-[#292d30] bg-[#161819] text-[#f2f3f4]"
              : "border-[#dfe2e5] bg-white text-[#17191c]"
          }`}
        >
          <option value="This month">This month</option>
          <option value="Last month">Last month</option>
          <option value="Last 3 months">Last 3 months</option>
          <option value="This year">This year</option>
        </select>
      </div>

      <div className="grid grid-cols-4 gap-2 p-2 max-[700px]:grid-cols-2">
        {stats.map(([icon, value, label, color]) => (
          <div
            key={label}
            className={`min-h-[130px] rounded-lg border p-4 ${
              softBorder
            } ${darkMode ? "bg-[#161819]" : "bg-[#f2f3f4]"}`}
          >
            <div className={`mb-2 text-[22px] ${color}`}>
              {icon}
            </div>

            <strong className={`block text-[23px] ${text}`}>
              {value}
            </strong>

            <span className={`mt-1.5 block text-[10px] ${secondary}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}