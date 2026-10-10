import React from 'react';

export default function SearchAttribution({ html }: { html: string }) {
  return <iframe
    title="מקורות וחיפוש Google"
    srcDoc={html}
    sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
    style={{ border: 0, width: '100%', height: 220, background: 'transparent' }}
  />;
}
