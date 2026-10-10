import React from 'react';
import { Linking } from 'react-native';
import { WebView } from 'react-native-webview';

export default function SearchAttribution({ html }: { html: string }) {
  return <WebView
    source={{ html }}
    style={{ height: 220, backgroundColor: 'transparent' }}
    originWhitelist={['about:*']}
    javaScriptEnabled={false}
    domStorageEnabled={false}
    scrollEnabled
    onShouldStartLoadWithRequest={request => {
      if (request.url === 'about:blank') return true;
      if (request.url.startsWith('https://')) Linking.openURL(request.url).catch(() => {});
      return false;
    }}
  />;
}
