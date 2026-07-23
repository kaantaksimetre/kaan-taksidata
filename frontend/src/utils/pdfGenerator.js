import { formatStoredDateTime } from './dateTime';

const UNVAN = 'KAAN ELEKTRONİK - KAAN MERTOĞLU';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safe(value) {
  return escapeHtml(value);
}

function money(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? numeric.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0,00';
}

function openPrintFrame(html) {
  const frame = document.createElement('iframe');
  frame.setAttribute('title', 'Yazdırılabilir belge');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '1px';
  frame.style.height = '1px';
  frame.style.border = '0';
  frame.style.opacity = '0';
  frame.addEventListener('load', () => {
    const cleanup = () => frame.remove();
    frame.contentWindow?.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    }, 250);
  }, { once: true });

  frame.srcdoc = html;
  document.body.appendChild(frame);
  setTimeout(() => frame.remove(), 300_000);
}

function belgeCSS() {
  return `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #222; padding: 30px; }
      .belge { max-width: 780px; margin: 0 auto; border: 2px solid #222; padding: 32px 36px; }
      h1 { text-align: center; font-size: 20px; font-weight: 700; margin-bottom: 6px; letter-spacing: 1px; }
      .subtitle { text-align: center; font-size: 12px; color: #555; margin-bottom: 16px; }
      .meta { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; font-size: 12px; }
      .meta strong { font-weight: 700; }
      .aciklama { font-size: 13px; line-height: 1.6; margin-bottom: 24px; }
      .section-title { text-align: center; font-size: 17px; font-weight: 700; margin: 24px 0 10px; letter-spacing: 1px; }
      .info-block { margin-bottom: 24px; }
      .info-block h3 { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
      .info-row { display: flex; gap: 8px; margin-bottom: 6px; font-size: 13px; }
      .info-label { min-width: 160px; font-weight: 400; }
      .info-value { font-weight: 600; overflow-wrap: anywhere; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 6px; table-layout: fixed; }
      table, th, td { border: 1px solid #222; }
      th { padding: 8px 6px; font-size: 11px; font-weight: 700; text-align: center; text-transform: uppercase; background: #f8f8f8; }
      td { padding: 8px 6px; font-size: 12px; text-align: center; overflow-wrap: anywhere; }
      .box-section { border: 2px solid #222; padding: 16px; margin-top: 6px; }
      .two-col { display: flex; gap: 0; margin-top: 20px; }
      .two-col > div { flex: 1; border: 1px solid #222; padding: 14px; font-size: 12px; line-height: 1.8; }
      .disclaimer { font-size: 11px; line-height: 1.6; margin-top: 20px; color: #444; }
      .not-section { margin-top: 20px; font-size: 11px; line-height: 1.6; border-top: 1px solid #999; padding-top: 12px; }
      @media print {
        /*
          Chrome/Edge'in sayfanın en üstüne yazdırma anını, en altına URL ve
          sayfa numarasını eklemesi için kullandığı kenar boşluğunu kaldırır.
          Belgenin kendi kayıt tarihi sağ üstte kalır.
        */
        @page { margin: 0; size: A4 portrait; }
        html, body { width: 210mm; min-height: 297mm; }
        body { padding: 10mm; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .belge { border: 2px solid #000; padding: 15px 25px; max-width: 100%; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .subtitle, .meta { margin-bottom: 12px; }
        .aciklama { margin-bottom: 14px; }
        .section-title { margin: 16px 0 8px; font-size: 15px; }
        .info-block { margin-bottom: 14px; }
        .box-section { padding: 10px; margin-top: 4px; }
        .two-col { margin-top: 14px; }
        .two-col > div { padding: 10px; }
        .not-section { margin-top: 14px; padding-top: 10px; }
      }
    </style>
  `;
}

function documentMeta(d) {
  return `<div class="meta">
    <span><strong>Belge No:</strong> ${safe(d.belge_no)}</span>
    <span><strong>Tarih / Saat:</strong> ${safe(formatStoredDateTime(d.islem_tarihi))}</span>
  </div>`;
}

