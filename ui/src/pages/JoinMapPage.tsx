import { useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router";
import { useJoinContract } from "../hooks/useJoinContract";
import { JoinContractEntry } from "../schema/joinContractSchema";

interface FlatJoin extends JoinContractEntry {
  type: "digital" | "analog" | "serial";
  room: string;
  roomId: string;
  subsystem: string;
}

type SortKey = "join" | "name" | "type" | "direction" | "room" | "subsystem";
type SortDir = "asc" | "desc";

function inferSubsystem(name: string): string {
  const lower = name.toLowerCase();
  if (/security|zone|alarm|arm|panic|disarm/.test(lower)) return "security";
  if (/shade|position/.test(lower)) return "shades";
  if (/light/.test(lower)) return "lighting";
  if (/temp|hvac|setpoint/.test(lower)) return "hvac";
  if (/power|source|volume|mute/.test(lower)) return "av";
  if (/scene|status|room name|all off/.test(lower)) return "system";
  return "other";
}

function parseSet(params: URLSearchParams, key: string): Set<string> {
  const val = params.get(key);
  if (!val) return new Set();
  return new Set(val.split(",").filter(Boolean));
}

function setToParam(set: Set<string>): string | undefined {
  return set.size > 0 ? Array.from(set).join(",") : undefined;
}

const typeColors: Record<string, string> = { digital: "digital", analog: "analog", serial: "serial" };
const dirColors: Record<string, string> = { input: "input", output: "output" };
const subColors: Record<string, string> = {
  av: "av", lighting: "lighting", shades: "shades", hvac: "hvac", security: "security",
};

export default function JoinMapPage() {
  const contract = useJoinContract();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read filter state from URL
  const search = searchParams.get("q") ?? "";
  const typeFilter = useMemo(() => parseSet(searchParams, "type"), [searchParams]);
  const dirFilter = useMemo(() => parseSet(searchParams, "dir"), [searchParams]);
  const roomFilter = useMemo(() => parseSet(searchParams, "room"), [searchParams]);
  const subFilter = useMemo(() => parseSet(searchParams, "sub"), [searchParams]);
  const sortKey = (searchParams.get("sort") as SortKey) || "join";
  const sortDir = (searchParams.get("order") as SortDir) || "asc";

  useEffect(() => { document.title = "Join Map — CP4"; }, []);

  // Update URL params (replaces history entry to avoid back-button flood)
  const updateParams = useCallback((updates: Record<string, string | undefined>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined || v === "") {
          next.delete(k);
        } else {
          next.set(k, v);
        }
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setSearch = useCallback((q: string) => updateParams({ q: q || undefined }), [updateParams]);

  const toggleSetParam = useCallback((paramKey: string, currentSet: Set<string>, value: string) => {
    const next = new Set(currentSet);
    if (next.has(value)) next.delete(value); else next.add(value);
    updateParams({ [paramKey]: setToParam(next) });
  }, [updateParams]);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      updateParams({ order: sortDir === "asc" ? "desc" : "asc" });
    } else {
      updateParams({ sort: key, order: "asc" });
    }
  }, [sortKey, sortDir, updateParams]);

  // Flatten contract into a single array
  const allJoins = useMemo((): FlatJoin[] => {
    if (!contract.data) return [];
    const result: FlatJoin[] = [];

    for (const room of contract.data.rooms) {
      for (const type of ["digital", "analog", "serial"] as const) {
        for (const entry of room.joins[type]) {
          result.push({
            ...entry,
            type,
            room: room.name,
            roomId: room.id,
            subsystem: inferSubsystem(entry.name),
          });
        }
      }
    }

    for (const entry of contract.data.system.digital) {
      result.push({ ...entry, type: "digital", room: "System", roomId: "system", subsystem: "system" });
    }
    for (const entry of contract.data.system.serial) {
      result.push({ ...entry, type: "serial", room: "System", roomId: "system", subsystem: "system" });
    }

    return result;
  }, [contract.data]);

  const roomOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const j of allJoins) {
      if (!seen.has(j.roomId)) seen.set(j.roomId, j.room);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [allJoins]);

  const subOptions = useMemo(() => {
    const subs = new Set<string>();
    for (const j of allJoins) subs.add(j.subsystem);
    return Array.from(subs).sort();
  }, [allJoins]);

  // Filter + sort
  const filtered = useMemo(() => {
    let rows = allJoins;

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((j) =>
        j.name.toLowerCase().includes(q) || String(j.join).includes(q)
      );
    }
    if (typeFilter.size > 0) rows = rows.filter((j) => typeFilter.has(j.type));
    if (dirFilter.size > 0) rows = rows.filter((j) => dirFilter.has(j.direction));
    if (roomFilter.size > 0) rows = rows.filter((j) => roomFilter.has(j.roomId));
    if (subFilter.size > 0) rows = rows.filter((j) => subFilter.has(j.subsystem));

    const sorted = [...rows];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "join": cmp = a.join - b.join; break;
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "type": cmp = a.type.localeCompare(b.type); break;
        case "direction": cmp = a.direction.localeCompare(b.direction); break;
        case "room": cmp = a.room.localeCompare(b.room); break;
        case "subsystem": cmp = a.subsystem.localeCompare(b.subsystem); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [allJoins, search, typeFilter, dirFilter, roomFilter, subFilter, sortKey, sortDir]);

  if (contract.status === "loading") {
    return (
      <div className="page-content">
        <div className="skeleton skeleton-heading" />
        <div className="skeleton" style={{ height: 48, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    );
  }

  if (contract.status === "error") {
    return (
      <div className="page-content">
        <h1>Join Map</h1>
        <div className="card error" role="alert">{contract.error}</div>
      </div>
    );
  }

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " \u25B2" : " \u25BC") : "";

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Join Map</h1>
          <p className="subhead">
            {filtered.length} of {allJoins.length} joins
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <input
          className="search-input"
          type="text"
          placeholder="Search join # or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="filter-group">
          <span className="filter-group-label">Type</span>
          {(["digital", "analog", "serial"] as const).map((t) => (
            <button
              key={t}
              className={`filter-pill ${typeFilter.has(t) ? "filter-pill--active" : ""}`}
              onClick={() => toggleSetParam("type", typeFilter, t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="filter-group">
          <span className="filter-group-label">Dir</span>
          {(["input", "output"] as const).map((d) => (
            <button
              key={d}
              className={`filter-pill ${dirFilter.has(d) ? "filter-pill--active" : ""}`}
              onClick={() => toggleSetParam("dir", dirFilter, d)}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="filter-group">
          <span className="filter-group-label">Room</span>
          {roomOptions.map((r) => (
            <button
              key={r.id}
              className={`filter-pill ${roomFilter.has(r.id) ? "filter-pill--active" : ""}`}
              onClick={() => toggleSetParam("room", roomFilter, r.id)}
            >
              {r.name}
            </button>
          ))}
        </div>

        <div className="filter-group">
          <span className="filter-group-label">Subsystem</span>
          {subOptions.map((s) => (
            <button
              key={s}
              className={`filter-pill ${subFilter.has(s) ? "filter-pill--active" : ""}`}
              onClick={() => toggleSetParam("sub", subFilter, s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <section className="card" style={{ overflow: "auto" }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <h2>No Joins Found</h2>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <table className="join-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort("join")}>Join{sortArrow("join")}</th>
                <th onClick={() => toggleSort("name")}>Name{sortArrow("name")}</th>
                <th onClick={() => toggleSort("type")}>Type{sortArrow("type")}</th>
                <th onClick={() => toggleSort("direction")}>Direction{sortArrow("direction")}</th>
                <th onClick={() => toggleSort("room")}>Room{sortArrow("room")}</th>
                <th onClick={() => toggleSort("subsystem")}>Subsystem{sortArrow("subsystem")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((j) => (
                <tr key={`${j.type}-${j.join}-${j.roomId}`}>
                  <td style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{j.join}</td>
                  <td>{j.name}</td>
                  <td><span className={`pill pill--${typeColors[j.type] ?? ""}`}>{j.type}</span></td>
                  <td><span className={`pill pill--${dirColors[j.direction] ?? ""}`}>{j.direction}</span></td>
                  <td>{j.room}</td>
                  <td><span className={`pill pill--${subColors[j.subsystem] ?? ""}`}>{j.subsystem}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
