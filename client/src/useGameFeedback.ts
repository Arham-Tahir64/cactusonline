import { useEffect, useRef } from 'react';
import { playCue, type AudioPreferences } from './audio';
import { cueForGameEvent, shouldAnimate, type SoundCue } from './feedback';
import { usePreferences } from './preferences';
import { useCactusStore, type GameEvent } from './store';

function animateElement(element: Element | null, keyframes: Keyframe[], duration = 420): void {
  if (!element || typeof element.animate !== 'function') return;
  element.animate(keyframes, { duration, easing: 'cubic-bezier(.2,.8,.2,1)' });
}

function animateCue(cue: SoundCue, event?: GameEvent): void {
  if (cue === 'deal') {
    document.querySelectorAll('.board-slot').forEach((slot, index) => {
      slot.animate(
        [
          { opacity: 0, transform: 'translateY(-42px) rotate(-4deg)' },
          { opacity: 1, transform: 'translateY(0) rotate(0)' },
        ],
        { duration: 430, delay: Math.min(index * 34, 420), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' },
      );
    });
    return;
  }

  if (cue === 'draw') {
    animateElement(document.querySelector('.draw-pile'), [{ transform: 'translateY(0)' }, { transform: 'translateY(-12px) rotate(-2deg)' }, { transform: 'translateY(0)' }], 260);
    return;
  }
  if (cue === 'discard') {
    animateElement(document.querySelector('.discard-pile'), [{ transform: 'scale(.82) rotate(6deg)', opacity: 0.35 }, { transform: 'scale(1) rotate(0)', opacity: 1 }], 300);
    return;
  }
  if (cue === 'turn') {
    animateElement(document.querySelector('.local-seat .player-board'), [{ filter: 'brightness(1)' }, { filter: 'brightness(1.45) drop-shadow(0 0 18px #f5bf43)' }, { filter: 'brightness(1)' }], 700);
    return;
  }
  if (cue === 'cactus') {
    animateElement(document.querySelector('.table-circle'), [{ filter: 'brightness(1)' }, { filter: 'brightness(1.35) saturate(1.3)' }, { filter: 'brightness(1)' }], 850);
    animateElement(document.querySelector('.turn-banner'), [{ transform: 'translateX(-50%) scale(.8)' }, { transform: 'translateX(-50%) scale(1.12)' }, { transform: 'translateX(-50%) scale(1)' }], 650);
    return;
  }

  const slotId = typeof event?.target === 'object' && event.target && 'slotId' in event.target
    ? String((event.target as { slotId: unknown }).slotId)
    : null;
  const target = slotId
    ? document.querySelector(`[data-slot-id="${CSS.escape(slotId)}"]`)
    : document.querySelector('.discard-pile');
  if (cue === 'stack-success') {
    animateElement(target, [{ transform: 'scale(1)' }, { transform: 'scale(1.18)', filter: 'brightness(1.65) drop-shadow(0 0 14px #ffc52f)' }, { transform: 'scale(1)' }], 520);
  } else if (cue === 'stack-failure') {
    animateElement(target, [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], 360);
  } else if (cue === 'reveal') {
    animateElement(target, [{ transform: 'rotateY(90deg)' }, { transform: 'rotateY(0)' }], 360);
  }
}

export function useGameFeedback(): void {
  const events = useCactusStore((state) => state.events);
  const view = useCactusStore((state) => state.view);
  const room = useCactusStore((state) => state.room);
  const muted = usePreferences((state) => state.muted);
  const masterVolume = usePreferences((state) => state.masterVolume);
  const effectsVolume = usePreferences((state) => state.effectsVolume);
  const reducedMotion = usePreferences((state) => state.reducedMotion);
  const processedEvents = useRef(0);
  const previousDrawCount = useRef<number | null>(null);
  const previousDiscardId = useRef<string | null>(null);
  const previousTurn = useRef<string | null>(null);
  const audioPreferences: AudioPreferences = { muted, masterVolume, effectsVolume };

  const feedback = (cue: SoundCue, event?: GameEvent) => {
    playCue(cue, audioPreferences);
    const systemReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (shouldAnimate(cue, reducedMotion, systemReducedMotion)) animateCue(cue, event);
  };

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if ((event.target as Element | null)?.closest('button:not(:disabled)')) playCue('button', audioPreferences);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [muted, masterVolume, effectsVolume]);

  useEffect(() => {
    if (events.length < processedEvents.current) processedEvents.current = 0;
    for (const event of events.slice(processedEvents.current)) {
      const cue = cueForGameEvent(event);
      if (cue) feedback(cue, event);
    }
    processedEvents.current = events.length;
  }, [events, muted, masterVolume, effectsVolume, reducedMotion]);

  useEffect(() => {
    if (!view) return;
    if (previousDrawCount.current !== null && view.drawPileCount < previousDrawCount.current) feedback('draw');
    previousDrawCount.current = view.drawPileCount;

    const discardId = view.discardPile.at(-1)?.id ?? null;
    if (previousDiscardId.current && discardId && discardId !== previousDiscardId.current) feedback('discard');
    previousDiscardId.current = discardId;

    if (previousTurn.current && view.currentPlayerId !== previousTurn.current && view.currentPlayerId === room?.sessionId) {
      feedback('turn');
    }
    previousTurn.current = view.currentPlayerId;
  }, [view, room, muted, masterVolume, effectsVolume, reducedMotion]);
}
