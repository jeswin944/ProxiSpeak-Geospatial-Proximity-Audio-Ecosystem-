import { useState } from "react";
import RealtimeAvatarDemo from "./components/RealtimeAvatarDemo";
import GraphEditor from "./components/GraphEditor/GraphEditor";

export default function App() {
  const [activeTab, setActiveTab] = useState("office");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0b0f19", color: "#f8fafc" }}>
      {/* Ecosystem Top Navigation Bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 24px",
          background: "rgba(15, 23, 42, 0.95)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          zIndex: 50
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "#38bdf8",
              boxShadow: "0 0 10px #38bdf8"
            }}
          />
          <h1 style={{ margin: 0, fontSize: "16px", fontWeight: "700", letterSpacing: "0.5px" }}>
            ProxiSpeak <span style={{ color: "#94a3b8", fontWeight: "400" }}>Ecosystem</span>
          </h1>
        </div>

        <nav style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setActiveTab("office")}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: activeTab === "office" ? "1px solid #38bdf8" : "1px solid transparent",
              background: activeTab === "office" ? "rgba(56, 189, 248, 0.15)" : "transparent",
              color: activeTab === "office" ? "#38bdf8" : "#94a3b8",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            🏢 Virtual Office
          </button>
          <button
            onClick={() => setActiveTab("graph")}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: activeTab === "graph" ? "1px solid #38bdf8" : "1px solid transparent",
              background: activeTab === "graph" ? "rgba(56, 189, 248, 0.15)" : "transparent",
              color: activeTab === "graph" ? "#38bdf8" : "#94a3b8",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            ⚡ Logic Graph Editor
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {activeTab === "office" ? <RealtimeAvatarDemo /> : <GraphEditor />}
      </main>
    </div>
  );
}