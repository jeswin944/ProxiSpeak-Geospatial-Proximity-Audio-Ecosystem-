require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const TelemetryEvent = require('./models/TelemetryEvent');

/**
 * MongoDB Time-Series High-Throughput Ingestion Benchmark
 *
 * Measures:
 * - Throughput: Confirmed successful writes per second
 * - Latency: Batch completion times (P50, P95, P99)
 * - Error rate: Failed writes / rejected batches
 * - Storage footprint: Logical size vs allocated compressed storage in Atlas
 */
async function runIngestionBenchmark(options = {}) {
  const batchSize = Number(options.batchSize || process.env.BENCHMARK_BATCH_SIZE || 500);
  const concurrency = Number(options.concurrency || process.env.BENCHMARK_CONCURRENCY || 10);
  const totalEvents = Number(options.totalEvents || process.env.BENCHMARK_TOTAL_EVENTS || 10000);
  const cleanup = options.cleanup !== undefined ? options.cleanup : true;
  const benchmarkRunId = `bench-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

  console.log('================================================================');
  console.log('   ProxiSpeak Mid-Project Review — MongoDB Ingestion Benchmark  ');
  console.log('================================================================');
  console.log(`Run ID:            ${benchmarkRunId}`);
  console.log(`Target Events:     ${totalEvents.toLocaleString()}`);
  console.log(`Batch Size:        ${batchSize}`);
  console.log(`Concurrency:       ${concurrency} parallel worker streams`);
  console.log(`Cleanup on finish: ${cleanup ? 'YES' : 'NO'}`);

  // Connect to MongoDB
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set in environment.');
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  }

  const db = mongoose.connection.db;
  console.log(`Connected to host: ${mongoose.connection.host}`);
  console.log(`Active database:   ${mongoose.connection.name}`);

  // Ensure collection exists as time-series
  const collections = await db.listCollections({ name: 'telemetry_events' }).toArray();
  if (collections.length === 0) {
    try {
      await db.createCollection('telemetry_events', {
        timeseries: {
          timeField: 'timestamp',
          metaField: 'metadata',
          granularity: 'seconds'
        },
        expireAfterSeconds: 86400
      });
      console.log('✅ Created MongoDB native Time-Series collection: "telemetry_events"');
    } catch (e) {
      // If server doesn't support timeseries option or already exists
      console.warn(`[Notice] Collection setup notice: ${e.message}`);
    }
  }

  // Pre-benchmark storage statistics
  let statsBefore = { count: 0, size: 0, storageSize: 0, totalIndexSize: 0 };
  try {
    const rawStats = await db.command({ collStats: 'telemetry_events' });
    statsBefore = {
      count: rawStats.count || 0,
      size: rawStats.size || 0,
      storageSize: rawStats.storageSize || 0,
      totalIndexSize: rawStats.totalIndexSize || 0
    };
  } catch (_) {
    // Some Atlas M0 clusters restrict collStats; fallback to countDocuments
    statsBefore.count = await TelemetryEvent.countDocuments();
  }

  console.log('\n--- Pre-Benchmark Storage Footprint ---');
  console.log(`Existing documents:  ${statsBefore.count.toLocaleString()}`);
  console.log(`Logical data size:   ${(statsBefore.size / 1024).toFixed(2)} KB`);
  console.log(`Allocated storage:   ${(statsBefore.storageSize / 1024).toFixed(2)} KB`);

  // Prepare workload
  const totalBatches = Math.ceil(totalEvents / batchSize);
  let batchesDispatched = 0;
  let confirmedSuccessfulWrites = 0;
  let failedWrites = 0;
  const latencies = [];

  /**
   * Deterministic event generator
   */
  function generateBatch(size, batchIndex) {
    const batch = [];
    const now = Date.now();
    for (let i = 0; i < size; i++) {
      const globalIndex = batchIndex * size + i;
      batch.push({
        timestamp: new Date(now - (totalEvents - globalIndex) * 10),
        metadata: {
          officeId: `office-${(globalIndex % 5) + 1}`,
          userId: `user-sim-${(globalIndex % 50) + 1}`,
          eventType: 'telemetry',
          benchmarkRunId
        },
        data: {
          x: (100 + (globalIndex * 17) % 700),
          y: (100 + (globalIndex * 13) % 400),
          speed: Number((1.2 + (globalIndex % 4) * 0.4).toFixed(2)),
          signalStrength: -35 - (globalIndex % 45)
        }
      });
    }
    return batch;
  }

  console.log('\n--- Launching Ingestion Benchmark ---');
  const startTime = Date.now();

  // Concurrency worker queue
  async function worker() {
    while (true) {
      if (batchesDispatched >= totalBatches) break;
      const currentBatchIdx = batchesDispatched++;
      const currentBatchSize = Math.min(batchSize, totalEvents - currentBatchIdx * batchSize);
      if (currentBatchSize <= 0) break;

      const batchData = generateBatch(currentBatchSize, currentBatchIdx);
      const batchStart = Date.now();

      try {
        const res = await TelemetryEvent.insertMany(batchData, {
          ordered: false,
          rawResult: true
        });
        const duration = Date.now() - batchStart;
        latencies.push(duration);

        const inserted = res?.insertedCount || batchData.length;
        confirmedSuccessfulWrites += inserted;
      } catch (err) {
        const duration = Date.now() - batchStart;
        latencies.push(duration);
        failedWrites += currentBatchSize;
        console.error(`[Worker Error] Batch ${currentBatchIdx} failed: ${err.message}`);
      }
    }
  }

  // Run workers in parallel
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const totalTimeSec = (Date.now() - startTime) / 1000;
  const writesPerSecond = confirmedSuccessfulWrites / (totalTimeSec || 0.001);

  // Latency percentiles
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  // Post-benchmark storage statistics
  let statsAfter = { count: 0, size: 0, storageSize: 0, totalIndexSize: 0 };
  try {
    const rawStats = await db.command({ collStats: 'telemetry_events' });
    statsAfter = {
      count: rawStats.count || 0,
      size: rawStats.size || 0,
      storageSize: rawStats.storageSize || 0,
      totalIndexSize: rawStats.totalIndexSize || 0
    };
  } catch (_) {
    statsAfter.count = await TelemetryEvent.countDocuments();
  }

  const deltaDocs = statsAfter.count - statsBefore.count;
  const deltaLogicalKB = (statsAfter.size - statsBefore.size) / 1024;
  const deltaStorageKB = (statsAfter.storageSize - statsBefore.storageSize) / 1024;
  const avgBytesPerDoc = confirmedSuccessfulWrites > 0
    ? Math.round((statsAfter.size - statsBefore.size) / confirmedSuccessfulWrites)
    : 0;

  console.log('\n================================================================');
  console.log('                 INGESTION BENCHMARK RESULTS                    ');
  console.log('================================================================');
  console.log(`Total Elapsed Time:       ${totalTimeSec.toFixed(2)} seconds`);
  console.log(`Confirmed Writes:         ${confirmedSuccessfulWrites.toLocaleString()} documents`);
  console.log(`Failed Writes:            ${failedWrites}`);
  console.log(`Throughput:               ${Math.round(writesPerSecond).toLocaleString()} writes/second`);
  console.log(`Batch Latency (P50):      ${p50} ms`);
  console.log(`Batch Latency (P95):      ${p95} ms`);
  console.log(`Batch Latency (P99):      ${p99} ms`);
  console.log(`Logical Size Added:       ${deltaLogicalKB.toFixed(2)} KB`);
  console.log(`Storage Allocated Added:  ${deltaStorageKB.toFixed(2)} KB`);
  console.log(`Average Document Size:    ${avgBytesPerDoc > 0 ? avgBytesPerDoc + ' bytes' : 'N/A'}`);

  // Clean up benchmark documents if requested
  if (cleanup) {
    console.log('\n--- Cleaning Up Benchmark Test Records ---');
    const deleteResult = await TelemetryEvent.deleteMany({
      'metadata.benchmarkRunId': benchmarkRunId
    });
    console.log(`✅ Deleted ${deleteResult.deletedCount} benchmark documents with runId "${benchmarkRunId}".`);
  }

  const summary = {
    benchmarkRunId,
    deploymentHost: mongoose.connection.host,
    totalEvents,
    batchSize,
    concurrency,
    confirmedSuccessfulWrites,
    failedWrites,
    elapsedSeconds: totalTimeSec,
    writesPerSecond: Math.round(writesPerSecond),
    latencyMs: { p50, p95, p99 },
    storageDelta: {
      logicalKB: Number(deltaLogicalKB.toFixed(2)),
      storageKB: Number(deltaStorageKB.toFixed(2)),
      avgBytesPerDoc
    },
    targetMet: writesPerSecond >= 5000
  };

  return summary;
}

if (require.main === module) {
  runIngestionBenchmark()
    .then((summary) => {
      console.log('\nExecution Summary:');
      console.log(JSON.stringify(summary, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Benchmark Failed:', err);
      process.exit(1);
    });
}

module.exports = runIngestionBenchmark;
