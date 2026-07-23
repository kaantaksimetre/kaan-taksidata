const commonFields = (plaka = '') => ({
  plaka,
  record_version: 0,
  ad_soyad: '',
  tc_vergi_no: '',
  telefon: '',
  eposta: '',
  durak_adi: '',
  marka: '',
  model: '',
  sasi_no: '',
  lastik_ebadi: '',
  taksimetre_marka: '',
  taksimetre_model: '',
  seri_no: '',
  k_sabiti: '',
  kelebek_muhur_seri_no: '',
});

export const emptyTamirForm = (plaka = '') => commonFields(plaka);

export const emptyTarifeForm = (plaka = '') => ({
  ...commonFields(plaka),
  acilis_ucreti: 0,
  zaman_tarifesi: 0,
  mesafe_tarifesi: 0,
  birim_zaman: '1DK',
  birim_mesafe: '100M',
});

export const normalizePlateInput = (value) => value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 9);
