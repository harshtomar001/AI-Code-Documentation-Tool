export default function Topbar({
  search,
  setSearch,
  darkMode,
  setDarkMode,
  showNotifications,
  setShowNotifications,
  showProfile,
  setShowProfile,
  userName,
  avatarLetter,
  userEmail,
  verificationText,
  providers,
  reviewsCount,
  onNotify,
  onLogout,
}) {
  const panel = darkMode ? "bg-[#111314]" : "bg-white";
  const border = darkMode ? "border-[#292d30]" : "border-[#dfe2e5]";
  const text = darkMode ? "text-[#f2f3f4]" : "text-[#17191c]";
  const secondary = darkMode ? "text-[#9fa5ab]" : "text-[#5d6369]";
  const hover = darkMode ? "hover:bg-[#161819]" : "hover:bg-[#f2f3f4]";

  return (
    <header className={`flex h-20 items-center border-b px-[38px] ${darkMode ? "border-[#222628]" : "border-[#e8eaec]"}`}>
      <div className={`mx-auto flex h-[42px] w-[610px] items-center rounded-lg border px-[13px] ${panel} ${border} text-[#737980]`}>
        <span>⌕</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search repositories, projects..."
          className={`h-full w-full border-none bg-transparent px-2.5 text-sm outline-none placeholder:text-[#7d8389] ${text}`}
        />
        {!search && (
          <div className={`whitespace-nowrap rounded-[5px] border px-[9px] py-1.5 text-[11px] ${border} ${darkMode ? "bg-[#1c1f20] text-[#91979d]" : "bg-[#f2f3f4] text-[#5d6369]"}`}>
            Ctrl K
          </div>
        )}
      </div>

      <div className="flex items-center gap-[14px]">
        <button
          type="button"
          className={`flex h-[42px] w-[42px] items-center justify-center rounded-full text-xl ${darkMode ? "bg-[#202326] text-white" : "bg-[#e9ebed] text-[#222]"}`}
          onClick={() => setDarkMode((value) => !value)}
          aria-label="Toggle theme"
        >
          {darkMode ? "☾" : "☀"}
        </button>

        <div className="relative">
          <button
            type="button"
            className={`relative flex h-[42px] w-[42px] items-center justify-center rounded-full text-xl ${darkMode ? "bg-[#202326] text-white" : "bg-[#e9ebed] text-[#222]"}`}
            onClick={() => {
              setShowNotifications((value) => !value);
              setShowProfile(false);
            }}
            aria-label="Notifications"
          >
            ♧
            <span className={`absolute right-[7px] top-[7px] h-[9px] w-[9px] rounded-full border-2 border-solid border-[#0d0f10] bg-[#ef3d39] ${darkMode ? "" : "border-white"}`} />
          </button>

          {showNotifications && (
            <div className={`absolute right-0 top-[54px] z-50 w-[290px] rounded-lg border p-[14px] shadow-[0_20px_50px_rgba(0,0,0,0.4)] ${border} ${darkMode ? "bg-[#17191a]" : "bg-white"}`}>
              <h3 className={`mb-3 text-sm ${text}`}>Notifications</h3>
              <div className={`border-t py-3 ${darkMode ? "border-[#222628]" : "border-[#e8eaec]"}`}>
                <strong className={`text-xs ${text}`}>Documentation generated</strong>
                <p className="mt-1 text-[11px] text-[#737980]">Student ERP is ready for review.</p>
              </div>
              <div className={`border-t py-3 ${darkMode ? "border-[#222628]" : "border-[#e8eaec]"}`}>
                <strong className={`text-xs ${text}`}>Review required</strong>
                <p className="mt-1 text-[11px] text-[#737980]">{reviewsCount} items need your attention.</p>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            className={`flex items-center gap-2.5 bg-transparent text-sm ${text}`}
            onClick={() => {
              setShowProfile((value) => !value);
              setShowNotifications(false);
            }}
          >
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#292c30] text-lg text-white">
              {avatarLetter}
            </div>
            <span className="max-[700px]:hidden">{userName}</span>
            <span className="max-[700px]:hidden">⌄</span>
          </button>

          {showProfile && (
            <div className={`absolute right-0 top-[54px] z-50 flex w-[210px] flex-col rounded-lg border p-[14px] shadow-[0_20px_50px_rgba(0,0,0,0.4)] ${border} ${darkMode ? "bg-[#17191a]" : "bg-white"}`}>
              <strong className={`text-sm ${text}`}>{userName}</strong>
              <span className="mt-[3px] text-[11px] text-[#737980]">{userEmail}</span>
              <span className="mt-[3px] text-[11px] text-[#737980]">{verificationText}</span>
              <span className="mt-[3px] text-[11px] text-[#737980]">Login: {providers}</span>
              <button type="button" className={`mt-3 rounded-[5px] bg-transparent p-[9px] text-left text-sm ${secondary} ${hover}`} onClick={() => onNotify("Settings selected")}>Settings</button>
              <button type="button" className={`rounded-[5px] bg-transparent p-[9px] text-left text-sm ${secondary} ${hover}`} onClick={onLogout}>Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
