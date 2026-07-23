import { useState } from 'react';
import useToast from '../components/useToast';
import { apiRequest } from '../utils/api';
import { formatStoredDateTime } from '../utils/dateTime';
import { normalizePlateInput } from '../utils/formData';
import { noAutocompleteProps } from '../utils/noAutocomplete';
import { generateTamirAyarBelgesi, generateTarifeYuklemeBelgesi } from '../utils/pdfGenerator';

export default function BelgeArama() {
  const { addToast } = useToast();
  const [plaka, setPlaka] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const reprintBelge = async (belgeNo) => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
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
                      <button className="btn btn-secondary table-button" type="button" onClick={() => reprintBelge(result.belge_no)} disabled={loading}>
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
  );
}
