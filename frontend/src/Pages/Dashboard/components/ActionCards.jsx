export default function ActionCards({ darkMode, onImport, onUpload }) {
  const panel = darkMode ? "bg-[#111314]" : "bg-white";
  const hover = darkMode ? "hover:bg-[#161819]" : "hover:bg-[#f2f3f4]";
  const border = darkMode ? "border-[#292d30]" : "border-[#dfe2e5]";
  const text = darkMode ? "text-[#f2f3f4]" : "text-[#17191c]";
  const secondary = darkMode ? "text-[#9fa5ab]" : "text-[#5d6369]";

  const cards = [
    ["GH", "Import Repository", "Connect your GitHub repo and generate documentation.", onImport],
    ["↑", "Upload Project", "Upload a ZIP folder from your computer.", onUpload],
  ];

  return (
    <section className="mb-5 grid grid-cols-2 gap-[22px] max-[700px]:grid-cols-1">
      {cards.map(([symbol, title, description, action]) => (
        <button key={title} type="button" onClick={action} className={`relative flex min-h-[93px] items-center rounded-lg border px-[22px] py-[15px] text-left ${border} ${panel} ${text} ${hover}`}>
          <div className="mr-6 flex h-[58px] w-[58px] shrink-0 items-center justify-center text-[22px] font-semibold text-white">{symbol}</div>
          <div>
            <h3 className="text-base">{title}</h3>
            <p className={`mt-[7px] text-[13px] ${secondary}`}>{description}</p>
          </div>
          <span className="absolute right-[21px] text-[27px] text-[#a1a7ad]">›</span>
        </button>
      ))}
    </section>
  );
}
