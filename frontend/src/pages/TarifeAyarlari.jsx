import { useCallback, useEffect, useState } from 'react';
import useToast from '../components/useToast';
import { apiRequest } from '../utils/api';
import { noAutocompleteProps } from '../utils/noAutocomplete';

const emptyTarife = (tip) => ({
  tip,
  acilis_ucreti: 0,
  zaman_tarifesi: 0,
  mesafe_tarifesi: 0,
  birim_zaman: '1DK',
  birim_mesafe: '100M',
  version: 0,
});

export default function TarifeAyarlari() {
  const { addToast } = useToast();
  const [tarifeler, setTarifeler] = useState({ İl: emptyTarife('İl'), İlçe: emptyTarife('İlçe') });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');

  const loadTarifeler = useCallback(async (showMessage = false) => {
    setLoading(true);
    try {
      const response = await apiRequest('GET', '/tarifeler');
      const next = { İl: emptyTarife('İl'), İlçe: emptyTarife('İlçe') };
      response.forEach((tarife) => {
        if (tarife.tip === 'İl' || tarife.tip === 'İlçe') {
          next[tarife.tip] = { ...emptyTarife(tarife.tip), ...tarife };
        }
      });
      setTarifeler(next);
      if (showMessage) addToast('Tarifeler güncellendi', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    const timer = setTimeout(() => { loadTarifeler(); }, 0);
    return () => clearTimeout(timer);
  }, [loadTarifeler]);

  const handleChange = (tip, field, value) => {
    setTarifeler((previous) => ({
      ...previous,
      [tip]: { ...previous[tip], [field]: value },
    }));
  };

  const handleSave = async (tip) => {
    setSaving(tip);
    try {
      const saved = await apiRequest('POST', '/tarifeler', {
        ...tarifeler[tip],
        acilis_ucreti: Number(tarifeler[tip].acilis_ucreti),
        zaman_tarifesi: Number(tarifeler[tip].zaman_tarifesi),
        mesafe_tarifesi: Number(tarifeler[tip].mesafe_tarifesi),
        record_version: Number(tarifeler[tip].version || 0),
      });
      setTarifeler((previous) => ({
        ...previous,
        [tip]: { ...previous[tip], version: saved.version },
      }));
      addToast(`${tip} tarifesi kaydedildi`, 'success');
    } catch (error) {
      if (error.status === 409) {
        addToast('Bu tarife başka bir bilgisayarda değiştirilmiş. Güncel değerler yeniden yüklendi.', 'info');
        await loadTarifeler();
      } else {
        addToast(error.message, 'error');
      }
    } finally {
      setSaving('');
    }
  };

  const renderForm = (tip) => {
    const tarife = tarifeler[tip];
    return (
      <div className="form-card tariff-card">
        <div className="section-title-row">
          <div className="section-title">{tip} Tarifesi</div>
          <span className="version-pill">Kayıt sürümü: {tarife.version || 0}</span>
        </div>
        <div className="input-row cols-2">
          <div className="input-group">
            <label>Açılış Ücreti</label>
            <input type="number" {...noAutocompleteProps(`${tip}_acilis_ucreti`)} min="0" max="1000000" step="0.01" value={tarife.acilis_ucreti} onChange={(event) => handleChange(tip, 'acilis_ucreti', event.target.value)} />
            <span className="unit">TL</span>
          </div>
          <div className="input-group">
            <label>Zaman Tarifesi</label>
            <input type="number" {...noAutocompleteProps(`${tip}_zaman_tarifesi`)} min="0" max="1000000" step="0.01" value={tarife.zaman_tarifesi} onChange={(event) => handleChange(tip, 'zaman_tarifesi', event.target.value)} />
            <span className="unit">TL/SAAT</span>
          </div>
        </div>
        <div className="input-row cols-3">
          <div className="input-group">
            <label>Mesafe Tarifesi</label>
            <input type="number" {...noAutocompleteProps(`${tip}_mesafe_tarifesi`)} min="0" max="1000000" step="0.01" value={tarife.mesafe_tarifesi} onChange={(event) => handleChange(tip, 'mesafe_tarifesi', event.target.value)} />
            <span className="unit">TL/KM</span>
          </div>
          <div className="input-group">
            <label>Birim Zaman</label>
            <input type="text" {...noAutocompleteProps(`${tip}_birim_zaman`)} maxLength={30} value={tarife.birim_zaman || ''} onChange={(event) => handleChange(tip, 'birim_zaman', event.target.value)} />
          </div>
          <div className="input-group">
            <label>Birim Mesafe</label>
            <input type="text" {...noAutocompleteProps(`${tip}_birim_mesafe`)} maxLength={30} value={tarife.birim_mesafe || ''} onChange={(event) => handleChange(tip, 'birim_mesafe', event.target.value)} />
          </div>
        </div>
        <div className="btn-row tariff-save-row">
          <button className="btn btn-primary full-width" type="button" onClick={() => handleSave(tip)} disabled={saving !== ''}>
            {saving === tip ? <span className="spinner" /> : <span className="material-icons-outlined">save</span>}
            {tip} Ayarlarını Kaydet
          </button>
        </div>
      </div>
    );
  };

  if (loading) return <div className="app-loading"><span className="spinner dark" /> Tarifeler yükleniyor...</div>;

  return (
    <>
      <div className="page-actions-row">
        <p>İki bilgisayar aynı tarifeyi açarsa eski verinin sessizce üzerine yazılması engellenir.</p>
        <button className="btn btn-secondary" type="button" onClick={() => loadTarifeler(true)} disabled={saving !== ''}>
          <span className="material-icons-outlined">refresh</span> Güncel Tarifeleri Getir
        </button>
      </div>
      <div className="tariff-grid">{renderForm('İl')}{renderForm('İlçe')}</div>
    </>
  );
}
