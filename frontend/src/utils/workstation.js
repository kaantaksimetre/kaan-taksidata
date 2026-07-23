const STORAGE_KEY = 'taksimetre_workstation_name';

function generateDefaultName() {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `ISTASYON-${suffix}`;
}

export function getWorkstationName() {
  const stored = localStorage.getItem(STORAGE_KEY)?.trim();
  if (stored) return stored;
  const generated = generateDefaultName();
  localStorage.setItem(STORAGE_KEY, generated);
  return generated;
}

export function setWorkstationName(value) {
  const cleaned = String(value ?? '').trim().slice(0, 80);
  if (!cleaned) throw new Error('Bilgisayar/işlem noktası adı boş olamaz');
  localStorage.setItem(STORAGE_KEY, cleaned);
  window.dispatchEvent(new CustomEvent('workstation:changed', { detail: cleaned }));
  return cleaned;
}
