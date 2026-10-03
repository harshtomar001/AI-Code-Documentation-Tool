export default function Tips({ darkMode, onViewAll }) {
  const panel = darkMode ? "bg-[#111314]" : "bg-white";
  const border = darkMode ? "border-[#292d30]" : "border-[#dfe2e5]";
  const softBorder = darkMode ? "border-[#222628]" : "border-[#e8eaec]";
  const text = darkMode ? "text-[#f2f3f4]" : "text-[#17191c]";
  const secondary = darkMode ? "text-[#9fa5ab]" : "text-[#5d6369]";
  const tips = [
    ["</>", "Add meaningful docstrings", "Explain what each function does and its parameters.", "text-[#348ff2]", "bg-[rgba(52,143,242,0.12)]"],
    ["💬", "Explain complex logic", "Use inline comments for non-trivial code.", "text-[#348ff2]", "bg-[rgba(52,143,242,0.12)]"],
    ["▤", "Keep README updated", "Include setup steps, usage and examples.", "text-[#36c989]", "bg-[rgba(54,201,137,0.12)]"],
  ];

  return (
    <section className={`mt-[17px] overflow-hidden rounded-lg border pb-3 ${border} ${panel}`}>
      <div className={`flex min-h-[46px] items-center justify-between border-b px-[17px] ${softBorder}`}>
        <h2 className={`text-base font-semibold ${text}`}>💡 Tips for Better Documentation</h2>
        <button type="button" className={`bg-transparent text-xs ${secondary}`} onClick={onViewAll}>View All →</button>
      </div>
      <div className="grid grid-cols-3 gap-[13px] px-[13px] max-[700px]:grid-cols-1">
        {tips.map(([icon, title, description, iconColor, iconBg]) => (
          <div key={title} className={`relative flex min-h-[83px] items-center rounded-lg border p-[13px] ${border} ${darkMode ? "bg-[#161819]" : "bg-[#f2f3f4]"}`}>
            <div className={`mr-[17px] flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>{icon}</div>
            <div className="pr-5">
              <h3 className={`text-xs ${text}`}>{title}</h3>
              <p className={`mt-[5px] text-[10px] leading-[1.4] ${secondary}`}>{description}</p>
            </div>
            <span className="absolute right-[13px] text-[#9ba1a7]">→</span>
          </div>
        ))}
      </div>
    </section>
  );
}
