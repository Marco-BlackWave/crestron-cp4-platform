import { Link } from "react-router";
import { useSystemConfig } from "../hooks/useSystemConfig";
import { useJoinContract } from "../hooks/useJoinContract";
import type { RoomConfig, ProcessorConfig } from "../schema/systemConfigSchema";

const protocolColors: Record<string, string> = {
  ir: "ir", serial: "serial-proto", ip: "ip", bacnet: "bacnet", modbus: "modbus",
};

function RoomNode({ room }: { room: RoomConfig }) {
  const deviceCount = Object.keys(room.devices).length;
  const isTechnical = room.roomType === "technical";
  const minJoin = room.joinOffset + 1;
  const maxJoin = room.joinOffset + 100;

  return (
    <div className="arch-node">
      <Link to={`/rooms/${room.id}`} style={{ textDecoration: "none", color: "inherit" }}>
        <div className="arch-node-content">
          <span className="arch-node-label">
            {room.name}
            {isTechnical && <span className="pill pill--technical" style={{ marginLeft: 8, fontSize: 10 }}>Equipment</span>}
          </span>
          <span className="arch-node-meta">
            Joins {minJoin}–{maxJoin} &middot; {deviceCount} device{deviceCount !== 1 ? "s" : ""}
          </span>
        </div>
      </Link>

      {/* Child devices */}
      {deviceCount > 0 && (
        <div className="arch-children">
          {Object.entries(room.devices).map(([role, dev]) => (
            <div key={role} className="arch-node">
              <Link to={`/devices/${dev.profileId}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="arch-node-content" style={{ padding: "6px 12px" }}>
                  <span style={{ fontSize: 13 }}>
                    <strong style={{ textTransform: "capitalize" }}>{role}:</strong> {dev.profileId}
                  </span>
                  <div className="badge-row">
                    <span className={`pill pill--${protocolColors[dev.protocol] ?? ""}`} style={{ fontSize: 10, padding: "2px 8px" }}>
                      {dev.protocol}
                    </span>
                    {dev.address && <span className="pill" style={{ fontSize: 10, padding: "2px 8px" }}>{dev.address}</span>}
                    {dev.port && <span className="pill" style={{ fontSize: 10, padding: "2px 8px" }}>{dev.port}</span>}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Room subsystems */}
      {!isTechnical && room.subsystems.length > 0 && (
        <div style={{ marginLeft: 24, paddingLeft: 16, marginTop: 2 }}>
          <div className="badge-row">
            {room.subsystems.map((sub) => (
              <span key={sub} className={`pill pill--${sub}`} style={{ fontSize: 10, padding: "2px 8px" }}>
                {sub}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProcessorNode({ proc, rooms }: { proc: ProcessorConfig; rooms: RoomConfig[] }) {
  return (
    <div className="arch-node">
      <div className="arch-node-content">
        <span className="arch-node-label">Processor: {proc.id} ({proc.processor})</span>
        <span className="arch-node-meta">EISC {proc.eiscIpId} @ {proc.eiscIpAddress}</span>
      </div>
      <div className="arch-children">
        {rooms.map((room) => (
          <RoomNode key={room.id} room={room} />
        ))}
        {rooms.length === 0 && (
          <div className="arch-node">
            <div className="arch-node-content" style={{ padding: "6px 12px", opacity: 0.5 }}>
              <span style={{ fontSize: 13 }}>No rooms assigned</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ArchitectureOverview() {
  const config = useSystemConfig();
  const contract = useJoinContract();

  if (!config.data || !contract.data) {
    return <p className="subhead">Loading system data...</p>;
  }

  const { data } = config;
  const processors = data.system.processors ?? [];
  const hasMultipleProcessors = processors.length > 1;

  // Group rooms by processor
  const roomsByProcessor = new Map<string, RoomConfig[]>();
  for (const proc of processors) {
    roomsByProcessor.set(proc.id, []);
  }
  for (const room of data.rooms) {
    const procId = room.processorId ?? processors[0]?.id ?? "main";
    if (!roomsByProcessor.has(procId)) roomsByProcessor.set(procId, []);
    roomsByProcessor.get(procId)!.push(room);
  }

  return (
    <div className="arch-tree">
      {/* System node */}
      <div className="arch-node">
        <div className="arch-node-content">
          <span className="arch-node-label">System: {data.system.name}</span>
          <span className="arch-node-meta">{data.processor} — {data.rooms.length} room{data.rooms.length !== 1 ? "s" : ""}, {processors.length} processor{processors.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="arch-children">
        {hasMultipleProcessors ? (
          /* Multi-processor: group rooms under each processor */
          processors.map((proc) => (
            <ProcessorNode
              key={proc.id}
              proc={proc}
              rooms={roomsByProcessor.get(proc.id) ?? []}
            />
          ))
        ) : (
          /* Single processor: show EISC + rooms directly */
          <>
            <div className="arch-node">
              <div className="arch-node-content">
                <span className="arch-node-label">EISC: {processors[0]?.eiscIpId ?? data.system.eiscIpId}</span>
                <span className="arch-node-meta">@ {processors[0]?.eiscIpAddress ?? data.system.eiscIpAddress}</span>
              </div>
            </div>
            <div className="arch-children">
              {data.rooms.map((room) => (
                <RoomNode key={room.id} room={room} />
              ))}
            </div>
          </>
        )}

        {/* Sources */}
        {data.sources.length > 0 && (
          <div className="arch-node">
            <div className="arch-node-content">
              <span className="arch-node-label">Sources</span>
              <span className="arch-node-meta">{data.sources.length} defined</span>
            </div>
            <div className="arch-children">
              {data.sources.map((src) => (
                <div key={src.id} className="arch-node">
                  <div className="arch-node-content" style={{ padding: "6px 12px" }}>
                    <span style={{ fontSize: 13 }}>{src.name}</span>
                    <span className="pill" style={{ fontSize: 10, padding: "2px 8px" }}>{src.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scenes */}
        {data.scenes.length > 0 && (
          <div className="arch-node">
            <Link to="/scenes" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="arch-node-content">
                <span className="arch-node-label">Scenes</span>
                <span className="arch-node-meta">{data.scenes.length} defined</span>
              </div>
            </Link>
            <div className="arch-children">
              {data.scenes.map((scene) => (
                <div key={scene.id} className="arch-node">
                  <div className="arch-node-content" style={{ padding: "6px 12px" }}>
                    <span style={{ fontSize: 13 }}>{scene.name}</span>
                    <span className="arch-node-meta">Rooms: {scene.rooms.join(", ")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
