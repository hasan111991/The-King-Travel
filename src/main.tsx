import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root');
(window as unknown as { __ktBooted?: boolean }).__ktBooted = true;

if (rootElement) {
  try {
    createRoot(rootElement).render(<App />);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    rootElement.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:sans-serif;background:#F9F9FA;color:#0F2942;">
        <div style="max-width:480px;background:#fff;border:1px solid #D9E2EC;border-radius:16px;padding:24px;">
          <h1 style="margin:0 0 8px;font-size:20px;">Unable to start The King Travel</h1>
          <p style="margin:0;font-size:13px;color:#486581;">${message}</p>
        </div>
      </div>
    `;
  }
}
