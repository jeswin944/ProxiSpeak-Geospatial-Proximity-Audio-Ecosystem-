import DataSourceNode from './DataSourceNode';
import MathOperationNode from './MathOperationNode';
import ActionTriggerNode from './ActionTriggerNode';

export const nodeTypes = {
  source_static: DataSourceNode,
  source_interval: DataSourceNode,
  source_manual: DataSourceNode,
  source_mock_events: DataSourceNode,
  math_operation: MathOperationNode,
  action_logger: ActionTriggerNode,
  action_event_emitter: ActionTriggerNode,
  action_threshold_alert: ActionTriggerNode
};
