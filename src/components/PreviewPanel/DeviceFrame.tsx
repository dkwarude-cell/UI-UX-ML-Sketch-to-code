"use client";

import { DEVICE_VIEWS } from "@/lib/constants";
import { useAppStore } from "@/store/useAppStore";

export default function DeviceFrame() {
  const deviceView = useAppStore((s) => s.deviceView);
  const setDeviceView = useAppStore((s) => s.setDeviceView);

  return (
    <div className="flex items-center gap-1">
      {DEVICE_VIEWS.map((device) => {
        const isActive = deviceView === device.id;
        return (
          <button
            key={device.id}
            onClick={() => setDeviceView(device.id)}
            className="px-2 py-0.5 text-[11px] rounded-md transition-all"
            style={{
              background: isActive ? "var(--accent-blue)" : "transparent",
              color: isActive ? "#FFFFFF" : "var(--text-muted)",
              fontWeight: isActive ? 600 : 400,
            }}
            title={device.label}
          >
            {device.icon}
          </button>
        );
      })}
    </div>
  );
}
