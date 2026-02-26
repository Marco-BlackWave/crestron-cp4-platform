import React, { useState } from "react";
import {
  Home,
  UtensilsCrossed,
  BedDouble,
  Sparkles,
  MonitorPlay,
  TreePine,
} from "lucide-react";

const rooms = [
  { id: "living", name: "Living Room", icon: Home },
  { id: "kitchen", name: "Kitchen", icon: UtensilsCrossed },
  { id: "bedroom", name: "Master Bedroom", icon: BedDouble },
  { id: "cinema", name: "Cinema", icon: Sparkles },
  { id: "display", name: "Media Room", icon: MonitorPlay },
  { id: "outdoor", name: "Outdoor", icon: TreePine },
];

interface RoomSidebarProps {
  activeRoom: string;
  onRoomChange: (room: string) => void;
}

export function RoomSidebar({ activeRoom, onRoomChange }: RoomSidebarProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {rooms.map((room) => {
        const Icon = room.icon;
        const isActive = activeRoom === room.id;
        return (
          <button
            key={room.id}
            onClick={() => onRoomChange(room.id)}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all duration-300 text-left
              ${
                isActive
                  ? "bg-white/25 border border-white/30 text-white shadow-md"
                  : "bg-white/8 border border-white/5 text-white/70 hover:bg-white/15 hover:text-white"
              }`}
          >
            <Icon className="w-5 h-5 shrink-0" strokeWidth={1.5} />
            <span className="text-[0.95rem]">{room.name}</span>
          </button>
        );
      })}
    </div>
  );
}
