import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function ActionTriggerNode({ id, data, isConnectable }) {
  const nodeType = data?.subType || 'action_logger';

  const handlePrefixChange = (e) => {
    if (data?.onChange) {
      data.onChange(id, { ...data, prefix: e.target.value });
    }
  };

  const handleThresholdChange = (e) => {
    if (data?.onChange) {
      data.onChange(id, { ...data, threshold: Number(e.target.value) });
    }
  };

  const handleEventNameChange = (e) => {
    if (data?.onChange) {
      data.onChange(id, { ...data, eventName: e.target.value });
    }
  };

  return (
    <div className="ps-node ps-node-action">
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        isConnectable={isConnectable}
        className="ps-handle ps-handle-in"
      />

      <div className="ps-node-header">
        <span className="ps-node-badge badge-action">ACTION TRIGGER</span>
        <span className="ps-node-title">
          {nodeType === 'action_logger'
            ? 'Structured Logger'
            : nodeType === 'action_threshold_alert'
            ? 'Threshold Alert'
            : 'Event Dispatcher'}
        </span>
      </div>

      <div className="ps-node-body">
        {nodeType === 'action_logger' && (
          <div className="ps-node-field">
            <label>Log Prefix:</label>
            <input
              type="text"
              value={data?.prefix || '[AUDIT-LOG]'}
              onChange={handlePrefixChange}
              className="ps-input"
            />
          </div>
        )}

        {nodeType === 'action_threshold_alert' && (
          <div className="ps-node-field">
            <label>Alert Threshold (&gt;):</label>
            <input
              type="number"
              value={data?.threshold !== undefined ? data.threshold : 100}
              onChange={handleThresholdChange}
              className="ps-input"
            />
          </div>
        )}

        {nodeType === 'action_event_emitter' && (
          <div className="ps-node-field">
            <label>Event Name:</label>
            <input
              type="text"
              value={data?.eventName || 'proxispeak:event'}
              onChange={handleEventNameChange}
              className="ps-input"
            />
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

export default memo(ActionTriggerNode);
