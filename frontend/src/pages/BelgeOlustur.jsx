import { useRef, useState } from 'react';
import useToast from '../components/useToast';
import { apiRequest } from '../utils/api';
import { getComputerDateTime } from '../utils/dateTime';
import { emptyTarifeForm, normalizePlateInput } from '../utils/formData';
import { noAutocompleteProps } from '../utils/noAutocomplete';
import { generateTarifeYuklemeBelgesi } from '../utils/pdfGenerator';
import { createRequestId } from '../utils/requestId';
import { getWorkstationName } from '../utils/workstation';

export default function BelgeOlustur() {
  const { addToast } = useToast();
  const [data, setData] = useState(() => emptyTarifeForm());
  const [activeTarife, setActiveTarife] = useState('');
  const [busy, setBusy] = useState(false);
  const pendingDocument = useRef(null);

  const handleChange = (event) => {
    const { value } = event.target;
    const field = event.target.dataset.field;
    if (!field) return;
    setData((previous) => ({ ...previous, [field]: value }));
  };

  const handlePlateChange = (event) => {
    const plaka = normalizePlateInput(event.target.value);
    setData(emptyTarifeForm(plaka));
    setActiveTarife('');
    pendingDocument.current = null;
  };

  const handleSearch = async () => {
    if (!data.plaka) return addToast('Lütfen plaka giriniz', 'error');
    setBusy(true);
    pendingDocument.current = null;
    try {
      const response = await apiRequest('GET', `/musteri/${encodeURIComponent(data.plaka)}`);
      const m = response.musteri || {};
      const t = response.taksimetre || {};
      const s = response.sonIslem || {};
      const isTarife = s.islem_turu === 'tarife_yukleme';
      setData({
        ...emptyTarifeForm(m.plaka || data.plaka),
        record_version: m.version || 0,
        ad_soyad: m.ad_soyad || '',
        tc_vergi_no: m.tc_vergi_no || '',
        telefon: m.telefon || '',
        eposta: m.eposta || '',
        durak_adi: m.durak_adi || '',
        marka: m.marka || '',
        model: m.model || '',
        sasi_no: m.sasi_no || '',
        lastik_ebadi: m.lastik_ebadi || '',
        taksimetre_marka: t.taksimetre_marka || '',
        taksimetre_model: t.taksimetre_model || '',
        seri_no: t.seri_no || '',
        k_sabiti: t.k_sabiti || '',
        kelebek_muhur_seri_no: t.kelebek_muhur_seri_no || '',
        acilis_ucreti: isTarife ? s.acilis_ucreti : 0,
        zaman_tarifesi: isTarife ? s.zaman_tarifesi : 0,
        mesafe_tarifesi: isTarife ? s.mesafe_tarifesi : 0,
        birim_zaman: isTarife ? (s.birim_zaman || '1DK') : '1DK',
        birim_mesafe: isTarife ? (s.birim_mesafe || '100M') : '100M',
      });
      setActiveTarife('');
      addToast('Kayıt bulundu, bilgiler dolduruldu', 'success');
    } catch (error) {
      if (error.status === 404) {
        setData(emptyTarifeForm(data.plaka));
        setActiveTarife('');
        addToast('Bu plakaya ait kayıt bulunamadı. Yeni kayıt oluşturabilirsiniz.', 'info');
      } else {
        addToast(error.message, 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const bindTarife = async (tip) => {
    setBusy(true);
    try {
      const tarifeler = await apiRequest('GET', '/tarifeler');
      const tarife = tarifeler.find((item) => item.tip === tip);
      if (!tarife) {
        addToast(`${tip} tarifesi henüz ayarlanmamış`, 'info');
        return;
      }
      setData((previous) => ({
        ...previous,
        acilis_ucreti: tarife.acilis_ucreti,
        zaman_tarifesi: tarife.zaman_tarifesi,
        mesafe_tarifesi: tarife.mesafe_tarifesi,
        birim_zaman: tarife.birim_zaman || '1DK',
        birim_mesafe: tarife.birim_mesafe || '100M',
      }));
      pendingDocument.current = null;
      setActiveTarife(tip);
      addToast(`${tip} tarifesi uygulandı`, 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveCustomer = async () => {
    if (!data.plaka) throw new Error('Lütfen plaka giriniz');
    const response = await apiRequest('POST', '/musteri', {
      ...data,
      record_version: Number(data.record_version || 0),
    });
    setData((previous) => ({ ...previous, record_version: response.record_version }));
    return response;
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      await saveCustomer();
      pendingDocument.current = null;
      addToast('Taksi ve taksimetre bilgileri kaydedildi', 'success');
    } catch (error) {
      addToast(error.message, error.status === 409 ? 'info' : 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    setBusy(true);
    try {
      await saveCustomer();
      const workstationName = getWorkstationName();
      const basePayload = {
        plaka: data.plaka,
        islem_turu: 'tarife_yukleme',
        acilis_ucreti: Number(data.acilis_ucreti),
        zaman_tarifesi: Number(data.zaman_tarifesi),
        mesafe_tarifesi: Number(data.mesafe_tarifesi),
        birim_zaman: data.birim_zaman,
        birim_mesafe: data.birim_mesafe,
        workstation_name: workstationName,
      };
      const fingerprint = JSON.stringify(basePayload);
      if (!pendingDocument.current || pendingDocument.current.fingerprint !== fingerprint) {
        pendingDocument.current = {
          fingerprint,
          requestId: createRequestId(),
          computerTime: getComputerDateTime(),
        };
      }
      const pending = pendingDocument.current;
      const response = await apiRequest('POST', '/islem', {
        ...basePayload,
        islem_tarihi: pending.computerTime.local,
        client_timezone: pending.computerTime.timezone,
        request_id: pending.requestId,
      });
      pendingDocument.current = null;
      generateTarifeYuklemeBelgesi(response.snapshot);
      addToast(
        response.duplicate ? `Aynı istek daha önce kaydedilmişti: ${response.belge_no}` : `Belge oluşturuldu: ${response.belge_no}`,
        'success',
      );
    } catch (error) {
      addToast(error.message, error.status === 409 ? 'info' : 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="form-card">
      <div className="plaka-search">
        <span className="material-icons-outlined">directions_car</span>
        <input
          type="text"
          {...noAutocompleteProps('plaka')}
          placeholder="Plaka giriniz"
          value={data.plaka}
          onChange={handlePlateChange}
          onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
          disabled={busy}
        />
        <button className="plaka-search-btn" type="button" onClick={handleSearch} disabled={busy}>
          <span className="material-icons-outlined">search</span> Ara
        </button>
      </div>

      <div className="record-status">
        {data.record_version > 0 ? `Kayıt sürümü: ${data.record_version}` : 'Yeni kayıt'}
      </div>

      <div className="section-title">Müşteri Bilgileri</div>
      <div className="input-row cols-2">
        <div className="input-group"><label>Ad Soyad / Unvan</label><input type="text" {...noAutocompleteProps('ad_soyad')} value={data.ad_soyad} onChange={handleChange} maxLength={150} /></div>
        <div className="input-group"><label>T.C. Kimlik / Vergi No</label><input type="text" {...noAutocompleteProps('tc_vergi_no')} value={data.tc_vergi_no} onChange={handleChange} inputMode="numeric" maxLength={11} /></div>
      </div>
      <div className="input-row cols-3">
        <div className="input-group"><label>Telefon</label><input type="tel" {...noAutocompleteProps('telefon')} value={data.telefon} onChange={handleChange} maxLength={20} /></div>
        <div className="input-group"><label>E-Posta</label><input type="email" {...noAutocompleteProps('eposta')} value={data.eposta} onChange={handleChange} maxLength={150} /></div>
        <div className="input-group"><label>Durak Adı / Semti</label><input type="text" {...noAutocompleteProps('durak_adi')} value={data.durak_adi} onChange={handleChange} maxLength={200} /></div>
      </div>

      <div className="section-title">Taksimetre Bilgileri</div>
      <div className="input-row cols-4">
        <div className="input-group"><label>Taksimetre Marka</label><input type="text" {...noAutocompleteProps('taksimetre_marka')} value={data.taksimetre_marka} onChange={handleChange} maxLength={80} /></div>
        <div className="input-group"><label>Taksimetre Model</label><input type="text" {...noAutocompleteProps('taksimetre_model')} value={data.taksimetre_model} onChange={handleChange} maxLength={80} /></div>
        <div className="input-group"><label>Seri No</label><input type="text" {...noAutocompleteProps('seri_no')} value={data.seri_no} onChange={handleChange} maxLength={80} /></div>
        <div className="input-group"><label>Kelebek Mühür Seri No</label><input type="text" {...noAutocompleteProps('kelebek_muhur_seri_no')} value={data.kelebek_muhur_seri_no} onChange={handleChange} maxLength={80} /></div>
      </div>

      <div className="section-title">Tarife Bilgileri</div>
      <div className="tarife-actions">
        <button className={`btn ${activeTarife === 'İl' ? 'btn-primary' : 'btn-secondary'}`} type="button" onClick={() => bindTarife('İl')} disabled={busy}>
          <span className="material-icons-outlined">location_city</span> İl Tarifesini Kullan
        </button>
        <button className={`btn ${activeTarife === 'İlçe' ? 'btn-primary' : 'btn-secondary'}`} type="button" onClick={() => bindTarife('İlçe')} disabled={busy}>
          <span className="material-icons-outlined">holiday_village</span> İlçe Tarifesini Kullan
        </button>
      </div>

      <div className="input-row cols-2">
        <div className="input-group"><label>Açılış Ücreti</label><input type="number" {...noAutocompleteProps('acilis_ucreti')} value={data.acilis_ucreti} onChange={handleChange} min="0" max="1000000" step="0.01" /><span className="unit">TL</span></div>
        <div className="input-group"><label>Zaman Tarifesi</label><input type="number" {...noAutocompleteProps('zaman_tarifesi')} value={data.zaman_tarifesi} onChange={handleChange} min="0" max="1000000" step="0.01" /><span className="unit">TL/SAAT</span></div>
      </div>
      <div className="input-row cols-3">
        <div className="input-group"><label>Mesafe Tarifesi</label><input type="number" {...noAutocompleteProps('mesafe_tarifesi')} value={data.mesafe_tarifesi} onChange={handleChange} min="0" max="1000000" step="0.01" /><span className="unit">TL/KM</span></div>
        <div className="input-group"><label>Birim Zaman</label><input type="text" {...noAutocompleteProps('birim_zaman')} value={data.birim_zaman} onChange={handleChange} maxLength={30} /></div>
        <div className="input-group"><label>Birim Mesafe</label><input type="text" {...noAutocompleteProps('birim_mesafe')} value={data.birim_mesafe} onChange={handleChange} maxLength={30} /></div>
      </div>

      <div className="btn-row">
        <button className="btn btn-secondary" type="button" onClick={handleSave} disabled={busy}>
          <span className="material-icons-outlined">save</span> Taksi Kaydet
        </button>
        <button className="btn btn-primary" type="button" onClick={handleGenerate} disabled={busy}>
          {busy ? <span className="spinner" /> : <span className="material-icons-outlined">description</span>}
          Tarife Yükleme Belgesi Oluştur
        </button>
      </div>
    </div>
  );
}
