import { useContext, useSyncExternalStore } from 'react';
import { EngineContext } from '../engine/EngineContext.js';

/** Returns the engine and re-renders the component whenever the engine changes. */
export function useEngine() {
  const engine = useContext(EngineContext);
  useSyncExternalStore(engine.subscribe, engine.getVersion);
  return engine;
}