export function generateTarifeYuklemeBelgesi(d) {
  const html = `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><title>Tarife Yükleme İşlem Belgesi</title>${belgeCSS()}</head>
<body>
<div class="belge">
  <h1>TAKSİMETRE TARİFE YÜKLEME İŞLEM BELGESİ</h1>
  <p class="subtitle">(Tamir ve ayar servislerince düzenlenir)</p>
  ${documentMeta(d)}

  <p class="aciklama">Servisimiz tarafından tarife yükleme işlemi yapılan taksimetreye ait bilgiler aşağıda yer almaktadır.</p>

  <div class="info-block">
    <h3>Kullanıcının (Taksi sahibinin)</h3>
    <div class="info-row"><span class="info-label">Adı Soyadı:</span><span class="info-value">${safe(d.ad_soyad)}</span></div>
    <div class="info-row"><span class="info-label">T.C. / Vergi No:</span><span class="info-value">${safe(d.tc_vergi_no)}</span></div>
    <div class="info-row"><span class="info-label">Telefon Numarası:</span><span class="info-value">${safe(d.telefon)}</span></div>
    <div class="info-row"><span class="info-label">Durak Adı / Semti:</span><span class="info-value">${safe(d.durak_adi)}</span></div>
    <div class="info-row"><span class="info-label">Plaka:</span><span class="info-value">${safe(d.plaka)}</span></div>
  </div>

  <div class="box-section">
    <div class="section-title">TAKSİMETRE BİLGİLERİ</div>
    <table>
      <tr><th>Marka</th><th>Model</th><th>Seri No</th><th>Kelebek Mühür Seri No</th></tr>
      <tr><td>${safe(d.taksimetre_marka)}</td><td>${safe(d.taksimetre_model)}</td><td>${safe(d.seri_no)}</td><td>${safe(d.kelebek_muhur_seri_no)}</td></tr>
    </table>
  </div>

  <div class="box-section">
    <div class="section-title">TARİFE BİLGİLERİ</div>
    <table>
      <tr><th>Açılış Ücreti</th><th>Zaman Tarifesi</th><th>Mesafe Tarifesi</th><th>Birim Zaman</th><th>Birim Mesafe</th></tr>
      <tr>
        <td>${money(d.acilis_ucreti)} TL</td>
        <td>${money(d.zaman_tarifesi)} TL/SAAT</td>
        <td>${money(d.mesafe_tarifesi)} TL/KM</td>
        <td>${safe(d.birim_zaman || '1DK')}</td>
        <td>${safe(d.birim_mesafe || '100M')}</td>
      </tr>
    </table>
  </div>

  <p class="disclaimer">Firmamız tarafından yukarıda bilgileri yer alan taksimetreye sadece; ilgili kurum/kuruluş tarafından açıklanan açılış ücreti, zaman tarifesi, mesafe tarifesi, birim zaman ve birim mesafe değerleri yüklenmiştir. Başka herhangi bir işlem yapılmamıştır.</p>

  <div class="two-col">
    <div>
      <strong>Yetkili Tamir ve Ayar Servisinin</strong><br>
      Unvanı: ${safe(UNVAN)}<br>
      İşyeri Uygunluk Belge No:<br>
      Kaşe ve İmza:
    </div>
    <div>
      <strong>İşlem Yapan Kişinin</strong><br>
      Ad Soyad: Kaan MERTOĞLU<br>
      Yetkili Belgesi Numarası: YB 07/179
    </div>
  </div>

  <div class="not-section">
    <strong>Not:</strong><br>
    1 - Tamir ve ayar servisi 3/9/2013 tarihli ve 28754 sayılı Resmi Gazete'de yayımlanan Taksimetre Muayene Yönetmeliği'nin 7/A maddesi gereğince yaptığı uzaktan tarife yükleme işlemi sonucunda bu formu elektronik ortamda hazırlayıp taksimetre kullanıcılarına elektronik ortamda göndermektedir.<br>
    2 - Taksimetre kullanıcısı bu formu, taksimetre muayenesini yaptıracağı taksimetre muayene servisine ve talep edildiğinde ilgililere göstermekle yükümlüdür.
  </div>
</div>
</body></html>`;
  openPrintFrame(html);
}

