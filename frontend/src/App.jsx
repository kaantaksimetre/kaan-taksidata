import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import useAuth from './context/useAuth';
import BelgeArama from './pages/BelgeArama';
import BelgeOlustur from './pages/BelgeOlustur';
import Login from './pages/Login';
import TamirAyar from './pages/TamirAyar';
import TarifeAyarlari from './pages/TarifeAyarlari';
import SistemYedekleme from './pages/SistemYedekleme';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div className="app-loading"><span className="spinner dark" /> Oturum kontrol ediliyor...</div>;
  }
  if (!user) return <Login />;

  return (
    <>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} email={user.email} onLogout={logout} />
        <div className="content-area">
          <Routes>
            <Route path="/" element={<Navigate to="/tamir-ayar" replace />} />
            <Route path="/tamir-ayar" element={<TamirAyar />} />
            <Route path="/belge-arama" element={<BelgeArama />} />
            <Route path="/belge-olustur" element={<BelgeOlustur />} />
            <Route path="/tarife-ayarlari" element={<TarifeAyarlari />} />
            <Route path="/sistem-yedekleme" element={<SistemYedekleme />} />
            <Route path="*" element={<Navigate to="/tamir-ayar" replace />} />
          </Routes>
        </div>
      </div>
    </>
  );
}
