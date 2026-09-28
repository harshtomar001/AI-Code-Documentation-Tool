export default function DocumentationChart({ darkMode }) {
  const panel = darkMode ? "bg-[#111314]" : "bg-white";
  const border = darkMode ? "border-[#292d30]" : "border-[#dfe2e5]";
  const softBorder = darkMode ? "border-[#222628]" : "border-[#e8eaec]";
  const text = darkMode ? "text-[#f2f3f4]" : "text-[#17191c]";
  const secondary = darkMode ? "text-[#9fa5ab]" : "text-[#5d6369]";
  const legend = [["#348ff2", "Functions", "42"], ["#36c989", "Classes", "18"], ["#f6c344", "Modules", "6"], ["#ef5148", "Others", "8"]];

  return (
    <div className={`overflow-hidden rounded-lg border ${border} ${panel}`}>
      <div className={`flex min-h-[46px] items-center border-b px-[17px] ${softBorder}`}>
        <h2 className={`text-base font-semibold ${text}`}>Documentation by File Type</h2>
      </div>
      <div className="flex items-center gap-8 px-[33px] py-[27px] max-[700px]:flex-col">
        <div className="relative flex h-[174px] w-[174px] shrink-0 items-center justify-center rounded-full" style={{ background: "conic-gradient(#348ff2 0deg 230deg, #36c989 230deg 310deg, #f6c344 310deg 337deg, #ef5148 337deg 360deg)" }}>
          <div className={`absolute inset-[19px] rounded-full ${panel}`} />
          <div className="relative z-10 flex flex-col items-center">
            <strong className={`text-[27px] ${text}`}>71%</strong>
            <span className={`mt-[5px] text-[11px] ${secondary}`}>Documented</span>
          </div>
        </div>
        <div className="w-full">
          {legend.map(([color, label, value]) => (
            <div key={label} className={`mb-[18px] grid grid-cols-[17px_1fr_auto] items-center gap-2.5 text-xs ${text}`}>
              <i className="h-[17px] w-[17px] rounded-full" style={{ backgroundColor: color }} />
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
