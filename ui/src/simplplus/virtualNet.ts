// Virtual Network — in-browser simulation of Crestron TCP/UDP sockets

export type SocketStatus = "closed" | "connecting" | "connected" | "error";

export interface VSocket {
  id: number;
  protocol: "TCP" | "UDP";
  remoteAddress: string;
  remotePort: number;
  localPort: number;
  status: SocketStatus;
  txLog: { time: number; data: string }[];
  rxLog: { time: number; data: string }[];
}

export interface DeviceSimulator {
  name: string;
  address: string;
  port: number;
  protocol: "TCP" | "UDP";
  handleMessage: (data: string) => string;
}

// ── Built-in device simulators ──

const echoSimulator: DeviceSimulator = {
  name: "Echo Server",
  address: "192.168.1.100",
  port: 23,
  protocol: "TCP",
  handleMessage: (data: string) => data,
};

const projectorSimulator: DeviceSimulator = {
  name: "Projector Sim",
  address: "192.168.1.101",
  port: 23,
  protocol: "TCP",
  handleMessage: (data: string) => {
    const cmd = data.trim().toUpperCase();
    const responses: Record<string, string> = {
      "PWR ON": "PWR=ON\r\n",
      "PWR OFF": "PWR=OFF\r\n",
      "PWR?": "PWR=ON\r\n",
      "INPUT HDMI1": "INPUT=HDMI1\r\n",
      "INPUT HDMI2": "INPUT=HDMI2\r\n",
      "INPUT VGA": "INPUT=VGA\r\n",
      "INPUT?": "INPUT=HDMI1\r\n",
      "VOL UP": "VOL=50\r\n",
      "VOL DOWN": "VOL=48\r\n",
      "VOL?": "VOL=49\r\n",
      "MUTE ON": "MUTE=ON\r\n",
      "MUTE OFF": "MUTE=OFF\r\n",
      "MUTE?": "MUTE=OFF\r\n",
      "LAMP?": "LAMP=1234\r\n",
    };
    return responses[cmd] ?? `ERR:UNKNOWN_CMD \"${cmd}\"\r\n`;
  },
};

const displaySimulator: DeviceSimulator = {
  name: "Display Sim",
  address: "192.168.1.102",
  port: 4660,
  protocol: "TCP",
  handleMessage: (data: string) => {
    const cmd = data.trim().toUpperCase();
    if (cmd.startsWith("POWR")) return cmd.includes("1") ? "POWR0000000000000001\r" : "POWR0000000000000000\r";
    if (cmd.startsWith("INPT")) return "INPT0000000000000001\r";
    if (cmd === "VOLM?") return "VOLM0000000000000032\r";
    return "ERR\r";
  },
};

const DEFAULT_SIMULATORS: DeviceSimulator[] = [echoSimulator, projectorSimulator, displaySimulator];

export class VirtualNetwork {
  private sockets: Map<number, VSocket> = new Map();
  private nextSocketId = 1;
  private simulators: DeviceSimulator[] = [...DEFAULT_SIMULATORS];
  private responseDelay = 50; // ms
  onChange: (() => void) | null = null;
  onSocketReceive: ((socketId: number, data: string) => void) | null = null;

  reset() {
    this.sockets.clear();
    this.nextSocketId = 1;
  }

  private notify() {
    if (this.onChange) this.onChange();
  }

  // ── Socket operations ──

  socketConnectTcp(address: string, port: number): number {
    const id = this.nextSocketId++;
    const socket: VSocket = {
      id,
      protocol: "TCP",
      remoteAddress: address,
      remotePort: port,
      localPort: 49000 + id,
      status: "connecting",
      txLog: [],
      rxLog: [],
    };
    this.sockets.set(id, socket);
    this.notify();

    // Check if a simulator handles this address:port
    const sim = this.simulators.find(s => s.address === address && s.port === port);

    // Simulate connection delay
    setTimeout(() => {
      if (sim) {
        socket.status = "connected";
      } else {
        // Unknown host — connect anyway (virtual network)
        socket.status = "connected";
      }
      this.notify();
      // Fire SOCKETCONNECT event callback
      if (this.onSocketReceive) {
        this.onSocketReceive(id, `__CONNECTED__`);
      }
    }, 100);

    return id;
  }

  socketDisconnect(socketId: number): number {
    const socket = this.sockets.get(socketId);
    if (!socket) return -1;
    socket.status = "closed";
    this.notify();
    return 0;
  }

  socketSend(socketId: number, data: string): number {
    const socket = this.sockets.get(socketId);
    if (!socket || socket.status !== "connected") return -1;

    socket.txLog.push({ time: Date.now(), data });
    this.notify();

    // Check for simulator response
    const sim = this.simulators.find(
      s => s.address === socket.remoteAddress && s.port === socket.remotePort
    );

    if (sim) {
      setTimeout(() => {
        const response = sim.handleMessage(data);
        if (response) {
          socket.rxLog.push({ time: Date.now(), data: response });
          this.notify();
          if (this.onSocketReceive) {
            this.onSocketReceive(socketId, response);
          }
        }
      }, this.responseDelay);
    }

    return data.length;
  }

  socketGetStatus(socketId: number): number {
    const socket = this.sockets.get(socketId);
    if (!socket) return 0;
    switch (socket.status) {
      case "closed": return 0;
      case "connecting": return 1;
      case "connected": return 2;
      case "error": return 3;
      default: return 0;
    }
  }

  socketGetAddress(socketId: number): string {
    const socket = this.sockets.get(socketId);
    return socket?.remoteAddress ?? "";
  }

  socketGetRemoteIpAddress(socketId: number): string {
    return this.socketGetAddress(socketId);
  }

  socketServerStartListen(port: number): number {
    // Simulate a listening server — returns a socket ID
    const id = this.nextSocketId++;
    this.sockets.set(id, {
      id,
      protocol: "TCP",
      remoteAddress: "0.0.0.0",
      remotePort: 0,
      localPort: port,
      status: "connected",
      txLog: [],
      rxLog: [],
    });
    this.notify();
    return id;
  }

  // ── Inject data (for UI "Send" button) ──

  injectData(socketId: number, data: string) {
    const socket = this.sockets.get(socketId);
    if (!socket) return;
    socket.rxLog.push({ time: Date.now(), data });
    this.notify();
    if (this.onSocketReceive) {
      this.onSocketReceive(socketId, data);
    }
  }

  // ── Query for UI ──

  getSocketList(): VSocket[] {
    return Array.from(this.sockets.values());
  }

  getSimulators(): DeviceSimulator[] {
    return this.simulators;
  }

  getSocket(id: number): VSocket | undefined {
    return this.sockets.get(id);
  }
}
