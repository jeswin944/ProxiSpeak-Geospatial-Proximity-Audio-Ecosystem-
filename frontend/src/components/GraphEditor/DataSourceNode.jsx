import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function DataSourceNode({ id, data, isConnectable }) {
  const nodeType = data?.subType || 'source_static';
  const label = data?.label || (nodeType === 'source_static' ? 'Static Value' : nodeType === 'source_interval' ? 'Interval Timer' : 'Mock Telemetry');

  const handleValueChange = (e) => {
    if (data?.onChange) {
      data.onChange(id, { ...data, value: Number(e.target.value) });
    }
  };

  const handleIntervalChange = (e) => {
    if (data?.onChange) {
      data.onChange(id, { ...data, intervalMs: Number(e.target.value) });
    }
  };

  return (
    <div className="ps-node ps-node-source">
      <div className="ps-node-header">
        <span className="ps-node-badge badge-source">DATA SOURCE</span>
        <span className="ps-node-title">{label}</span>
      </div>

      <div className="ps-node-body">
        {nodeType === 'source_static' && (
          <div className="ps-node-field">
            <label>Constant Value:</label>
            <input
              type="number"
              value={data?.value !== undefined ? data.value : 10}
              onChange={handleValueChange}
              className="ps-input"
            />
          </div>
        )}

        {nodeType === 'source_interval' && (
          <div className="ps-node-field">
            <label>Interval (ms):</label>
            <input
              type="number"
              min="50"
              step="50"
              value={data?.intervalMs || 500}
              onChange={handleIntervalChange}
              className="ps-input"
            />
          </div>
        )}

        {nodeType === 'source_mock_events' && (
          <div className="ps-node-field">
            <span className="ps-node-hint">Emits proximity telemetry stream</span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="out"
        isConnectable={isConnectable}
        className="ps-handle ps-handle-out"
      />
    </div>
  );
}

export default memo(DataSourceNode);
