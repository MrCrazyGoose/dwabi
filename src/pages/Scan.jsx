import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { decide, getItem } from '../../shared/rules.js';
import { matchPredictions } from '../../shared/vision/classMap.js';
import { analyzeImage } from '../../shared/vision/contamination.js';
import { POINTS } from '../../shared/points.js';
import { classify, loadModel, loadImageFile, toCanvas } from '../lib/vision.js';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import ItemSearch from '../components/ItemSearch.jsx';
import VerdictCard from '../components/VerdictCard.jsx';

const LEVEL_OPTIONS = {
  grease: [
    { level: 'clean', label: 'Clean & dry' },
    { level: 'light', label: 'Some greasy spots' },
    { level: 'heavy', label: 'Soaked / covered in food' },
  ],
  residue: [
    { level: 'clean', label: 'Empty & rinsed' },
    { level: 'light', label: 'Has food or liquid left' },
  ],
};

function useCamera(active) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) return undefined;
    let stream;
    let cancelled = false;
    setError(null);
    setReady(false);
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser does not support camera access.');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) return;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.name === 'NotAllowedError'
              ? 'Camera permission was denied. Allow camera access in your browser settings, or upload a photo instead.'
              : err.message || 'Could not start the camera.',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      setReady(false);
    };
  }, [active]);

  return { videoRef, error, ready };
}

function drawOverlay(canvas, capture, analysis) {
  if (!canvas || !capture) return;
  canvas.width = capture.canvas.width;
  canvas.height = capture.canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(capture.canvas, 0, 0);
  if (!analysis?.cells) return;
  const n = analysis.gridSize;
  const cw = canvas.width / n;
  const ch = canvas.height / n;
  analysis.cells.forEach((cell, i) => {
    const x = (i % n) * cw;
    const y = Math.floor(i / n) * ch;
    if (cell.flagged) {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.38)';
      ctx.fillRect(x, y, cw, ch);
      ctx.strokeStyle = 'rgba(185, 28, 28, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, cw - 2, ch - 2);
    } else if (cell.isMaterial) {
      ctx.strokeStyle = 'rgba(22, 163, 74, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 1, y + 1, cw - 2, ch - 2);
    }
  });
}

