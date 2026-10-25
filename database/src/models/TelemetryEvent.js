const mongoose = require('mongoose');

/**
 * TelemetryEvent Time-Series Model
 *
 * Dedicated to high-throughput append-only geospatial telemetry and graph events.
 * Uses MongoDB native Time-Series collection engine:
 * - timeField: "timestamp"
 * - metaField: "metadata"
 * - granularity: "seconds"
 *
 * Does not replace the mutable Presence collection, which maintains current active state.
 */
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
    expireAfterSeconds: 86400, // 24-hour historical TTL
    versionKey: false
  }
);

// Helpful compound index on metadata fields for fast spatial querying per office
telemetryEventSchema.index({ 'metadata.officeId': 1, timestamp: -1 });
telemetryEventSchema.index({ 'metadata.benchmarkRunId': 1 });

const TelemetryEvent = mongoose.models.TelemetryEvent || mongoose.model('TelemetryEvent', telemetryEventSchema, 'telemetry_events');

module.exports = TelemetryEvent;
