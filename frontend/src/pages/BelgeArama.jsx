import { useState } from 'react';
import useToast from '../components/useToast';
import { apiRequest } from '../utils/api';
import { formatStoredDateTime } from '../utils/dateTime';
import { normalizePlateInput } from '../utils/formData';
import { noAutocompleteProps } from '../utils/noAutocomplete';
import { generateTamirAyarBelgesi, generateTarifeYuklemeBelgesi } from '../utils/pdfGenerator';

const emptyFiltre = () => ({
  tamirAyar: true,
  tarifeYukleme: true,
  baslangic: '',
  bitis: '',
  sonIslem: false,
});

export default function BelgeArama() {
  const { addToast } = useToast();
  const [mode, setMode] = useState('plaka');
  const [printBusy, setPrintBusy] = useState(false);

  // Plakaya göre arama
  const [plaka, setPlaka] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Tarih ve tür ile filtrele
  const [filtre, setFiltre] = useState(() => emptyFiltre());
  const [filtreSonuclari, setFiltreSonuclari] = useState([]);
  const [filtreLoading, setFiltreLoading] = useState(false);
  const [filtreYapildi, setFiltreYapildi] = useState(false);
  const [secili, setSecili] = useState(() => new Set());

  const reprintBelge = async (belgeNo) => {
    setPrintBusy(true);
    try {
      const response = await apiRequest('GET', `/islem/belge/${encodeURIComponent(belgeNo)}`);
      const payload = response.snapshot || { ...response.musteri, ...response.taksimetre, ...response.islem };
      if (response.islem.islem_turu === 'tarife_yukleme') {
        generateTarifeYuklemeBelgesi(payload);
      } else {
        generateTamirAyarBelgesi(payload);
      }
      if (response.legacy) {
        addToast('Bu eski kayıt snapshot içermiyor; güncel araç bilgileriyle hazırlandı', 'info');
      } else {
        addToast('Belge yazdırmaya hazırlandı', 'success');
      }
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setPrintBusy(false);
    }
  };

  // ── Plakaya göre arama ──
  const handlePlateChange = (event) => {
    setPlaka(normalizePlateInput(event.target.value));
    setResults([]);
  };

  const handleSearch = async () => {
    if (!plaka) return addToast('Lütfen plaka giriniz', 'error');
    setLoading(true);
    try {
      const data = await apiRequest('GET', `/islem/${encodeURIComponent(plaka)}`);
      setResults(data);
      if (data.length === 0) addToast('Bu plakaya ait işlem bulunamadı', 'info');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Tarih ve tür ile filtrele ──
  const handleFiltreChange = (field, value) => {
    setFiltre((previous) => ({ ...previous, [field]: value }));
  };

  const handleFiltrele = async () => {
    if (!filtre.baslangic || !filtre.bitis) {
      addToast('Lütfen başlangıç ve bitiş tarihi seçin', 'error');
      return;
    }
    if (filtre.bitis < filtre.baslangic) {
      addToast('Bitiş tarihi başlangıçtan önce olamaz', 'error');
      return;
    }
    if (!filtre.tamirAyar && !filtre.tarifeYukleme) {
      addToast('En az bir işlem türü seçin', 'error');
      return;
    }
    const tipler = [];
    if (filtre.tamirAyar) tipler.push('tamir_ayar');
    if (filtre.tarifeYukleme) tipler.push('tarife_yukleme');

    setFiltreLoading(true);
    setFiltreYapildi(true);
    try {
      const params = new URLSearchParams({
        baslangic: filtre.baslangic,
        bitis: filtre.bitis,
        tip: tipler.join(','),
        son_islem: filtre.sonIslem ? 'true' : 'false',
      });
      const data = await apiRequest('GET', `/islem/filtrele?${params.toString()}`);
      setFiltreSonuclari(data);
      setSecili(new Set());
      if (data.length === 0) addToast('Seçilen kriterlere uygun işlem bulunamadı', 'info');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setFiltreLoading(false);
    }
  };

  const toggleSecili = (id) => {
    setSecili((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const tumuSecili = filtreSonuclari.length > 0 && secili.size === filtreSonuclari.length;

  const toggleTumunuSec = () => {
    setSecili(tumuSecili ? new Set() : new Set(filtreSonuclari.map((item) => item.id)));
  };

  const handleExcelAktar = () => {
    addToast('Excel’e aktarma özelliği bir sonraki adımda eklenecek', 'info');
  };

  return (
    <div className="belge-arama-page">
      <div className="tab-row">
        <button
          type="button"
          className={`tab-btn ${mode === 'plaka' ? 'active' : ''}`}
          onClick={() => setMode('plaka')}
        >
          <span className="material-icons-outlined">directions_car</span> Plakaya Göre Ara
        </button>
        <button
          type="button"
          className={`tab-btn ${mode === 'filtre' ? 'active' : ''}`}
          onClick={() => setMode('filtre')}
        >
          <span className="material-icons-outlined">filter_alt</span> Tarih ve Tür ile Filtrele
        </button>
      </div>

      {mode === 'plaka' ? (
        <div className="search-container">
          <div className="search-bar">
            <input
              type="text"
              {...noAutocompleteProps('belge_arama_plaka')}
              placeholder="Plaka giriniz (ör: 07T2859)"
              value={plaka}
              onChange={handlePlateChange}
              onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
              disabled={loading}
            />
            <button type="button" onClick={handleSearch} disabled={loading}>
              {loading ? <span className="spinner" /> : <span className="material-icons-outlined">search</span>}
              Sorgula
            </button>
          </div>

          {!loading && results.length === 0 && (
            <div className="search-placeholder">
              <span className="material-icons-outlined">content_paste_search</span>
              <p>Belge geçmişini görüntülemek için plaka ile arama yapın.</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="result-card">
              <h3>İşlem Geçmişi ({plaka})</h3>
              <div className="table-scroll">
                <table className="result-table">
                  <thead>
                    <tr><th>Tarih / Saat</th><th>İşlem Türü</th><th>İşlem Noktası</th><th>Belge No</th><th>İşlem</th></tr>
                  </thead>
                  <tbody>
                    {results.map((result) => (
                      <tr key={result.id}>
                        <td>{formatStoredDateTime(result.islem_tarihi)}</td>
                        <td>
                          <span className={`badge ${result.islem_turu === 'tarife_yukleme' ? 'badge-tarife' : 'badge-tamir'}`}>
                            {result.islem_turu === 'tarife_yukleme' ? 'Tarife Yükleme' : 'Tamir Ayar'}
                          </span>
                        </td>
                        <td>{result.workstation_name || '-'}</td>
                        <td className="document-number">{result.belge_no}</td>
                        <td>
                          <button className="btn btn-secondary table-button" type="button" onClick={() => reprintBelge(result.belge_no)} disabled={printBusy}>
                            <span className="material-icons-outlined">print</span> Yeniden Yazdır
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="filter-container">
          <div className="form-card filter-card">
            <div className="section-title">İşlem Türü</div>
            <div className="filter-checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filtre.tamirAyar}
                  onChange={(event) => handleFiltreChange('tamirAyar', event.target.checked)}
                />
                Tamir Ayar
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filtre.tarifeYukleme}
                  onChange={(event) => handleFiltreChange('tarifeYukleme', event.target.checked)}
                />
                Tarife Yükleme
              </label>
            </div>

            <div className="section-title">Tarih Aralığı</div>
            <div className="input-row cols-2">
              <div className="input-group">
                <label>Başlangıç Tarihi</label>
                <input
                  type="date"
                  {...noAutocompleteProps('filtre_baslangic')}
                  value={filtre.baslangic}
                  onChange={(event) => handleFiltreChange('baslangic', event.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Bitiş Tarihi</label>
                <input
                  type="date"
                  {...noAutocompleteProps('filtre_bitis')}
                  value={filtre.bitis}
                  onChange={(event) => handleFiltreChange('bitis', event.target.value)}
                />
              </div>
            </div>

            <label className="checkbox-label son-islem-checkbox">
              <input
                type="checkbox"
                checked={filtre.sonIslem}
                onChange={(event) => handleFiltreChange('sonIslem', event.target.checked)}
              />
              Sadece her plakanın bu aralıktaki son işlemini göster
            </label>

            <div className="btn-row filter-btn-row">
              <button className="btn btn-primary" type="button" onClick={handleFiltrele} disabled={filtreLoading}>
                {filtreLoading ? <span className="spinner" /> : <span className="material-icons-outlined">search</span>}
                Filtrele
              </button>
            </div>
          </div>

          {filtreYapildi && !filtreLoading && filtreSonuclari.length === 0 && (
            <div className="search-placeholder">
              <span className="material-icons-outlined">content_paste_search</span>
              <p>Seçilen kriterlere uygun işlem bulunamadı.</p>
            </div>
          )}

          {filtreSonuclari.length > 0 && (
            <div className="result-card">
              <div className="section-title-row">
                <h3>Filtre Sonuçları ({filtreSonuclari.length})</h3>
                <div className="filter-result-actions">
                  <span className="version-pill">{secili.size} seçili</span>
                  <button
                    className="btn btn-secondary table-button"
                    type="button"
                    onClick={handleExcelAktar}
                    disabled={secili.size === 0}
                  >
                    <span className="material-icons-outlined">grid_on</span> Excel&apos;e Aktar
                  </button>
                </div>
              </div>
              <div className="table-scroll">
                <table className="result-table">
                  <thead>
                    <tr>
                      <th>
                        <input type="checkbox" checked={tumuSecili} onChange={toggleTumunuSec} aria-label="Tümünü seç" />
                      </th>
                      <th>Plaka</th>
                      <th>Tarih / Saat</th>
                      <th>İşlem Türü</th>
                      <th>İşlem Noktası</th>
                      <th>Belge No</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtreSonuclari.map((result) => (
                      <tr key={result.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={secili.has(result.id)}
                            onChange={() => toggleSecili(result.id)}
                            aria-label={`${result.plaka} seç`}
                          />
                        </td>
                        <td className="document-number">{result.plaka}</td>
                        <td>{formatStoredDateTime(result.islem_tarihi)}</td>
                        <td>
                          <span className={`badge ${result.islem_turu === 'tarife_yukleme' ? 'badge-tarife' : 'badge-tamir'}`}>
                            {result.islem_turu === 'tarife_yukleme' ? 'Tarife Yükleme' : 'Tamir Ayar'}
                          </span>
                        </td>
                        <td>{result.workstation_name || '-'}</td>
                        <td className="document-number">{result.belge_no}</td>
                        <td>
                          <button className="btn btn-secondary table-button" type="button" onClick={() => reprintBelge(result.belge_no)} disabled={printBusy}>
                            <span className="material-icons-outlined">print</span> Yeniden Yazdır
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
