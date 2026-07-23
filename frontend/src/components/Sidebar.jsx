import { NavLink } from 'react-router-dom';

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      <div className={`overlay ${isOpen ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/logo.png" alt="Logo" className="logo-img" />
          <div className="logo-text-wrap">
            <span className="logo-brand">KAAN</span>
            <span className="logo-sub">Takograf Taksimetre</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/tamir-ayar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="material-icons-outlined">build</span> Tamir Ayar
          </NavLink>
          <NavLink to="/belge-arama" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="material-icons-outlined">content_paste_search</span> Belge Arama
          </NavLink>
          <NavLink to="/belge-olustur" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="material-icons-outlined">description</span> Tarife Belgesi Oluştur
          </NavLink>
          <NavLink to="/tarife-ayarlari" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="material-icons-outlined">settings</span> İL/İLÇE Tarife
          </NavLink>
          <NavLink to="/sistem-yedekleme" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="material-icons-outlined">admin_panel_settings</span> Sistem ve Yedekleme
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <span className="material-icons-outlined">lock</span> Giriş korumalı • Çoklu bilgisayar uyumlu
        </div>
      </aside>
    </>
  );
}
