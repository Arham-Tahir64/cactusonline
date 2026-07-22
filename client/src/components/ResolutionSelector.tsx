import { useEffect, useMemo, useState } from 'react';
import { RESOLUTION_PRESETS, type ResolutionPresetId, type ResolutionSelection } from '../preferenceModel';
import { usePreferences } from '../preferences';

interface Props {
  firstLaunch?: boolean;
  onDone?: () => void;
}

function detectedResolution(): ResolutionSelection {
  const width = Math.round(window.screen.width * (window.devicePixelRatio || 1));
  const height = Math.round(window.screen.height * (window.devicePixelRatio || 1));
  return { preset: 'custom', width: Math.max(1100, width), height: Math.max(700, height) };
}

export default function ResolutionSelector({ firstLaunch = false, onDone }: Props) {
  const saved = usePreferences((state) => state.resolution);
  const setResolution = usePreferences((state) => state.setResolution);
  const detected = useMemo(detectedResolution, []);
  const detectedPreset = RESOLUTION_PRESETS.find((option) => option.width === detected.width && option.height === detected.height);
  const initial: ResolutionSelection = saved ?? (detectedPreset
    ? { preset: detectedPreset.id, width: detectedPreset.width, height: detectedPreset.height }
    : detected);
  const [preset, setPreset] = useState<ResolutionPresetId>(initial.preset);
  const [width, setWidth] = useState(initial.width);
  const [height, setHeight] = useState(initial.height);

  useEffect(() => {
    if (!saved) return;
    setPreset(saved.preset);
    setWidth(saved.width);
    setHeight(saved.height);
  }, [saved]);

  const choosePreset = (id: ResolutionPresetId, nextWidth: number, nextHeight: number) => {
    setPreset(id);
    setWidth(nextWidth);
    setHeight(nextHeight);
  };

  const valid = width >= 1100 && width <= 7680 && height >= 700 && height <= 4320;
  const apply = () => {
    if (!valid) return;
    setResolution({ preset, width: Math.round(width), height: Math.round(height) });
    onDone?.();
  };

  return (
    <section className={`resolution-selector${firstLaunch ? ' first-launch-resolution' : ''}`} aria-labelledby="resolution-title">
      <div className="resolution-heading">
        <div>
          <div className="panel-kicker">Display calibration</div>
          <h2 id="resolution-title">Choose your screen</h2>
        </div>
        <p>We’ll tune the table, cards, perspective, and controls for this canvas. You can change it later.</p>
      </div>
      <button className="detected-resolution" type="button" onClick={() => choosePreset('custom', detected.width, detected.height)}>
        <span>Detected display</span><strong>{detected.width} × {detected.height}</strong>
      </button>
      <div className="resolution-grid" role="radiogroup" aria-label="Resolution presets">
        {RESOLUTION_PRESETS.map((option) => {
          const selected = preset === option.id && width === option.width && height === option.height;
          return (
            <button key={option.id} type="button" role="radio" aria-checked={selected} className={selected ? 'selected' : ''} onClick={() => choosePreset(option.id, option.width, option.height)}>
              <span>{option.label}</span><strong>{option.width} × {option.height}</strong><small>{option.description}</small>
            </button>
          );
        })}
        <button type="button" role="radio" aria-checked={preset === 'custom'} className={preset === 'custom' ? 'selected' : ''} onClick={() => setPreset('custom')}>
          <span>Custom</span><strong>Your dimensions</strong><small>1100×700 to 7680×4320</small>
        </button>
      </div>
      {preset === 'custom' && (
        <div className="custom-resolution">
          <label>Width<input aria-label="Custom resolution width" type="number" min="1100" max="7680" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label>
          <span aria-hidden="true">×</span>
          <label>Height<input aria-label="Custom resolution height" type="number" min="700" max="4320" value={height} onChange={(event) => setHeight(Number(event.target.value))} /></label>
        </div>
      )}
      {!valid && <p className="resolution-error">Enter a size from 1100×700 through 7680×4320.</p>}
      <button className="primary-action resolution-apply" type="button" disabled={!valid} onClick={apply}>
        {firstLaunch ? 'Set up my table' : 'Apply display profile'}
      </button>
    </section>
  );
}
