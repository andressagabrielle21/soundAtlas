import "server-only";

const requestIntervalMs = 1000;

let queue = Promise.resolve();
let nextRequestAt = 0;

export function schedule<T>(request: () => Promise<T>) {
  const slot = queue.then(async () => {
    let wait = nextRequestAt - performance.now();
    while (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.ceil(wait)));
      wait = nextRequestAt - performance.now();
    }
    nextRequestAt = performance.now() + requestIntervalMs;
  });

  queue = slot;
  return slot.then(request);
}
