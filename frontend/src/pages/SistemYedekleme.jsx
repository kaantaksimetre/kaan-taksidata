import { useCallback, useEffect, useState } from 'react';
import useToast from '../components/useToast';
import { apiDownload, apiRequest } from '../utils/api';
import { getWorkstationName, setWorkstationName } from '../utils/workstation';
import { noAutocompleteProps } from '../utils/noAutocomplete';

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SistemYedekleme() {
  const { addToast } = useToast();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [station, setStation] = useState(() => getWorkstationName());

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await apiRequest('GET', '/backup/status'));
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    const timer = setTimeout(() => { loadStatus(); }, 0);
    return () => clearTimeout(timer);
  }, [loadStatus]);

  const handleStationSave = () => {
    try {
      const saved = setWorkstationName(station);
      setStation(saved);
      addToast(`Bu bilgisayarın işlem noktası “${saved}” olarak kaydedildi`, 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const result = await apiDownload('/backup/download');
      saveBlob(result.blob, result.filename);
      addToast(`Yedek indirildi${result.sha256 ? ` • SHA-256: ${result.sha256.slice(0, 12)}…` : ''}`, 'success');
      await loadStatus();
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="settings-grid">
      <section className="form-card settings-card">
        <div className="section-title-row">
          <div>
            <h2>Bu Bilgisayarın İşlem Noktası</h2>
            <p>Belge geçmişinde hangi bilgisayardan işlem yapıldığını ayırt etmek için kullanılır.</p>
          </div>
          <span className="material-icons-outlined settings-icon">computer</span>
        </div>
        <div className="input-group">
          <label>Bilgisayar / Masa Adı</label>
          <input
            type="text"
            {...noAutocompleteProps('workstation_name')}
            maxLength={40}
            value={station}
            onChange={(event) => setStation(event.target.value.toLocaleUpperCase('tr-TR'))}
            placeholder="Örn: OFIS-1"
          />
        </div>
        <button className="btn btn-primary" type="button" onClick={handleStationSave}>
          <span className="material-icons-outlined">save</span> İşlem Noktasını Kaydet
        </button>
      </section>

      <section className="form-card settings-card">
        <div className="section-title-row">
          <div>
            <h2>Veritabanı Yedeği</h2>
            <p>Çalışan SQLite veritabanından tutarlı bir yedek oluşturur ve bilgisayarınıza indirir.</p>
          </div>
          <span className="material-icons-outlined settings-icon">cloud_download</span>
        </div>

        {loading ? (
          <div className="inline-loading"><span className="spinner dark" /> Durum okunuyor...</div>
        ) : status ? (
          <div className="status-grid">
            <div><span>Müşteri</span><strong>{status.musteri_sayisi}</strong></div>
            <div><span>Taksimetre</span><strong>{status.taksimetre_sayisi}</strong></div>
            <div><span>İşlem</span><strong>{status.islem_sayisi}</strong></div>
            <div><span>DB boyutu</span><strong>{formatBytes(status.database_bytes)}</strong></div>
          </div>
        ) : null}

        <button className="btn btn-primary" type="button" onClick={handleDownload} disabled={downloading}>
          {downloading ? <span className="spinner" /> : <span className="material-icons-outlined">download</span>}
          Veritabanı Yedeğini İndir
        </button>
        <div className="warning-box">
          <span className="material-icons-outlined">info</span>
          <div>
            <strong>Geri yükleme güvenlik nedeniyle web ekranından yapılmaz.</strong>
            <p>Yerel testte sunucuyu kapatıp ana klasördeki <code>VERITABANI_GERI_YUKLE.bat</code> dosyasını çalıştırın. Render sürümünde geri yükleme geliştirici/sistem sorumlusu tarafından kontrollü yapılacaktır.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
