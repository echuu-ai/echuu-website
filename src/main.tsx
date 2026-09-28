import React from 'react';
import ReactDOM from 'react-dom/client';
import EchuuWebsite from './website';
import BlendCursor from './components/BlendCursor';
import CursorSettingsPanel from './components/debug/CursorSettingsPanel';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AppColorGradeProvider } from './components/AppColorGrade';
import { installPageTransitions, revealApplication } from './lib/pageTransition';
import './styles/website-shell.css';
const siteBase = import.meta.env.BASE_URL.replace(/\/$/, '');
if (location.pathname.replace(/\/$/, '') === siteBase) history.replaceState(null, '', `${siteBase}/website` + location.search + location.hash);
installPageTransitions();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><AppErrorBoundary><BlendCursor /><CursorSettingsPanel /><AppColorGradeProvider><EchuuWebsite /></AppColorGradeProvider></AppErrorBoundary></React.StrictMode>
);
revealApplication();
