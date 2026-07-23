import { useRef, useState } from 'react';
import useToast from '../components/useToast';
import { apiRequest } from '../utils/api';
import { getComputerDateTime } from '../utils/dateTime';
import { emptyTamirForm, normalizePlateInput } from '../utils/formData';
import { noAutocompleteProps } from '../utils/noAutocomplete';
import { generateTamirAyarBelgesi } from '../utils/pdfGenerator';
import { createRequestId } from '../utils/requestId';
import { getWorkstationName } from '../utils/workstation';

export default function TamirAyar() {
  const { addToast } = useToast();
  const [data, setData] = useState(() => emptyTamirForm());
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
    setData(emptyTamirForm(plaka));
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
      setData({
        ...emptyTamirForm(m.plaka || data.plaka),
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
      });
      addToast('Kayıt bulundu, bilgiler dolduruldu', 'success');
    } catch (error) {
      if (error.status === 404) {
        setData(emptyTamirForm(data.plaka));
        addToast('Bu plakaya ait kayıt bulunamadı. Yeni kayıt oluşturabilirsiniz.', 'info');
      } else {
        addToast(error.message, 'error');
      }
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
      addToast('Müşteri, araç ve taksimetre bilgileri kaydedildi', 'success');
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
      const documentFingerprint = JSON.stringify({
        plaka: data.plaka,
        islem_turu: 'tamir_ayar',
        yapilan_islem: 'TAMIR-AYAR',
        workstation_name: workstationName,
      });
      if (!pendingDocument.current || pendingDocument.current.fingerprint !== documentFingerprint) {
        pendingDocument.current = {
          fingerprint: documentFingerprint,
          requestId: createRequestId(),
          computerTime: getComputerDateTime(),
        };
      }
      const pending = pendingDocument.current;
      const response = await apiRequest('POST', '/islem', {
        plaka: data.plaka,
        islem_turu: 'tamir_ayar',
        yapilan_islem: 'TAMIR-AYAR',
        islem_tarihi: pending.computerTime.local,
        client_timezone: pending.computerTime.timezone,
        workstation_name: workstationName,
        request_id: pending.requestId,
      });
      pendingDocument.current = null;
      generateTamirAyarBelgesi(response.snapshot);
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
          placeholder="Plaka giriniz (ör: 07T2859)"
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

      <div className="section-title">Araç Bilgileri</div>
      <div className="input-row cols-4">
        <div className="input-group"><label>Araç Marka</label><input type="text" {...noAutocompleteProps('marka')} value={data.marka} onChange={handleChange} maxLength={80} /></div>
        <div className="input-group"><label>Araç Model</label><input type="text" {...noAutocompleteProps('model')} value={data.model} onChange={handleChange} maxLength={80} /></div>
        <div className="input-group"><label>Şasi No</label><input type="text" {...noAutocompleteProps('sasi_no')} value={data.sasi_no} onChange={handleChange} maxLength={50} /></div>
        <div className="input-group"><label>Lastik Ebadı</label><input type="text" {...noAutocompleteProps('lastik_ebadi')} value={data.lastik_ebadi} onChange={handleChange} maxLength={40} /></div>
      </div>

      <div className="section-title">Taksimetre Bilgileri</div>
      <div className="input-row cols-4">
        <div className="input-group"><label>Taksimetre Marka</label><input type="text" {...noAutocompleteProps('taksimetre_marka')} value={data.taksimetre_marka} onChange={handleChange} maxLength={80} /></div>
        <div className="input-group"><label>Taksimetre Model</label><input type="text" {...noAutocompleteProps('taksimetre_model')} value={data.taksimetre_model} onChange={handleChange} maxLength={80} /></div>
        <div className="input-group"><label>Seri No</label><input type="text" {...noAutocompleteProps('seri_no')} value={data.seri_no} onChange={handleChange} maxLength={80} /></div>
        <div className="input-group"><label>K Sabiti</label><input type="text" {...noAutocompleteProps('k_sabiti')} value={data.k_sabiti} onChange={handleChange} maxLength={40} /></div>
      </div>
      <div className="input-row">
        <div className="input-group"><label>Kelebek Mühür Seri No</label><input type="text" {...noAutocompleteProps('kelebek_muhur_seri_no')} value={data.kelebek_muhur_seri_no} onChange={handleChange} maxLength={80} /></div>
      </div>

      <div className="btn-row">
        <button className="btn btn-secondary" type="button" onClick={handleSave} disabled={busy}>
          <span className="material-icons-outlined">save</span> Kaydet
        </button>
        <button className="btn btn-primary" type="button" onClick={handleGenerate} disabled={busy}>
          {busy ? <span className="spinner" /> : <span className="material-icons-outlined">description</span>}
          Tamir Ayar Belgesi Oluştur
        </button>
      </div>
    </div>
  );
}
