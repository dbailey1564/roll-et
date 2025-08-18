import React, { useEffect, useState } from 'react'
import './styles.css'

// Type shim for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const App: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
      setCanInstall(false);
    }
  };

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  return (
    <div className="app">
      <header className="header">
        <h1>Roll‑et</h1>
        <p>React + Vite PWA template.</p>
        {canInstall && !installed && (
          <button className="install" onClick={handleInstall} aria-label="Install app">
            Install
          </button>
        )}
        {!canInstall && !installed && (isIOS || isSafari) && (
          <div className="hint" role="status">
            Install via Share → Add to Home Screen.
          </div>
        )}
        {installed && <div className="hint" role="status">Installed.</div>}
      </header>

      <main className="content">
        <section className="card">
          <h2>Status</h2>
          <ul>
            <li>PWA: enabled</li>
            <li>Install button: beforeinstallprompt</li>
            <li>GitHub Pages base: /roll-et/</li>
          </ul>
        </section>
      </main>

      <footer className="footer">
        <small>© Roll‑et</small>
      </footer>
    </div>
  );
};

export default App;