export function generateTamirAyarBelgesi(d) {
  const isTamirAyar = (d.yapilan_islem || 'TAMIR-AYAR') === 'TAMIR-AYAR';
  const html = `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><title>Tamir - Ayar İşlem Belgesi</title>${belgeCSS()}</head>
<body>
<div class="belge">
  <h1>TAKSİMETRE TAMİR - AYAR İŞLEM BELGESİ</h1>
  ${documentMeta(d)}

  <p class="aciklama">Servisimiz tarafından tamir ve/veya ayar işlemi yapılan taksimetreye ait bilgiler aşağıda yer almaktadır.</p>

  <div class="info-block">
    <h3>Kullanıcının (Taksi sahibinin)</h3>
    <div class="info-row"><span class="info-label">Adı Soyadı:</span><span class="info-value">${safe(d.ad_soyad)}</span></div>
    <div class="info-row"><span class="info-label">T.C. / Vergi No:</span><span class="info-value">${safe(d.tc_vergi_no)}</span></div>
    <div class="info-row"><span class="info-label">Telefon Numarası:</span><span class="info-value">${safe(d.telefon)}</span></div>
    <div class="info-row"><span class="info-label">Durak Adı / Semti:</span><span class="info-value">${safe(d.durak_adi)}</span></div>
    <div class="info-row"><span class="info-label">Plaka:</span><span class="info-value">${safe(d.plaka)}</span></div>
  </div>

  <div class="box-section">
    <div class="section-title">TAKSİ BİLGİLERİ</div>
    <table>
      <tr><th>Marka</th><th>Model</th><th>Plaka</th><th>Şasi No</th><th>Lastik Ebadı</th></tr>
      <tr><td>${safe(d.marka)}</td><td>${safe(d.model)}</td><td>${safe(d.plaka)}</td><td>${safe(d.sasi_no)}</td><td>${safe(d.lastik_ebadi)}</td></tr>
    </table>
  </div>

  <div class="box-section">
    <div class="section-title">TAKSİMETRE BİLGİLERİ</div>
    <table>
      <tr><th>Marka</th><th>Model</th><th>Seri No</th><th>K Sabiti</th><th>Kelebek Mühür Seri No</th></tr>
      <tr><td>${safe(d.taksimetre_marka)}</td><td>${safe(d.taksimetre_model)}</td><td>${safe(d.seri_no)}</td><td>${safe(d.k_sabiti)}</td><td>${safe(d.kelebek_muhur_seri_no)}</td></tr>
    </table>
  </div>

  <div class="two-col">
    <div>
      <strong>Yetkili Tamir ve Ayar Servisinin</strong><br>
      Unvanı: ${safe(UNVAN)}<br>
      İşyeri Uygunluk Belge No:<br>
      Kaşe ve İmza:
    </div>
    <div>
      <strong>Yapılan işlevin tanımı</strong><br>
      ${isTamirAyar ? '☑' : '☐'} TAMİR-AYAR<br>
      ${!isTamirAyar ? '☑' : '☐'} DİĞER.....................<br><br>
      <strong>İşlem Yapan Kişinin</strong><br>
      Ad Soyad: Kaan MERTOĞLU<br>
      Yetkili Belgesi Numarası: YB 07/179
    </div>
  </div>

  <div class="not-section">
    <strong>Not:</strong><br>
    1 - Tamir ve ayar servisi 3/9/2013 tarihli ve 28754 sayılı Resmi Gazete'de yayımlanan Taksimetre Muayene Yönetmeliği'nin 7/A maddesi gereğince taksimetreye yaptığı işlemler sonucunda bu formu doldurmaktadır.<br>
    2 - Taksimetre kullanıcısı bu formu, taksimetre muayenesini yaptıracağı taksimetre muayene servisine ve talep edildiğinde ilgililere göstermekle yükümlüdür.
  </div>
</div>
</body></html>`;
  openPrintFrame(html);
}
