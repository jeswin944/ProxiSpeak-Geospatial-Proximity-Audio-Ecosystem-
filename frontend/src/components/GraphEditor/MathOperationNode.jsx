import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const OPERATIONS = [
  { value: 'add', label: 'Add (+)' },
  { value: 'subtract', label: 'Subtract (-)' },
  { value: 'multiply', label: 'Multiply (×)' },
  { value: 'divide', label: 'Divide (÷)' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
  { value: 'compare_gt', label: 'Compare (>)' },
  { value: 'compare_lt', label: 'Compare (<)' },
  { value: 'compare_eq', label: 'Compare (==)' }
];

function MathOperationNode({ id, data, isConnectable }) {
  const currentOp = data?.operation || 'add';

  const handleOpChange = (e) => {
    if (data?.onChange) {
      data.onChange(id, { ...data, operation: e.target.value });
    }
  };

  const handleDefaultBChange = (e) => {
    if (data?.onChange) {
      data.onChange(id, { ...data, defaultB: Number(e.target.value) });
    }
  };

  return (
    <div className="ps-node ps-node-math">
      <Handle
        type="target"
        position={Position.Left}
        id="a"
        style={{ top: '35%' }}
        isConnectable={isConnectable}
        className="ps-handle ps-handle-in"
      />
      <span className="ps-handle-label" style={{ top: '30%', left: '8px' }}>A</span>

      <Handle
        type="target"
        position={Position.Left}
        id="b"
        style={{ top: '70%' }}
        isConnectable={isConnectable}
        className="ps-handle ps-handle-in"
      />
      <span className="ps-handle-label" style={{ top: '65%', left: '8px' }}>B</span>

      <div className="ps-node-header">
        <span className="ps-node-badge badge-math">MATH OPERATION</span>
        <span className="ps-node-title">{data?.label || 'Math Transformer'}</span>
      </div>

      <div className="ps-node-body">
        <div className="ps-node-field">
          <label>Operation:</label>
          <select value={currentOp} onChange={handleOpChange} className="ps-select">
            {OPERATIONS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ps-node-field">
          <label>Default B (Fallback):</label>
          <input
            type="number"
            value={data?.defaultB !== undefined ? data.defaultB : 2}
            onChange={handleDefaultBChange}
            className="ps-input"
          />
        </div>

        {currentOp === 'divide' && (
          <div className="ps-safety-pill">
            🛡️ Zero-division safe fallback active
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

export default memo(MathOperationNode);
