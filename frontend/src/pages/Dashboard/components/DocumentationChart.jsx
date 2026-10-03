export default function DocumentationChart({
  darkMode,
  data = {},
  loading = false,
}) {
  const panel = darkMode ? "bg-[#111314]" : "bg-white";
  const border = darkMode ? "border-[#292d30]" : "border-[#dfe2e5]";
  const softBorder = darkMode ? "border-[#222628]" : "border-[#e8eaec]";
  const text = darkMode ? "text-[#f2f3f4]" : "text-[#17191c]";
  const secondary = darkMode ? "text-[#9fa5ab]" : "text-[#5d6369]";

  const functions = data.functions ?? 0;
  const classes = data.classes ?? 0;
  const methods = data.methods ?? 0;
  const modules = data.modules ?? 0;

  const total =
    functions +
    classes +
    methods +
    modules;

  const legend = [
    ["#348ff2", "Functions", functions],
    ["#36c989", "Classes", classes],
    ["#f6c344", "Methods", methods],
    ["#ef5148", "Modules", modules],
  ];

  const percentages = legend.map(([color, label, value]) => ({
    color,
    label,
    value,
    percentage: total > 0 ? (value / total) * 100 : 0,
  }));

  let currentDegree = 0;

  const gradientParts = percentages.map(
    ({ color, percentage }) => {
      const start = currentDegree;
      const end = currentDegree + (percentage / 100) * 360;

      currentDegree = end;

      return `${color} ${start}deg ${end}deg`;
    }
  );

  const background =
    total > 0
      ? `conic-gradient(${gradientParts.join(", ")})`
      : darkMode
        ? "#292d30"
        : "#dfe2e5";

  return (
    <div
      className={`overflow-hidden rounded-lg border ${border} ${panel}`}
    >
      <div
        className={`flex min-h-[46px] items-center border-b px-[17px] ${softBorder}`}
      >
        <h2 className={`text-base font-semibold ${text}`}>
          Documentation by Code Element
        </h2>
      </div>

      <div className="flex items-center gap-8 px-[33px] py-[27px] max-[700px]:flex-col">
        <div
          className="relative flex h-[174px] w-[174px] shrink-0 items-center justify-center rounded-full"
          style={{
            background,
          }}
        >
          <div
            className={`absolute inset-[19px] rounded-full ${panel}`}
          />

          <div className="relative z-10 flex flex-col items-center">
            <strong className={`text-[27px] ${text}`}>
              {loading ? "-" : total}
            </strong>

            <span
              className={`mt-[5px] text-[11px] ${secondary}`}
            >
              {loading ? "Loading" : "Code Elements"}
            </span>
          </div>
        </div>

        <div className="w-full">
          {percentages.map(
              ({ color, label, value, percentage }) => (
                <div
                  key={label}
                  className={`mb-[18px] grid grid-cols-[17px_1fr_auto] items-center gap-2.5 text-xs ${text}`}
                >
                  <i
                    className="h-[17px] w-[17px] rounded-full"
                    style={{ backgroundColor: color }}
                  />

                  <span>{label}</span>

                  <strong>
                    {loading
                      ? "-"
                      : `${value} (${Math.round(percentage)}%)`}
                  </strong>
                </div>
              )
            )}
        </div>
      </div>
    </div>
  );
}
