# v3.5 Belge ve Form Düzenlemeleri

- Tamir Ayar ekranındaki **Geçici Mühür** alanı kaldırıldı.
- Tamir Ayar belgesindeki **Kelebek Mühür Seri No**, arayüzdeki `kelebek_muhur_seri_no` alanından gelmeye devam eder.
- Tamir Ayar ve Tarife Yükleme belgelerindeki servis unvanı **KAAN ELEKTRONİK - KAAN MERTOĞLU** olarak değiştirildi.
- Her iki belgedeki **İşlem Yapan Kişi** bölümünden **Kullanıcı** ve **İşlem Noktası** satırları kaldırıldı.
- İşlem noktası bilgisi belge geçmişi ve dahili denetim kaydında tutulmaya devam eder; yalnızca basılı belgede gösterilmez.

# Son Sürümde Bulunan Özellikler

## Güvenlik

- Tek e-posta ve parola ile giriş
- HTTP-only, SameSite oturum çerezi
- Hatalı giriş denemesi sınırı
- Korunan müşteri, tarife, işlem ve yedek endpointleri
- CORS yerine aynı kaynaklı frontend/backend kullanımı
- Güvenlik HTTP başlıkları ve CSP
- Sunucu tarafında plaka, e-posta, telefon, T.C./vergi no ve tarife doğrulaması
- SQL parametre bağlama
- Foreign-key kontrolü
- Hassas API cevaplarında `no-store`
- Veritabanı ve kimlik dosyalarının Git/GitHub dışında tutulması

## Veri bütünlüğü

- Müşteri ve taksimetre kaydında transaction
- SQLite WAL, 10 saniye busy timeout ve tek bağlantıyla güvenli yazma sıralaması
- Aynı anda farklı plakaların kaydedilebilmesi
- Aynı plakanın iki bilgisayarda eski sürümle üzerine yazılmasının engellenmesi
- İl/ilçe tarifelerinde sürüm/çakışma kontrolü
- Belge oluşturma isteğinde benzersiz `request_id` ile çift kayıt koruması
- Belge içeriklerinin işlem anında snapshot olarak saklanması
- Eski belgenin yeniden yazdırılmasında ilk içerik ve ilk tarih-saatin korunması
- Kriptografik belge numarası

## Çoklu bilgisayar kullanımı

- Her tarayıcı/bilgisayar için işlem noktası adı
- İşlem geçmişinde hangi bilgisayarın belge oluşturduğunun gösterilmesi
- Belge üzerinde işlem noktası bilgisi
- İki veya üç bilgisayardan aynı anda farklı plakalarla çalışma

## Tarih ve saat

- Belge tarihi siteyi kullanan bilgisayarın yerel saatinden alınır.
- Sunucunun gerçek kayıt zamanı ayrıca veritabanında tutulur.
- Yeniden yazdırmada yeni tarih oluşturulmaz.
- Belgenin sağ üstünde ilk kayıt tarihi ve saati gösterilir.

## Yedekleme

- Çalışan SQLite veritabanından `VACUUM INTO` ile tutarlı yedek
- Uygulama ekranından yedek indirme
- SHA-256 yedek özeti
- Açılış ve güvenli kapanış yedeği
- Son 50 sunucu yedeğini saklama
- Yedek bütünlük ve tablo kontrolü
- Sunucu kapalıyken kontrollü geri yükleme
- Geri yükleme öncesinde mevcut veritabanını otomatik yedekleme

## Dağıtım hazırlığı

- Yerel geliştirme başlatıcısı
- Tek sunuculu Windows üretim derlemesi
- Dockerfile
- Render Blueprint (`render.yaml`)
- Render kalıcı disk yolu `/var/data/taksimetre.db`
- Render ortam değişkenleri için örnek yapı
- Gerçek veritabanı içermeyen temiz teslim paketi


## v3.3
- Müşteri, araç, taksimetre, plaka ve tarife alanlarında tarayıcı otomatik doldurma önerileri kapatıldı.
- Alan adları her sayfa yüklemesinde rastgeleleştirilerek eski tarayıcı form geçmişiyle eşleşmesi engellendi.
- Parola yöneticilerinin bu iş alanlarını yanlışlıkla doldurmaması için ignore işaretleri eklendi.
