import { useState } from "react";

interface FacetOption {
  value: string;
  label: string;
  count: number;
}

interface FacetGroupProps {
  title: string;
  options: FacetOption[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  searchable?: boolean;
  truncateAt?: number;
}

export default function FacetGroup({
  title,
  options,
  selected,
  onToggle,
  searchable = false,
  truncateAt = 0,
}: FacetGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = searchable && search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const shouldTruncate = truncateAt > 0 && !expanded && filtered.length > truncateAt;
  const visible = shouldTruncate ? filtered.slice(0, truncateAt) : filtered;
  const hiddenCount = filtered.length - (shouldTruncate ? truncateAt : 0);

  return (
    <div className="facet-group">
      <button
        className="facet-group-header"
        onClick={() => setCollapsed(!collapsed)}
        type="button"
      >
        <span className="facet-group-title">{title}</span>
        <span className={`facet-chevron ${collapsed ? "" : "facet-chevron--open"}`}>
          &#9656;
        </span>
      </button>

      {!collapsed && (
        <div className="facet-group-body">
          {searchable && (
            <input
              className="facet-search"
              type="text"
              placeholder={`Search ${title.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}

          <div className="facet-options">
            {visible.map((opt) => (
              <label key={opt.value} className="facet-option">
                <input
                  type="checkbox"
                  checked={selected.has(opt.value)}
                  onChange={() => onToggle(opt.value)}
                />
                <span className="facet-option-label">{opt.label}</span>
                <span className="facet-option-count">{opt.count}</span>
              </label>
            ))}
          </div>

          {truncateAt > 0 && filtered.length > truncateAt && (
            <button
              className="facet-expand-btn"
              onClick={() => setExpanded(!expanded)}
              type="button"
            >
              {expanded ? "Show less" : `Show all ${hiddenCount + truncateAt}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
