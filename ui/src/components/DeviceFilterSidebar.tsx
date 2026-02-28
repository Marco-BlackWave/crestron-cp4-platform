import FacetGroup from "./FacetGroup";

interface FacetCounts {
  categories: [string, number][];
  protocols: [string, number][];
  manufacturers: [string, number][];
  capabilities: [string, number][];
}

interface DeviceFilterSidebarProps {
  counts: FacetCounts;
  selectedCategories: Set<string>;
  selectedProtocols: Set<string>;
  selectedManufacturers: Set<string>;
  selectedCapabilities: Set<string>;
  onToggleCategory: (v: string) => void;
  onToggleProtocol: (v: string) => void;
  onToggleManufacturer: (v: string) => void;
  onToggleCapability: (v: string) => void;
}

export default function DeviceFilterSidebar({
  counts,
  selectedCategories,
  selectedProtocols,
  selectedManufacturers,
  selectedCapabilities,
  onToggleCategory,
  onToggleProtocol,
  onToggleManufacturer,
  onToggleCapability,
}: DeviceFilterSidebarProps) {
  return (
    <aside className="device-library-sidebar">
      <FacetGroup
        title="Category"
        options={counts.categories.map(([v, c]) => ({ value: v, label: v, count: c }))}
        selected={selectedCategories}
        onToggle={onToggleCategory}
      />
      <FacetGroup
        title="Protocol"
        options={counts.protocols.map(([v, c]) => ({ value: v, label: v, count: c }))}
        selected={selectedProtocols}
        onToggle={onToggleProtocol}
      />
      <FacetGroup
        title="Manufacturer"
        options={counts.manufacturers.map(([v, c]) => ({ value: v, label: v, count: c }))}
        selected={selectedManufacturers}
        onToggle={onToggleManufacturer}
        searchable
        truncateAt={8}
      />
      <FacetGroup
        title="Capabilities"
        options={counts.capabilities.map(([v, c]) => ({ value: v, label: capabilityLabels[v] ?? v, count: c }))}
        selected={selectedCapabilities}
        onToggle={onToggleCapability}
      />
    </aside>
  );
}

const capabilityLabels: Record<string, string> = {
  discretePower: "Discrete Power",
  volumeControl: "Volume Control",
  inputSelect: "Input Select",
  feedback: "Feedback",
};
