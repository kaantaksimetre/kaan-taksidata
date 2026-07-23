# Kaan Taksimetre Frontend

React + Vite arayüzüdür. Tek başına Live Server ile çalışmaz; Go backend gerektirir.

## Geliştirme

Kök klasördeki `GELISTIRME_BASLAT.bat` dosyasını kullanın veya:

```bash
npm install
npm run dev
```

Vite, `/api` isteklerini `http://127.0.0.1:3000` adresindeki backend'e yönlendirir.

## Kontrol

```bash
npm run check
```

## Üretim derlemesi

```bash
npm run build
```

Çıktı `dist/` klasörüne yazılır ve kökteki `URETIM_HAZIRLA.bat` tarafından `backend/public/` içine kopyalanır.
