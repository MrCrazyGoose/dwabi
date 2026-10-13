import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { decide, getItem } from '../../shared/rules.js';
import { QUICK_PICKS, matchPredictions, suggestItems } from '../../shared/vision/classMap.js';
import { analyzeImage } from '../../shared/vision/contamination.js';
import { POINTS } from '../../shared/points.js';
import { classify, cropToGuide, loadModel, loadImageFile, toCanvas, toJpegDataUrl } from '../lib/vision.js';
import { useConfig } from '../lib/config.js';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import ItemSearch from '../components/ItemSearch.jsx';
import VerdictCard from '../components/VerdictCard.jsx';

const LEVEL_OPTIONS = {
  grease: [
    { level: 'clean', label: 'Clean and dry' },
    { level: 'light', label: 'Some greasy spots' },
    { level: 'heavy', label: 'Soaked or covered in food' },
  ],
  residue: [
    { level: 'clean', label: 'Empty and rinsed' },
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
      ctx.fillStyle = 'rgba(198, 40, 40, 0.42)';
      ctx.fillRect(x, y, cw, ch);
      ctx.strokeStyle = '#C62828';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, cw - 2, ch - 2);
    } else if (cell.isMaterial) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
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
  const [ai, setAi] = useState(null); // result from the server's AI photo check
  const [aiError, setAiError] = useState(null);
  const config = useConfig();
  const useAi = Boolean(config?.photoChecks);
  const overlayRef = useRef(null);
  const fileRef = useRef(null);

  const cameraActive = mode === 'camera' && !capture;
  const { videoRef, error: cameraError, ready: cameraReady } = useCamera(cameraActive);

  // Without the server's AI check, download the on-device model instead.
  useEffect(() => {
    if (!config || useAi) return;
    setModelState('loading');
    loadModel()
      .then(() => setModelState('ready'))
      .catch(() => setModelState('error'));
  }, [config, useAi]);

  // Live preview label while the camera is running.
  useEffect(() => {
    if (!cameraActive || !cameraReady || modelState !== 'ready') return undefined;
    let stopped = false;
    const tick = async () => {
      if (stopped || !videoRef.current) return;
      try {
        const preds = await classify(cropToGuide(videoRef.current, 224), 3);
        if (stopped) return;
        const m = matchPredictions(preds);
        setLiveLabel(m ? getItem(m.itemId).name : null);
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

  // The AI result applies only while its item is the one selected.
  const aiForItem = ai && item && ai.itemId === item.id ? ai : null;
  const aiLevel = aiForItem && ['clean', 'light', 'heavy'].includes(aiForItem.contamination) ? aiForItem.contamination : null;

  const analysis = useMemo(() => {
    if (!capture || !item?.contaminationCheck || ai) return null;
    const c = capture.canvas;
    const imageData = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    return analyzeImage(imageData, item.contaminationCheck);
  }, [capture, item, ai]);

  const level = override || aiLevel || analysis?.level || null;
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
    setAi(null);
    setAiError(null);
    setBusy(true);
    try {
      if (useAi) {
        const out = await api('/vision/item', { method: 'POST', body: { image: toJpegDataUrl(canvas) } });
        setAi(out);
        if (out.itemId && out.confidence !== 'low' && out.photoQuality === 'good') setItemId(out.itemId);
      } else {
        const preds = await classify(canvas, 5);
        setPredictions(preds);
        const m = matchPredictions(preds);
        setMatch(m);
        if (m) setItemId(m.itemId);
      }
    } catch (err) {
      if (useAi) setAiError(err.message);
      else setModelState('error');
    } finally {
      setBusy(false);
    }
  }, [useAi]);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;
    runClassification(cropToGuide(video), 'camera');
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
    setAi(null);
    setAiError(null);
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
    item?.contaminationCheck &&
    !aiLevel &&
    (!capture || analysis?.level === 'unknown' || item.contaminationCheck === 'residue');

  const PHOTO_HINTS = {
    too_dark: 'The photo is too dark. Try again with more light.',
    too_blurry: 'The photo is blurry. Hold still and try again.',
    too_far: 'The item is too small in the photo. Move closer.',
    no_item: 'No item was found in the photo.',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-5xl">Scan an item</h1>
        <p className="mt-2 max-w-2xl text-lg">
          Point your camera at it or upload a photo. You get the bin it goes in under Montgomery County rules, plus a
          check for grease and leftover food.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="flex" role="tablist">
            {[
              ['camera', 'Camera'],
              ['upload', 'Upload a photo'],
            ].map(([m, label]) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  reset();
                }}
                className={`-ml-0.5 border-2 border-ink px-4 py-1.5 font-display text-lg font-bold uppercase first:ml-0 ${
                  mode === m ? 'bg-ink text-white' : 'bg-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="panel">
            <div className="relative aspect-[4/3] bg-ink">
              {capture ? (
                <canvas ref={overlayRef} className="h-full w-full object-contain" />
              ) : mode === 'camera' ? (
                <>
                  <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
                  {!cameraReady && !cameraError && (
                    <p className="absolute inset-0 flex items-center justify-center text-white/70">Starting camera...</p>
                  )}
                  {cameraError && (
                    <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-white">{cameraError}</p>
                  )}
                  <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square h-[70%] -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-white/80" />
                  {cameraReady && (
                    <span className="absolute bottom-0 left-0 bg-ink px-2 py-1 font-display text-sm font-bold uppercase text-white">
                      {liveLabel ? `Looks like: ${liveLabel}` : 'Fill the box with the item'}
                    </span>
                  )}
                </>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex h-full w-full items-center justify-center font-display text-2xl font-bold uppercase text-white/80 hover:text-white"
                >
                  Choose a photo
                </button>
              )}
              {busy && (
                <div className="absolute inset-0 flex items-center justify-center bg-ink/60 font-display text-2xl font-bold uppercase text-white">
                  Checking...
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t-2 border-ink p-3">
              {capture ? (
                <button className="btn-secondary" onClick={reset}>Scan another</button>
              ) : mode === 'camera' ? (
                <button className="btn-primary" onClick={takePhoto} disabled={!cameraReady || busy}>Take photo</button>
              ) : (
                <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={busy}>Choose photo</button>
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
              <span className="ml-auto text-sm text-ash">
                {useAi && 'Photos are checked by AI, not stored'}
                {!useAi && modelState === 'loading' && 'Loading the recognition model...'}
                {!useAi && modelState === 'ready' && 'Recognition ready'}
                {!useAi && modelState === 'error' && 'Recognition unavailable. Pick the item yourself.'}
              </span>
            </div>
          </div>

          {aiForItem && item?.contaminationCheck && !override && (
            <div className="panel p-4">
              <h3 className="text-xl">Contamination check</h3>
              {aiForItem.findings.length === 0 ? (
                <p className="mt-1">
                  {item.contaminationCheck === 'grease' ? 'No grease or food stains spotted.' : 'Nothing left inside that we can see. Rinse it anyway.'}
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {aiForItem.findings.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="mt-2 h-2 w-2 shrink-0 bg-stop" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {capture && analysis && !override && analysis.level !== 'unknown' && (
            <div className="panel p-4">
              <h3 className="text-xl">Contamination check</h3>
              {analysis.kind === 'grease' ? (
                <p className="mt-1">
                  {analysis.flaggedCells === 0
                    ? `No grease spotted across ${analysis.materialCells} sections.`
                    : `${analysis.flaggedCells} of ${analysis.materialCells} sections look greasy or stained. Red squares go in the trash.`}
                </p>
              ) : (
                <p className="mt-1">
                  {analysis.level === 'light'
                    ? 'Some spots look like leftover food or liquid. They are marked in red.'
                    : 'Nothing obvious left inside. Rinse it anyway.'}
                </p>
              )}
            </div>
          )}

          {predictions.length > 0 && (
            <details className="panel p-4">
              <summary className="cursor-pointer font-display font-bold uppercase tracking-wide">Model guesses</summary>
              <ul className="mt-3 space-y-1.5 text-sm">
                {predictions.map((p) => (
                  <li key={p.className} className="flex items-center gap-3">
                    <div className="h-2.5 flex-1 border border-ink bg-white">
                      <div className="h-full bg-ink" style={{ width: `${Math.round(p.probability * 100)}%` }} />
                    </div>
                    <span className="w-40 truncate">{p.className.split(',')[0]}</span>
                    <span className="w-10 text-right tabular-nums">{Math.round(p.probability * 100)}%</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section className="space-y-4">
          <div className="panel p-4">
            <label className="label">{item ? 'Wrong item? Search for it' : 'Or search for it'}</label>
            <ItemSearch onSelect={chooseItem} />
            {match && item && match.itemId === item.id && (
              <p className="mt-2 text-sm text-ash">
                Recognized as "{match.label.split(',')[0]}" ({Math.round(match.probability * 100)}% sure).
              </p>
            )}
            {aiForItem && <p className="mt-2 text-sm text-ash">Recognized as {aiForItem.whatISee}.</p>}
            {ai && PHOTO_HINTS[ai.photoQuality] && !item && <p className="mt-2 font-medium text-stop">{PHOTO_HINTS[ai.photoQuality]}</p>}
            {aiError && <p className="mt-2 font-medium text-stop">{aiError}</p>}
            {capture && !busy && !match && !item && (
              <div className="mt-4">
                <p className="font-display text-lg font-bold uppercase">Not sure. Which one is it?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(ai ? [...new Set([ai.itemId, ...QUICK_PICKS].filter(Boolean))].slice(0, 8) : suggestItems(predictions)).map((id) => (
                    <button key={id} type="button" className="btn-secondary !px-3 !py-1 !text-base" onClick={() => chooseItem(getItem(id))}>
                      {getItem(id).name.replace(/ \(.*\)$/, '')}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-sm text-ash">Not here? Search above. The grease check still runs on your photo.</p>
              </div>
            )}
          </div>

          {item?.contaminationCheck && (needsManualLevel || override) && (
            <div className="panel p-4">
              <p className="label">{item.contaminationCheck === 'grease' ? 'How does it look?' : 'Is it empty and rinsed?'}</p>
              <div className="flex flex-wrap gap-2">
                {LEVEL_OPTIONS[item.contaminationCheck].map((o) => (
                  <button
                    key={o.level}
                    onClick={() => setOverride(o.level)}
                    className={`${level === o.level ? 'btn-primary' : 'btn-secondary'} !px-3 !py-1 !text-base`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {item?.contaminationCheck && !needsManualLevel && !override && analysis && (
            <button className="text-sm font-semibold underline" onClick={() => setOverride(analysis.level)}>
              Check got it wrong? Set the condition yourself
            </button>
          )}

          <VerdictCard verdict={verdict} />

          {verdict && (
            <div className="panel flex flex-wrap items-center gap-3 p-4">
              {user ? (
                logState?.points !== undefined ? (
                  <p className="font-display text-2xl font-bold uppercase">
                    +{logState.points} points
                    {logState.capped && <span className="ml-2 font-sans text-sm normal-case text-ash">Daily scan limit reached.</span>}
                  </p>
                ) : (
                  <>
                    <button className="btn-primary" onClick={logScan} disabled={logState?.saving}>
                      Sorted it. Log +{potentialPoints}
                    </button>
                    {contaminationFound && (
                      <span className="text-sm text-ash">Includes {POINTS.CONTAMINATION_BONUS} for catching a problem item.</span>
                    )}
                  </>
                )
              ) : (
                <p>
                  <Link to="/register" className="font-semibold underline">Sign up</Link> to earn points for this.
                </p>
              )}
              {logState?.error && <p className="w-full text-sm text-stop">{logState.error}</p>}
            </div>
          )}

          {!verdict && (
            <div className="border-2 border-dashed border-ink/40 p-8 text-center text-ash">
              The bin it goes in will show up here.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
