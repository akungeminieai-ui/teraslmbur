/**
 * Executes a list of tasks with a maximum level of concurrency.
 * If one task fails, it continues processing remaining tasks.
 * Returns a summary of successful and failed task counts.
 */
export async function promisePool<T>(
  items: T[],
  taskFn: (item: T) => Promise<unknown>,
  concurrencyLimit = 3
): Promise<{ success: number; failed: number }> {
  const queue = [...items];
  let success = 0;
  let failed = 0;

  const runNext = async (): Promise<void> => {
    if (queue.length === 0) return;
    const item = queue.shift()!;
    try {
      await taskFn(item);
      success++;
    } catch (error) {
      console.error('Promise pool task failed:', error);
      failed++;
    }
    return runNext();
  };

  const pool = Array.from(
    { length: Math.min(concurrencyLimit, queue.length) },
    () => runNext()
  );

  await Promise.all(pool);
  return { success, failed };
}
