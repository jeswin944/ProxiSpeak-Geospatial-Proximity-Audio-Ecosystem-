import { useState } from "react";
import RealtimeAvatarDemo from "./components/RealtimeAvatarDemo";
import GraphEditor from "./components/GraphEditor/GraphEditor";

export default function App() {
  const [activeTab, setActiveTab] = useState("office");

  const buttonStyle = (tab) => ({
    padding: "8px 14px",
    borderRadius: "6px",
    border:
      activeTab === tab
        ? "1px solid #38bdf8"
        : "1px solid transparent",
    background:
      activeTab === tab
        ? "rgba(56,189,248,0.15)"
        : "transparent",
    color: activeTab === tab ? "#38bdf8" : "#94a3b8",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#0b0f19",
        color: "#f8fafc",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 24px",
          background: "rgba(15,23,42,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "16px",
            fontWeight: 700,
          }}
        >
          <span style={{ color: "#38bdf8" }}>●</span>{" "}
          ProxiSpeak{" "}
          <span style={{ color: "#94a3b8", fontWeight: 400 }}>
            Ecosystem
          </span>
        </h1>

        <nav style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            style={buttonStyle("office")}
            onClick={() => setActiveTab("office")}
          >
            🏢 Virtual Office
          </button>

          <button
            type="button"
            style={buttonStyle("graph")}
            onClick={() => setActiveTab("graph")}
          >
            ⚡ Logic Graph Editor
          </button>
        </nav>
      </header>

      <main
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          overflow: "auto",
        }}
      >
        {activeTab === "office" ? (
          <RealtimeAvatarDemo />
        ) : (
          <GraphEditor />
        )}
      </main>
    </div>
  );
}
