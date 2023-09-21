export const makeTimeoutPromise = timeout => new Promise((accept, reject) => {
    setTimeout(() => {
      reject(new Error('timeout'));
    }, timeout);
});