import { Search, Grid2X2, List, ChevronDown, X } from "lucide-react";

export default function ProjectToolbar({
  filters = ["All", "In Progress", "Completed", "Needs Review"],
  filter,
  setFilter,
  search,
  setSearch,
  sort,
  setSort,
  view,
  setView,
}) {
  return (
    <div className="toolbar">
      <div className="filters">
        {filters.map((item) => (
          <button
            key={item}
            className={filter === item ? "selected" : ""}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="toolbar-right">
        <div className="mini-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search">
              <X size={15} />
            </button>
          )}
        </div>

        <label className="sort">
          <span>Sort by:</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option>Last updated</option>
            <option>Name</option>
            <option>Progress</option>
          </select>
          <ChevronDown size={15} />
        </label>

        <div className="view-switcher">
          <button
            className={view === "grid" ? "selected" : ""}
            onClick={() => setView("grid")}
            aria-label="Grid view"
          >
            <Grid2X2 size={18} />
          </button>
          <button
            className={view === "list" ? "selected" : ""}
            onClick={() => setView("list")}
            aria-label="List view"
          >
            <List size={19} />
          </button>
        </div>
      </div>
    </div>
  );
}
