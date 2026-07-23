import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getComputerDateTime } from '../utils/dateTime';
import { getWorkstationName } from '../utils/workstation';

const titles = {
  '/tamir-ayar': 'Tamir Ayar',
  '/belge-arama': 'Belge Arama',
  '/belge-olustur': 'Tarife Yükleme Belgesi',
  '/tarife-ayarlari': 'İL/İLÇE Tarife Ayarları',
  '/sistem-yedekleme': 'Sistem ve Yedekleme',
};

export default function Topbar({ onMenuClick, email, onLogout }) {
  const location = useLocation();
  const [time, setTime] = useState(() => getComputerDateTime().display);
  const [station, setStation] = useState(() => getWorkstationName());

  useEffect(() => {
    const timer = setInterval(() => setTime(getComputerDateTime().display), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateStation = () => setStation(getWorkstationName());
    window.addEventListener('workstation:changed', updateStation);
    return () => window.removeEventListener('workstation:changed', updateStation);
  }, []);

  const title = titles[location.pathname] || 'Kaan Taksimetre';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="menu-toggle" onClick={onMenuClick} type="button" aria-label="Menüyü aç">
          <span className="material-icons-outlined">menu</span>
        </button>
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="topbar-right">
        <span className="workstation-badge" title="Bu bilgisayarın işlem noktası">
          <span className="material-icons-outlined">computer</span>{station}
        </span>
        <div className="topbar-clock">
          <span className="material-icons-outlined">schedule</span>
          <span className="current-time">{time}</span>
        </div>
        <span className="topbar-email" title={email}>{email}</span>
        <button className="logout-button" type="button" onClick={onLogout} title="Çıkış yap">
          <span className="material-icons-outlined">logout</span>
          <span>Çıkış</span>
        </button>
      </div>
    </header>
  );
}