export default function Scan() {
  const { user, refresh } = useAuth();
  const [mode, setMode] = useState('camera');
  const [capture, setCapture] = useState(null); // { canvas, source }
  const [modelState, setModelState] = useState('idle');
  const [predictions, setPredictions] = useState([]);
  const [match, setMatch] = useState(null);
  const [itemId, setItemId] = useState(null);
  const [override, setOverride] = useState(null);
  const [liveLabel, setLiveLabel] = useState(null);
  const [logState, setLogState] = useState(null);
  const [busy, setBusy] = useState(false);
  const overlayRef = useRef(null);
  const fileRef = useRef(null);

  const cameraActive = mode === 'camera' && !capture;
  const { videoRef, error: cameraError, ready: cameraReady } = useCamera(cameraActive);

  // Start downloading the model as soon as the page opens.
  useEffect(() => {
    setModelState('loading');
    loadModel()
      .then(() => setModelState('ready'))
      .catch(() => setModelState('error'));
  }, []);

  // Live preview label while the camera is running.
  useEffect(() => {
    if (!cameraActive || !cameraReady || modelState !== 'ready') return undefined;
    let stopped = false;
    const tick = async () => {
      if (stopped || !videoRef.current) return;
      try {
        const preds = await classify(videoRef.current, 3);
        if (stopped) return;
        const m = matchPredictions(preds);
        setLiveLabel(m ? getItem(m.itemId).name : preds[0]?.className.split(',')[0]);
      } catch {
        // ignore transient frame errors
      }
      if (!stopped) timer = setTimeout(tick, 1200);
    };
    let timer = setTimeout(tick, 300);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [cameraActive, cameraReady, modelState, videoRef]);

  const item = itemId ? getItem(itemId) : null;

  const analysis = useMemo(() => {
    if (!capture || !item?.contaminationCheck) return null;
    const c = capture.canvas;
    const imageData = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    return analyzeImage(imageData, item.contaminationCheck);
  }, [capture, item]);

  const level = override || analysis?.level || null;
  const verdict = useMemo(() => (itemId ? decide(itemId, level ? { level } : null) : null), [itemId, level]);

  useEffect(() => {
    drawOverlay(overlayRef.current, capture, override ? null : analysis);
  }, [capture, analysis, override]);

  const runClassification = useCallback(async (canvas, source) => {
    setCapture({ canvas, source });
    setPredictions([]);
    setMatch(null);
    setItemId(null);
    setOverride(null);
    setLogState(null);
    setBusy(true);
    try {
      const preds = await classify(canvas, 5);
      setPredictions(preds);
      const m = matchPredictions(preds);
      setMatch(m);
      if (m) setItemId(m.itemId);
    } catch {
      setModelState('error');
    } finally {
      setBusy(false);
    }
  }, []);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;
    runClassification(toCanvas(video), 'camera');
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const img = await loadImageFile(file);
      runClassification(toCanvas(img), 'upload');
    } catch (err) {
      setLogState({ error: err.message });
    }
  };

  const reset = () => {
    setCapture(null);
    setPredictions([]);
    setMatch(null);
    setItemId(null);
    setOverride(null);
    setLogState(null);
  };

  const chooseItem = (it) => {
    setItemId(it.id);
    setOverride(null);
    setLogState(null);
  };

  const contaminationFound = Boolean(verdict && (verdict.contaminated || verdict.item.alert));
  const potentialPoints = POINTS.SCAN + (contaminationFound ? POINTS.CONTAMINATION_BONUS : 0);

  const logScan = async () => {
    setLogState({ saving: true });
    try {
      const res = await api('/scans', {
        method: 'POST',
        body: { itemId, contaminationFound, level, source: capture?.source || 'search' },
      });
      setLogState({ points: res.points, capped: res.capped });
      refresh();
    } catch (err) {
      setLogState({ error: err.message });
    }
  };

  const needsManualLevel =
    item?.contaminationCheck && (analysis?.level === 'unknown' || item.contaminationCheck === 'residue');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Scan an item</h1>
        <p className="mt-1 text-slate-600">
          Hold the item up to your camera or upload a photo. EcoSort identifies it, checks for contamination, and tells
          you exactly where it goes in Montgomery County.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------- Capture column ---------- */}
        <section className="space-y-4">
          <div className="inline-flex rounded-xl bg-slate-200/70 p-1 text-sm font-semibold" role="tablist">
            {['camera', 'upload'].map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  reset();
                }}
                className={`rounded-lg px-4 py-1.5 transition ${mode === m ? 'bg-white shadow-sm' : 'text-slate-600'}`}
              >
                {m === 'camera' ? '📷 Webcam' : '🖼️ Upload photo'}
              </button>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="relative aspect-[4/3] bg-slate-900">
              {capture ? (
                <canvas ref={overlayRef} className="h-full w-full object-contain" />
              ) : mode === 'camera' ? (
                <>
                  <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
                  {!cameraReady && !cameraError && (
                    <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-300">Starting camera…</p>
                  )}
                  {cameraError && (
                    <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-200">{cameraError}</p>
                  )}
                  {liveLabel && cameraReady && (
                    <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                      Looks like: {liveLabel}
                    </span>
                  )}
                  <div className="pointer-events-none absolute inset-[15%] rounded-2xl border-2 border-dashed border-white/50" />
                </>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-300 hover:text-white"
                >
                  <span className="text-5xl">🖼️</span>
                  <span className="text-sm font-semibold">Choose or take a photo</span>
                </button>
              )}
              {busy && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-semibold text-white">
                  Analyzing…
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 p-3">
              {capture ? (
                <button className="btn-secondary" onClick={reset}>↺ Scan another item</button>
              ) : mode === 'camera' ? (
                <button className="btn-primary" onClick={takePhoto} disabled={!cameraReady || busy}>
                  Capture & analyze
                </button>
              ) : (
                <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={busy}>
                  Choose photo
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
              <span className="ml-auto text-xs text-slate-500">
                {modelState === 'loading' && 'Loading on-device AI model…'}
                {modelState === 'ready' && '✓ On-device AI ready'}
                {modelState === 'error' && 'AI model unavailable — pick the item below; the contamination check still runs'}
              </span>
            </div>
          </div>

          {capture && analysis && !override && analysis.level !== 'unknown' && (
            <div className="card p-4 text-sm">
              <h3 className="font-bold">Contamination check</h3>
              {analysis.kind === 'grease' ? (
                <p className="mt-1 text-slate-600">
                  Checked {analysis.materialCells} cardboard sections:{' '}
                  <strong className={analysis.flaggedCells ? 'text-red-700' : 'text-green-700'}>
                    {analysis.flaggedCells} look greasy or food-stained
                  </strong>
                  . <span className="text-red-700">Red</span> squares = tear off and trash;{' '}
                  <span className="text-green-700">green</span> = clean cardboard.
                </p>
              ) : (
                <p className="mt-1 text-slate-600">
                  {analysis.level === 'light'
                    ? 'We spotted colors that look like food or liquid residue (highlighted).'
                    : 'No obvious residue spotted — still give it a rinse!'}
                </p>
              )}
            </div>
          )}

          {predictions.length > 0 && (
            <details className="card p-4 text-sm">
              <summary className="cursor-pointer font-semibold text-slate-700">What the AI saw</summary>
              <ul className="mt-2 space-y-1">
                {predictions.map((p) => (
                  <li key={p.className} className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-eco-500" style={{ width: `${Math.round(p.probability * 100)}%` }} />
                    </div>
                    <span className="w-48 truncate text-slate-600">{p.className.split(',')[0]}</span>
                    <span className="w-10 text-right tabular-nums text-slate-500">{Math.round(p.probability * 100)}%</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        {/* ---------- Result column ---------- */}
        <section className="space-y-4">
          <div className="card p-4">
            <label className="label">
              {item ? 'Not the right item? Pick the correct one:' : 'Or search for the item:'}
            </label>
            <ItemSearch onSelect={chooseItem} />
            {match && item && match.itemId === item.id && (
              <p className="mt-2 text-xs text-slate-500">
                Detected “{match.label.split(',')[0]}” ({Math.round(match.probability * 100)}% confidence) → {item.name}
              </p>
            )}
            {capture && !busy && !match && !item && (
              <p className="mt-2 text-sm text-amber-700">
                We could not confidently identify that item. Search for it above — the contamination check will still run
                on your photo.
              </p>
            )}
          </div>

          {item?.contaminationCheck && (needsManualLevel || override) && (
            <div className="card p-4">
              <p className="label">
                {item.contaminationCheck === 'grease' ? 'How does it look?' : 'Is it empty, rinsed and clean?'}
              </p>
              <div className="flex flex-wrap gap-2">
                {LEVEL_OPTIONS[item.contaminationCheck].map((o) => (
                  <button
                    key={o.level}
                    onClick={() => setOverride(o.level)}
                    className={level === o.level ? 'btn-primary' : 'btn-secondary'}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {item?.contaminationCheck && !needsManualLevel && !override && analysis && (
            <button className="text-sm font-medium text-eco-700 underline" onClick={() => setOverride(analysis.level)}>
              Detection wrong? Set the condition yourself
            </button>
          )}

          <VerdictCard verdict={verdict} />

          {verdict && (
            <div className="card flex flex-wrap items-center gap-3 p-4">
              {user ? (
                logState?.points !== undefined ? (
                  <p className="font-semibold text-eco-700">
                    🎉 +{logState.points} points!
                    {logState.capped && <span className="ml-1 font-normal text-slate-500">(daily scan limit reached)</span>}
                  </p>
                ) : (
                  <>
                    <button className="btn-primary" onClick={logScan} disabled={logState?.saving}>
                      I sorted it correctly · +{potentialPoints} pts
                    </button>
                    {contaminationFound && (
                      <span className="text-xs text-slate-500">Includes +{POINTS.CONTAMINATION_BONUS} contamination-catch bonus</span>
                    )}
                  </>
                )
              ) : (
                <p className="text-sm text-slate-600">
                  <Link to="/register" className="font-semibold text-eco-700 underline">Join the challenge</Link> to earn
                  points for your school.
                </p>
              )}
              {logState?.error && <p className="w-full text-sm text-red-700">{logState.error}</p>}
            </div>
          )}

          {!verdict && (
            <div className="card p-6 text-center text-sm text-slate-500">
              <p className="text-4xl">♻️</p>
              <p className="mt-2">Your sorting result will appear here.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
