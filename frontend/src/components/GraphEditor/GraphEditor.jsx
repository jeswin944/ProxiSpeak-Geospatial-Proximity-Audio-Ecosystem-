import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './GraphEditor.css';
import { nodeTypes } from './nodeTypes';
import { serializeGraph, deserializeGraph } from '../../utils/graphSerialization';

const INITIAL_NODES = [
  {
    id: 'src-1',
    type: 'source_static',
    position: { x: 80, y: 100 },
    data: { value: 20, label: 'Proximity Distance' }
  },
  {
    id: 'src-2',
    type: 'source_static',
    position: { x: 80, y: 260 },
    data: { value: 10, label: 'Audio Threshold' }
  },
  {
    id: 'math-1',
    type: 'math_operation',
    position: { x: 340, y: 160 },
    data: { operation: 'subtract', defaultB: 0, label: 'Distance - Threshold' }
  },
  {
    id: 'act-alert',
    type: 'action_threshold_alert',
    position: { x: 620, y: 100 },
    data: { threshold: 5, comparison: 'gt' }
  },
  {
    id: 'act-log',
    type: 'action_logger',
    position: { x: 620, y: 260 },
    data: { prefix: '[PROXIMITY-STREAM]' }
  }
];

const INITIAL_EDGES = [
  { id: 'e1', source: 'src-1', target: 'math-1', sourceHandle: 'out', targetHandle: 'a' },
  { id: 'e2', source: 'src-2', target: 'math-1', sourceHandle: 'out', targetHandle: 'b' },
  { id: 'e3', source: 'math-1', target: 'act-alert', sourceHandle: 'out', targetHandle: 'in' },
  { id: 'e4', source: 'math-1', target: 'act-log', sourceHandle: 'out', targetHandle: 'in' }
];

export default function GraphEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [executionState, setExecutionState] = useState({ running: false, execId: null });

  const addConsoleLog = useCallback((msg, action = 'INFO', isError = false) => {
    setConsoleLogs((prev) => [
      ...prev.slice(-40),
      {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        action,
        msg,
        isError
      }
    ]);
  }, []);

  // Update node data helper
  const handleNodeDataChange = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: newData } : n))
    );
  }, [setNodes]);

  // Attach onChange callback to node data
  const processedNodes = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onChange: handleNodeDataChange
      }
    }));
  }, [nodes, handleNodeDataChange]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Add new nodes
  const addNode = (type, subType, label, defaultData = {}) => {
    const id = `node-${Date.now()}`;
    const newNode = {
      id,
      type,
      position: { x: 150 + Math.random() * 300, y: 80 + Math.random() * 200 },
      data: {
        label,
        subType,
        ...defaultData
      }
    };
    setNodes((nds) => [...nds, newNode]);
    addConsoleLog(`Added node "${label}" (${type})`, 'ADD_NODE');
  };

  // Export Graph JSON
  const handleExportJSON = () => {
    try {
      const json = serializeGraph(nodes, edges, { name: 'ProxiSpeak Pipeline' }, true);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `graph-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addConsoleLog('Graph serialized and exported to JSON file.', 'SERIALIZE');
    } catch (err) {
      addConsoleLog(`Serialization error: ${err.message}`, 'ERROR', true);
    }
  };

  // Import Graph JSON
  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const restored = deserializeGraph(event.target.result);
          setNodes(restored.nodes);
          setEdges(restored.edges);
          addConsoleLog(
            `Deserialized graph "${restored.metadata?.name || 'Imported'}" with ${restored.nodes.length} nodes and ${restored.edges.length} edges.`,
            'DESERIALIZE'
          );
        } catch (err) {
          addConsoleLog(`Deserialization error: ${err.message}`, 'ERROR', true);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Run pipeline against backend compiler
  const handleRunPipeline = async () => {
    try {
      setExecutionState({ running: true, execId: 'starting...' });
      addConsoleLog('Sending graph payload to backend compiler...', 'COMPILE');

      const graphPayload = serializeGraph(nodes, edges, { name: 'Editor Run' });
      const response = await fetch('/api/graph/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graph: graphPayload, durationMs: 1500 })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.errors?.join('; ') || result.error || 'Compilation failed');
      }

      setExecutionState({ running: false, execId: result.executionId });
      addConsoleLog(
        `Execution finished (ID: ${result.executionId}): ${result.eventCount} events, ${result.logs?.length || 0} logs, ${result.triggeredAlerts?.length || 0} alerts.`,
        'EXEC_SUCCESS'
      );

      (result.logs || []).forEach((log) => {
        addConsoleLog(JSON.stringify(log.payload), `LOG ${log.prefix}`);
      });

      (result.triggeredAlerts || []).forEach((alert) => {
        addConsoleLog(`Threshold breach! Value=${alert.value} Threshold=${alert.threshold}`, 'ALERT', true);
      });
    } catch (err) {
      setExecutionState({ running: false, execId: null });
      addConsoleLog(`Pipeline error: ${err.message}`, 'EXEC_ERROR', true);
    }
  };

  return (
    <div className="ps-graph-container">
      {/* Top Toolbar */}
      <div className="ps-graph-toolbar">
        <div className="ps-toolbar-group">
          <button className="ps-btn" onClick={() => addNode('source_static', 'source_static', 'Static Value', { value: 15 })}>
            + Static Source
          </button>
          <button className="ps-btn" onClick={() => addNode('source_interval', 'source_interval', 'Interval Timer', { intervalMs: 500 })}>
            + Timer Source
          </button>
          <button className="ps-btn" onClick={() => addNode('math_operation', null, 'Math Operation', { operation: 'multiply', defaultB: 2 })}>
            + Math Operation
          </button>
          <button className="ps-btn" onClick={() => addNode('action_threshold_alert', 'action_threshold_alert', 'Threshold Alert', { threshold: 50 })}>
            + Alert Trigger
          </button>
          <button className="ps-btn" onClick={() => addNode('action_logger', 'action_logger', 'Structured Logger', { prefix: '[LOG]' })}>
            + Logger Trigger
          </button>
        </div>

        <div className="ps-toolbar-group">
          <button className="ps-btn" onClick={handleExportJSON}>
            💾 Export JSON
          </button>
          <button className="ps-btn" onClick={handleImportJSON}>
            📂 Import JSON
          </button>
          <button
            className={`ps-btn ${executionState.running ? 'ps-btn-stop' : 'ps-btn-primary'}`}
            onClick={handleRunPipeline}
          >
            {executionState.running ? 'Running...' : '⚡ Validate & Execute'}
          </button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="ps-graph-canvas">
        <ReactFlow
          nodes={processedNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#334155" gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeStrokeColor="#38bdf8"
            nodeColor="#1e293b"
            maskColor="rgba(15, 23, 42, 0.7)"
          />
        </ReactFlow>
      </div>

      {/* Execution Console */}
      <div className="ps-graph-console">
        <div className="ps-console-header">
          <span>Execution Console & Stream Inspector</span>
          <span>{executionState.execId ? `Last Exec: ${executionState.execId}` : 'Status: Idle'}</span>
        </div>
        <div className="ps-console-logs">
          {consoleLogs.length === 0 ? (
            <div className="ps-log-entry" style={{ color: '#64748b' }}>
              Connect nodes and click "Validate & Execute" to compile the graph into an RxJS stream pipeline.
            </div>
          ) : (
            consoleLogs.map((log) => (
              <div key={log.id} className="ps-log-entry">
                <span className="ps-log-time">[{log.time}]</span>
                <span className="ps-log-action">{log.action}:</span>
                <span className={log.isError ? 'ps-log-error' : 'ps-log-msg'}>{log.msg}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
