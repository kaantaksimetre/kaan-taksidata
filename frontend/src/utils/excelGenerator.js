import ExcelJS from 'exceljs';

const UNVAN_BASLIK =
  'KAAN ELEKTRONİK-KAAN MERTOĞLU  UNVANLI TAKSİMETRE TAMİR VE AYAR SERVİSİ TARAFINDAN YAPILAN ' +
  'TAKSİMETRE TARİFE DEĞİŞİKLİĞİ LİSTESİDİR.';

const THIN = { style: 'thin', color: { argb: 'FF000000' } };
const HUCRE_KENARLIK = { top: THIN, left: THIN, bottom: THIN, right: THIN };

function plakaParcala(plaka) {
  const match = /^([0-9]{2})([A-Z]{1,3})([0-9]{2,4})$/.exec(String(plaka || '').toUpperCase());
  if (!match) return { il: plaka || '', harf: '', numara: '' };
  const [, il, harf, numara] = match;
  return { il, harf, numara };
}

function depoTarihiCoz(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, yil, ay, gun] = match;
  return new Date(Number(yil), Number(ay) - 1, Number(gun));
}

/**
 * kayitlar: [{ plaka, islem_turu, islem_tarihi, taksimetre_marka, taksimetre_model,
 *              seri_no, kelebek_muhur_seri_no }]
 * Şablonla aynı görünümde (başlık, birleşik başlıklar, kenarlıklar) bir .xlsx üretir.
 */
export async function generateBelgeExcel(kayitlar) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Kaan Taksimetre Yönetim Sistemi';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Sheet1');
  sheet.columns = [
    { width: 8 },
    { width: 7 },
    { width: 8 },
    { width: 10 },
    { width: 14 },
    { width: 12 },
    { width: 14 },
    { width: 18 },
    { width: 13 },
    { width: 14 },
  ];

  sheet.mergeCells('A1:J1');
  const baslikHucresi = sheet.getCell('A1');
  baslikHucresi.value = UNVAN_BASLIK;
  baslikHucresi.font = { bold: true, size: 11 };
  baslikHucresi.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  sheet.getRow(1).height = 42;

  sheet.addRow([]);
  sheet.addRow([]);
  sheet.addRow([]);

  sheet.mergeCells('A5:A6');
  sheet.mergeCells('B5:D5');
  sheet.mergeCells('E5:G5');
  sheet.mergeCells('H5:H6');
  sheet.mergeCells('I5:I6');
  sheet.mergeCells('J5:J6');

  const baslik1 = sheet.getRow(5);
  baslik1.getCell(1).value = 'SIRA NO';
  baslik1.getCell(2).value = 'TAKSİ PLAKASI';
  baslik1.getCell(5).value = 'TAKSİMETRENİN';
  baslik1.getCell(8).value = 'KELEBEK MÜHÜR NO';
  baslik1.getCell(9).value = 'YAPILAN İŞLEM';
  baslik1.getCell(10).value = 'İŞLEM TARİHİ';

  const baslik2 = sheet.getRow(6);
  baslik2.getCell(5).value = 'MARKASI';
  baslik2.getCell(6).value = 'MODELİ';
  baslik2.getCell(7).value = 'SERİ NUMARASI';

  [baslik1, baslik2].forEach((row) => {
    for (let col = 1; col <= 10; col += 1) {
      const cell = row.getCell(col);
      cell.font = { bold: true, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = HUCRE_KENARLIK;
    }
  });

  kayitlar.forEach((kayit, index) => {
    const { il, harf, numara } = plakaParcala(kayit.plaka);
    const row = sheet.addRow([
      index + 1,
      il,
      harf,
      numara,
      kayit.taksimetre_marka || '',
      kayit.taksimetre_model || '',
      kayit.seri_no || '',
      kayit.kelebek_muhur_seri_no || '',
      kayit.islem_turu === 'tarife_yukleme' ? 'TARİFE' : 'TAMİR-AYAR',
      depoTarihiCoz(kayit.islem_tarihi),
    ]);
    row.getCell(10).numFmt = 'dd.mm.yyyy';
    for (let col = 1; col <= 10; col += 1) {
      const cell = row.getCell(col);
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = HUCRE_KENARLIK;
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
