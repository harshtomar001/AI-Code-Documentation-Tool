export default function RecentProjects({ projects, darkMode, onViewAll }) {
  const border = darkMode ? "border-[#292d30]" : "border-[#dfe2e5]";
  const softBorder = darkMode ? "border-[#222628]" : "border-[#e8eaec]";
  const panel = darkMode ? "bg-[#111314]" : "bg-white";
  const hoverPanel = darkMode ? "bg-[#161819]" : "bg-[#f2f3f4]";
  const text = darkMode ? "text-[#f2f3f4]" : "text-[#17191c]";
  const secondary = darkMode ? "text-[#9fa5ab]" : "text-[#5d6369]";

  const progressColors = ["bg-[#348ff2]", "bg-[#f6c344]", "bg-[#36c989]"];

  return (
    <div className={`overflow-hidden rounded-lg border ${border} ${panel}`}>
      <div className={`flex min-h-[46px] items-center justify-between border-b px-[17px] ${softBorder}`}>
        <h2 className={`text-base font-semibold ${text}`}>Recent Projects</h2>
        <button type="button" className={`bg-transparent text-xs ${secondary}`} onClick={onViewAll}>View All →</button>
      </div>

      {projects.map((project, index) => (
        <div key={project.id} className={`flex min-h-[73px] items-center border-b px-[17px] py-2 last:border-b-0 ${softBorder}`}>
          <div className={`mr-[22px] flex h-[58px] w-[61px] shrink-0 items-center justify-center rounded-[9px] border text-[25px] ${border} ${hoverPanel}`}>📁</div>
          <div className="min-w-[180px]">
            <h3 className={`text-sm ${text}`}>{project.name}</h3>
            <div className="mt-[7px] flex gap-[7px]">
              {project.tags.map((tag) => <span key={tag} className={`rounded-[5px] px-2 py-1 text-[10px] ${darkMode ? "bg-[#222528] text-[#b4bac0]" : "bg-[#e9ebed] text-[#5d6369]"}`}>{tag}</span>)}
            </div>
          </div>
          <div className="ml-5 flex flex-1 items-center gap-4">
            <div className={`h-[9px] w-[115px] overflow-hidden rounded-full ${darkMode ? "bg-[#272a2d]" : "bg-[#dfe2e5]"}`}>
              <div className={`h-full rounded-full ${progressColors[index % progressColors.length]}`} style={{ width: `${project.progress}%` }} />
            </div>
            <span className={`text-xs ${text}`}>{project.progress}%</span>
          </div>
          <button type="button" className="bg-transparent text-[22px] text-[#92989e]">›</button>
          <button type="button" className="ml-[13px] bg-transparent text-[22px] text-[#92989e]">⋮</button>
        </div>
      ))}
    </div>
  );
}
