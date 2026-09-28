export default function ReviewRequired({ reviews, darkMode, onReview, onViewAll }) {
  const border = darkMode ? "border-[#292d30]" : "border-[#dfe2e5]";
  const softBorder = darkMode ? "border-[#222628]" : "border-[#e8eaec]";
  const panel = darkMode ? "bg-[#111314]" : "bg-white";
  const text = darkMode ? "text-[#f2f3f4]" : "text-[#17191c]";
  const secondary = darkMode ? "text-[#9fa5ab]" : "text-[#5d6369]";

  return (
    <div className={`overflow-hidden rounded-lg border ${border} ${panel}`}>
      <div className={`flex min-h-[46px] items-center justify-between border-b px-[17px] ${softBorder}`}>
        <h2 className={`text-base font-semibold ${text}`}>Review Required</h2>
        <button type="button" className={`bg-transparent text-xs ${secondary}`} onClick={onViewAll}>View All →</button>
      </div>

      {reviews.length === 0 ? (
        <div className="p-[35px] text-center text-[13px] text-[#737980]">✓ All reviews completed</div>
      ) : reviews.map((review) => (
        <div key={review.id} className={`flex min-h-[58px] items-center border-b px-[17px] py-2 last:border-b-0 ${softBorder}`}>
          <div className="mr-[18px] flex h-[43px] w-[47px] shrink-0 items-center justify-center rounded-lg bg-[rgba(52,143,242,0.13)] text-[#348ff2]">◇</div>
          <div className="flex-1">
            <h3 className={`text-[13px] ${text}`}>{review.title}</h3>
            <p className="mt-1 text-[10px] text-[#737980]">{review.description}</p>
          </div>
          <button type="button" className={`h-9 w-[95px] rounded-[7px] border text-xs ${darkMode ? "border-[#3d4246] bg-[#151718] text-[#f2f3f4] hover:bg-[#202325]" : "border-[#dfe2e5] bg-white text-[#17191c] hover:bg-[#f2f3f4]"}`} onClick={() => onReview(review.id)}>Review</button>
          <button type="button" className="ml-[13px] bg-transparent text-[22px] text-[#92989e]">⋮</button>
        </div>
      ))}
    </div>
  );
}
