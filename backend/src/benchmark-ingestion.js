const runIngestionBenchmark = require('../../database/src/benchmark-ingestion');

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
