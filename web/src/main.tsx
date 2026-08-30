/**
 * The entry point: finds the empty <div id="root"> in index.html and tells
 * React to draw the App inside it.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { I18nProvider } from './i18n'
import './styles.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Could not find the #root element in index.html')
}

ReactDOM.createRoot(rootElement).render(
  // StrictMode is a development-only helper that warns about unsafe patterns.
  // It has no effect on the built app.
  <React.StrictMode>
    {/* Makes the current language available to every component below. */}
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
)
