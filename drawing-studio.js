(() => {
  let worker = null;
  let seq = 0;
  const pending = new Map();

  function ensureWorker() {
    if (worker) return worker;
    worker = new Worker('workers/dxf-worker.js');
    worker.onmessage = (e) => {
      const { id, ok, result, error, progress } = e.data || {};
      if (progress && pending.has(id)) {
        const p = pending.get(id);
        p.onProgress?.(progress);
        return;
      }
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (ok) p.resolve(result);
      else p.reject(new Error(error || 'DXF 분석에 실패했습니다.'));
    };
    worker.onerror = (e) => {
      for (const [,p] of pending) p.reject(new Error(e.message || 'DXF Worker 오류'));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
    return worker;
  }

  function parseAndAnalyze(text, onProgress) {
    return new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject, onProgress });
      ensureWorker().postMessage({ id, type: 'parseAndAnalyze', text });
    });
  }

  function dispose() {
    if (worker) worker.terminate();
    worker = null;
    for (const [,p] of pending) p.reject(new Error('도면 작업을 종료했습니다.'));
    pending.clear();
  }

  window.FMStudioTools = { parseAndAnalyze, dispose };
})();
