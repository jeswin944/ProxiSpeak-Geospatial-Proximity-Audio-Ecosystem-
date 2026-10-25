const mongoose = require('mongoose');

const telemetryEventSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    metadata: {
      officeId: { type: String, required: true },
      userId: { type: String, required: true },
      eventType: { type: String, default: 'telemetry' },
      benchmarkRunId: { type: String, default: null }
    },
    data: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      speed: { type: Number, default: 0 },
      signalStrength: { type: Number, default: -50 }
    }
  },
  {
    timeseries: {
      timeField: 'timestamp',
      metaField: 'metadata',
      granularity: 'seconds'
    },
    expireAfterSeconds: 86400,
    versionKey: false
  }
);

telemetryEventSchema.index({ 'metadata.officeId': 1, timestamp: -1 });
telemetryEventSchema.index({ 'metadata.benchmarkRunId': 1 });

const TelemetryEvent = mongoose.models.TelemetryEvent || mongoose.model('TelemetryEvent', telemetryEventSchema, 'telemetry_events');

module.exports = TelemetryEvent;
