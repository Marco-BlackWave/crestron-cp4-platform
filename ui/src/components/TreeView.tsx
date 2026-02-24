import { useState, useCallback, type ReactNode, type KeyboardEvent } from "react";

export interface TreeNode<T = unknown> {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
  data?: T;
  children?: TreeNode<T>[];
}

function collectAllParentIds<T>(nodes: TreeNode<T>[]): string[] {
  const ids: string[] = [];
  function walk(list: TreeNode<T>[]) {
    for (const node of list) {
      if (node.children && node.children.length > 0) {
        ids.push(node.id);
        walk(node.children);
      }
    }
  }
  walk(nodes);
  return ids;
}

interface TreeViewProps<T = unknown> {
  nodes: TreeNode<T>[];
  defaultExpanded?: Set<string>;
  onSelect?: (node: TreeNode<T>) => void;
  selectedId?: string;
  renderLabel?: (node: TreeNode<T>) => ReactNode;
  className?: string;
  showControls?: boolean;
}

export function TreeView<T = unknown>({
  nodes,
  defaultExpanded,
  onSelect,
  selectedId,
  renderLabel,
  className,
  showControls,
}: TreeViewProps<T>) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => defaultExpanded ?? new Set()
  );

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpanded(new Set(collectAllParentIds(nodes)));
  }, [nodes]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  return (
    <div>
      {showControls && (
        <div className="tree-controls">
          <button className="tree-controls__btn" onClick={expandAll} type="button">Expand All</button>
          <button className="tree-controls__btn" onClick={collapseAll} type="button">Collapse All</button>
        </div>
      )}
      <ul className={`tree ${className ?? ""}`} role="tree">
        {nodes.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            toggle={toggle}
            onSelect={onSelect}
            selectedId={selectedId}
            renderLabel={renderLabel}
          />
        ))}
      </ul>
    </div>
  );
}

function TreeItem<T>({
  node,
  depth,
  expanded,
  toggle,
  onSelect,
  selectedId,
  renderLabel,
}: {
  node: TreeNode<T>;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  onSelect?: (node: TreeNode<T>) => void;
  selectedId?: string;
  renderLabel?: (node: TreeNode<T>) => ReactNode;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedId === node.id;

  const handleClick = () => {
    if (hasChildren) toggle(node.id);
    if (onSelect) onSelect(node);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    } else if (e.key === "ArrowRight" && hasChildren && !isExpanded) {
      e.preventDefault();
      toggle(node.id);
    } else if (e.key === "ArrowLeft" && hasChildren && isExpanded) {
      e.preventDefault();
      toggle(node.id);
    }
  };

  return (
    <li className="tree-item" role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined}>
      <div
        className={`tree-item__row${isSelected ? " tree-item__row--selected" : ""}`}
        style={{ paddingLeft: depth * 20 + 12 }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <span
          className={`tree-item__chevron${isExpanded ? " tree-item__chevron--expanded" : ""}${!hasChildren ? " tree-item__chevron--hidden" : ""}`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {node.icon && <span className="tree-item__icon">{node.icon}</span>}
        <span className="tree-item__label">
          {renderLabel ? renderLabel(node) : node.label}
        </span>
        {node.badge !== undefined && (
          <span className="tree-item__badge">{node.badge}</span>
        )}
      </div>
      {hasChildren && isExpanded && (
        <ul className="tree-item__children" role="group">
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              onSelect={onSelect}
              selectedId={selectedId}
              renderLabel={renderLabel}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
