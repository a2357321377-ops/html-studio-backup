import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import Home from './pages/Home';
import Editor from './pages/Editor';
import Preview from './pages/Preview';
import Settings from './pages/Settings';
import './styles/index.css';

function AppLayout() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar />
      <Outlet />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="/preview" element={<Preview />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
