import { dispatchPendingSignals } from './workers/outboundRouter';

async function main() {
  console.log('Manually invoking outbound router dispatch...');
  await dispatchPendingSignals();
  console.log('Outbound router run finished.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Outbound router manual run failed:', err);
  process.exit(1);
});
