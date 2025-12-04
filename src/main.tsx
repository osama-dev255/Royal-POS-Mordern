import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Get the root element
const rootElement = document.getElementById("root");

// Create root and render app
if (rootElement) {
  // Set viewport meta tag for better mobile responsiveness
  let viewportMeta = document.querySelector('meta[name="viewport"]');
  if (!viewportMeta) {
    viewportMeta = document.createElement('meta');
    (viewportMeta as HTMLMetaElement).name = 'viewport';
    document.head.appendChild(viewportMeta);
  }
  (viewportMeta as HTMLMetaElement).content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  
  // Add mobile-specific performance optimizations
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Register service worker for offline support
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.log('Service worker registration failed:', error);
      });
    });
  }
  
  // Prevent zoom on input focus for iOS
  const viewport = document.querySelector("meta[name=viewport]");
  if (viewport) {
    viewport.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover");
  }
  
  // Add touch action to prevent double tap zoom
  document.body.style.touchAction = "manipulation";
  
  createRoot(rootElement).render(<App />);
}