import React, { useCallback, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";

import "reactflow/dist/style.css";

import {
  serializeGraph,
  deserializeGraph,
} from "./utils/graphSerialization.js";

const initialNodes = [
  {
    id: "node-1",
    type: "input",
    position: { x: 100, y: 100 },
    data: { label: "Start" },
  },
  {
    id: "node-2",
    type: "default",
    position: { x: 350, y: 200 },
    data: { label: "Process" },
  },
];

const initialEdges = [
  {
    id: "edge-node-1-node-2",
    source: "node-1",
    target: "node-2",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
];

export default function GraphEditor() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState(initialNodes);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState(initialEdges);

  const [graphName, setGraphName] = useState("ProxiSpeak Graph");
  const [message, setMessage] = useState("");

  const fileInputRef = useRef(null);

  // Connect two nodes.
  const onConnect = useCallback(
    (connection) => {
      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            id: `edge-${crypto.randomUUID()}`,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          currentEdges
        )
      );

      setMessage("Nodes connected successfully.");
    },
    [setEdges]
  );

  // Add a new node.
  const addNode = useCallback(() => {
    const id = `node-${crypto.randomUUID()}`;

    const newNode = {
      id,
      type: "default",
      position: {
        x: 150 + Math.random() * 250,
        y: 100 + Math.random() * 250,
      },
      data: {
        label: `Node ${nodes.length + 1}`,
      },
    };

    setNodes((currentNodes) => [...currentNodes, newNode]);
    setMessage("New node added.");
  }, [nodes.length, setNodes]);

  // Export the graph to a JSON file.
  const exportGraph = useCallback(() => {
    try {
      const graphData = serializeGraph(nodes, edges, {
        name: graphName,
        description: "ProxiSpeak graph",
      }, true);

      const blob = new Blob([graphData], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "proxispeak-graph.json";
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      setMessage("Graph exported successfully.");
    } catch (error) {
      console.error("Graph export failed:", error);
      setMessage(`Export failed: ${error.message}`);
    }
  }, [nodes, edges, graphName]);

  // Open the JSON file picker.
  const openImportDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Import a graph from a JSON file.
  const importGraph = useCallback(
    async (event) => {
      const file = event.target.files?.[0];

      if (!file) return;

      try {
        const content = await file.text();
        const graph = deserializeGraph(content);

        if (
          !graph ||
          !Array.isArray(graph.nodes) ||
          !Array.isArray(graph.edges)
        ) {
          throw new Error("The file does not contain a valid graph.");
        }

        setNodes(graph.nodes);
        setEdges(graph.edges);

        if (graph.metadata?.name) {
          setGraphName(graph.metadata.name);
        }

        setMessage("Graph imported successfully.");
      } catch (error) {
        console.error("Graph import failed:", error);
        setMessage(`Import failed: ${error.message}`);
      } finally {
        // Allow the same file to be selected again.
        event.target.value = "";
      }
    },
    [setNodes, setEdges]
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, sans-serif",
        background: "#f8fafc",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 18px",
          background: "#172033",
          color: "#ffffff",
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20 }}>
          ProxiSpeak Graph Editor
        </h2>

        <input
          value={graphName}
          onChange={(event) => setGraphName(event.target.value)}
          aria-label="Graph name"
          placeholder="Graph name"
          style={{
            padding: 8,
            borderRadius: 5,
            border: "1px solid #cbd5e1",
            minWidth: 150,
          }}
        />

        <button onClick={addNode} style={buttonStyle}>
          + Add Node
        </button>

        <button onClick={exportGraph} style={buttonStyle}>
          Export JSON
        </button>

        <button onClick={openImportDialog} style={buttonStyle}>
          Import JSON
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={importGraph}
          style={{ display: "none" }}
        />
      </header>

      {message && (
        <div
          role="status"
          style={{
            padding: "8px 16px",
            background: "#e2e8f0",
            color: "#1e293b",
            fontSize: 14,
          }}
        >
          {message}
        </div>
      )}

      <main style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          deleteKeyCode={["Backspace", "Delete"]}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </main>
    </div>
  );
}

const buttonStyle = {
  padding: "9px 13px",
  border: "none",
  borderRadius: 5,
  background: "#7c3aed",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 600,
};