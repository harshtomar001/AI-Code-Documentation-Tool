import { useContext, useSyncExternalStore } from 'react';
import { EngineContext } from '../engine/EngineContext.js';

/** Returns the engine and re-renders whenever the engine changes. */
export function useEngine() {
  const engine = useContext(EngineContext);

  if (!engine) {
    throw new Error('useEngine must be used inside EngineContext.Provider');
  }

  useSyncExternalStore(
    engine.subscribe,
    engine.getSnapshot,
    engine.getSnapshot
  );

  return engine;
}