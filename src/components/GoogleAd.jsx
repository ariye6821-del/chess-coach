import { useEffect, useRef } from 'react';

const CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID;

let scriptLoadPromise = null;

// Loads the AdSense loader script once, on demand, only when a client ID is
// actually configured - avoids a wasted/erroring request while AdSense setup
// is still pending (see .env.example).
function ensureAdsenseScript() {
  if (!CLIENT_ID) return Promise.reject(new Error('No VITE_ADSENSE_CLIENT_ID configured'));
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

/**
 * Renders a Google AdSense ad unit. Does nothing until both a publisher client ID
 * (VITE_ADSENSE_CLIENT_ID) and a slot are configured, so the app stays clean while
 * AdSense approval/setup is pending - see .env.example for setup instructions.
 */
export function GoogleAd({ slot, className = '', style, format = 'auto', responsive = true }) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!CLIENT_ID || !slot || pushedRef.current) return;
    pushedRef.current = true;
    ensureAdsenseScript()
      .then(() => {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      })
      .catch((err) => console.error('AdSense script failed to load:', err));
  }, [slot]);

  if (!CLIENT_ID || !slot) return null;

  return (
    <ins
      className={`adsbygoogle block ${className}`}
      style={style ?? { display: 'block' }}
      data-ad-client={CLIENT_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  );
}
