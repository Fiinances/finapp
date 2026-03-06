'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="main">
      <h1>Electron + Next.js</h1>
      <p>Projeto pronto para desenvolvimento.</p>
      {mounted && typeof window !== 'undefined' && window.electronAPI && (
        <div className="info">
          <p>Plataforma: {window.electronAPI.platform}</p>
          <p>Electron: {window.electronAPI.versions.electron}</p>
        </div>
      )}
    </main>
  );
}
