interface AppliedFiltersProps {
  categories: Set<string>;
  protocols: Set<string>;
  manufacturers: Set<string>;
  capabilities: Set<string>;
  onRemoveCategory: (v: string) => void;
  onRemoveProtocol: (v: string) => void;
  onRemoveManufacturer: (v: string) => void;
  onRemoveCapability: (v: string) => void;
  onClearAll: () => void;
}

const capabilityLabels: Record<string, string> = {
  discretePower: "Discrete Power",
  volumeControl: "Volume Control",
  inputSelect: "Input Select",
  feedback: "Feedback",
};

export default function AppliedFilters({
  categories,
  protocols,
  manufacturers,
  capabilities,
  onRemoveCategory,
  onRemoveProtocol,
  onRemoveManufacturer,
  onRemoveCapability,
  onClearAll,
}: AppliedFiltersProps) {
  const total = categories.size + protocols.size + manufacturers.size + capabilities.size;
  if (total === 0) return null;

  return (
    <div className="applied-filters">
      {[...categories].map((v) => (
        <button key={`cat-${v}`} className="applied-filter applied-filter--category" onClick={() => onRemoveCategory(v)}>
          {v} <span className="applied-filter-x">&times;</span>
        </button>
      ))}
      {[...protocols].map((v) => (
        <button key={`proto-${v}`} className="applied-filter applied-filter--protocol" onClick={() => onRemoveProtocol(v)}>
          {v} <span className="applied-filter-x">&times;</span>
        </button>
      ))}
      {[...manufacturers].map((v) => (
        <button key={`mfr-${v}`} className="applied-filter applied-filter--manufacturer" onClick={() => onRemoveManufacturer(v)}>
          {v} <span className="applied-filter-x">&times;</span>
        </button>
      ))}
      {[...capabilities].map((v) => (
        <button key={`cap-${v}`} className="applied-filter applied-filter--capability" onClick={() => onRemoveCapability(v)}>
          {capabilityLabels[v] ?? v} <span className="applied-filter-x">&times;</span>
        </button>
      ))}
      <button className="applied-filter-clear" onClick={onClearAll}>
        Clear All
      </button>
    </div>
  );
}
