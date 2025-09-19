import '../styles.css';   // <-- correct path since styles.css is in root

import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
