import { createContext, useContext, useState, type ReactNode } from 'react';

const LayerContext = createContext<HTMLElement | null>(null);

export function Layer({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  return (
    <LayerContext.Provider value={node}>
      {children}
      <div ref={setNode} className="pointer-events-none absolute inset-0 z-40" />
    </LayerContext.Provider>
  );
}

export function useLayer(): HTMLElement | null {
  return useContext(LayerContext);
}
