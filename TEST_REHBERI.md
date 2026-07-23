# Kaan Taksimetre Yönetim Sistemi — Yerel Test Rehberi

Bu paket, Render/GitHub/kalıcı disk satın almadan önce uygulamayı kendi Windows bilgisayarınızda test etmeniz için hazırlanmıştır.

## Paketin durumu

- Paket gerçek müşteri veritabanı içermez.
- İlk çalıştırmada boş `backend/taksimetre.db` dosyası otomatik oluşur.
- İlk çalıştırmada yerel test kullanıcısı otomatik oluşur.
- Frontend lint ve üretim derlemesi başarıyla tamamlanmıştır.
- Go backend kaynakları `gofmt` ile doğrulanmıştır. Bu hazırlama ortamında Go 1.26.3 indirilemediği için backend derlemesi sizin bilgisayarınızda ilk çalıştırmada yapılacaktır.

## 1. Bilgisayara bir kez kurulacak programlar

### Node.js

Node.js LTS sürümünü kurun. Kurulum sırasında varsayılan seçenekleri kullanabilirsiniz.

Kurulum kontrolü için Komut İstemi açıp çalıştırın:

```bat
node --version
npm --version
```

### Go

Go 1.26.3 veya daha yeni sürümü kurun.

Kurulum kontrolü:

```bat
go version
```

Programları yeni kurduysanız açık terminal pencerelerini kapatıp yeniden açın. Gerekirse bilgisayarı yeniden başlatın.

## 2. ZIP'i hazırlama

1. ZIP dosyasına sağ tıklayın.
2. **Tümünü Ayıkla** seçeneğini kullanın.
3. Projeyi örneğin şu klasöre çıkarın:

```text
C:\Taksimetre-Test
```

Projeyi ZIP'in içinden doğrudan çalıştırmayın.

## 3. Siteyi ilk kez çalıştırma

Ana klasörde:

```text
1_ILK_KURULUM_VE_BASLAT.bat
```

dosyasına çift tıklayın.

Bu işlem:

1. Node.js, npm ve Go kurulumlarını kontrol eder.
2. Backend terminalini açar.
3. Frontend terminalini açar.
4. İlk çalıştırmada gerekli paketleri indirir.
5. Tarayıcıda siteyi açar.

İlk çalıştırma internet hızına göre birkaç dakika sürebilir.

Site adresi:

```text
http://127.0.0.1:5173
```

İlk test hesabı:

```text
E-posta: admin@kaan.local
Şifre:   KaanTaksi123!
```

> Live Server kullanmayın. Bu proje React frontend, Go backend ve SQLite veritabanından oluştuğu için iki uygulamanın birlikte çalışması gerekir.

## 4. Bilgisayar/işlem noktası adını belirleme

Giriş yaptıktan sonra sol menüden:

```text
Sistem ve Yedekleme
```

sayfasını açın.

Bu bilgisayara anlaşılır bir ad verin:

```text
OFIS-1
```

veya:

```text
AYAR-MASASI
```

Bu ad, belgeyi hangi bilgisayarın oluşturduğunu işlem geçmişinde ayırt etmek için saklanır.

## 5. Önerilen tek bilgisayar testi

### Tarife ayarlarını test etme

1. **İL/İLÇE Tarife** sayfasını açın.
2. İl ve ilçe için deneme değerleri girin.
3. İki tarifeyi ayrı ayrı kaydedin.
4. Sayfayı yenileyin ve değerlerin korunduğunu doğrulayın.

### Müşteri ve taksimetre kaydı

1. **Tamir Ayar** sayfasını açın.
2. Deneme plakası olarak gerçek kişiye ait olmayan bir değer kullanın:

```text
38TEST01
```

Plaka doğrulaması yalnızca gerçek Türkiye plaka biçimini kabul ettiği için örneğin şunu kullanabilirsiniz:

```text
38ABC123
```

3. Tamamen sahte test bilgileri girin.
4. **Kaydet** düğmesine basın.
5. Plakayı yeniden aratıp bilgilerin geldiğini kontrol edin.

### Belge oluşturma

1. Aynı kayıtta **Tamir Ayar Belgesi Oluştur** düğmesine basın.
2. Yazdırma önizlemesinde belgenin sağ üstündeki tarih ve saati kontrol edin.
3. Tarayıcının sol üst tarihini veya alt URL bilgisini gösterdiği bir durumda yazdırma ekranından:

```text
Daha fazla ayar → Üstbilgiler ve altbilgiler → Kapalı
```

seçin.
4. Belge numarasını not edin.
5. **Belge Arama** sayfasından plakayı aratın.
6. **Yeniden Yazdır** seçin.
7. Belgenin ilk kaydedildiği tarih-saatin değişmediğini doğrulayın.

### Tarife belgesi

1. **Tarife Belgesi Oluştur** sayfasını açın.
2. Plakayı aratın.
3. İl veya ilçe tarifesini seçin.
4. Belgeyi oluşturun.
5. Belge geçmişinde iki işlem türünün de bulunduğunu doğrulayın.

## 6. İki veya üç bilgisayar davranışını tek bilgisayarda test etme

Aynı bilgisayarda iki bağımsız kullanıcı ortamı oluşturmak için:

- Chrome normal pencereyi açın.
- Edge normal pencereyi açın.

İki tarayıcıda da siteye giriş yapın. Her tarayıcıda **Sistem ve Yedekleme** sayfasından farklı işlem noktası adı belirleyin:

```text
Chrome: OFIS-1
Edge:   OFIS-2
```

### Farklı plaka testi

1. Chrome'da `38ABC123` plakasını açın.
2. Edge'de `38DEF456` plakasını açın.
3. İki tarafta yaklaşık aynı anda kaydedin.
4. İki plakayı da yeniden aratın.
5. Her iki kaydın ayrı ayrı tutulduğunu doğrulayın.

### Aynı plaka çakışma testi

1. Önceden kaydedilmiş aynı plakayı iki tarayıcıda da aratın.
2. Chrome'da bir alanı değiştirip kaydedin.
3. Edge'de sayfayı yenilemeden başka bir alanı değiştirip kaydetmeye çalışın.
4. Sistem şu anlama gelen bir uyarı göstermelidir:

```text
Bu plaka başka bir bilgisayarda değiştirilmiş. Güncel kaydı tekrar arayın.
```

Bu kontrol, eski bilgilerin sessizce güncel kaydın üzerine yazılmasını engeller.

### Aynı tarife çakışma testi

1. İl tarifesi sayfasını iki tarayıcıda açın.
2. Birinci tarayıcıda değişiklik yapıp kaydedin.
3. İkinci tarayıcı eski açık sayfadan kaydetmeye çalışsın.
4. İkinci tarayıcıda çakışma uyarısı çıkmalı ve güncel tarife tekrar yüklenmelidir.

## 7. Yedekleme testi

1. **Sistem ve Yedekleme** sayfasını açın.
2. Müşteri, taksimetre ve işlem sayılarını kontrol edin.
3. **Veritabanı Yedeğini İndir** düğmesine basın.
4. İndirilen dosyayı örneğin şu klasöre kaydedin:

```text
C:\TaksimetreYedekleri\Test
```

Yedek dosyası çalışan veritabanından SQLite'ın tutarlı yedekleme yöntemiyle oluşturulur.

### Geri yükleme testi

1. Backend ve frontend terminal pencerelerini kapatın.
2. Ana klasörde `5_VERITABANI_GERI_YUKLE.bat` dosyasını çalıştırın.
3. İndirdiğiniz `.db` dosyasının tam yolunu girin.
4. Onay için `EVET` yazın.
5. Uygulamayı yeniden başlatın.
6. Test plakalarının geri geldiğini doğrulayın.

Geri yükleme öncesinde aktif veritabanının ayrıca güvenlik kopyası alınır.

## 8. Şifreyi değiştirme

Sunucu kapalıyken:

```text
2_SIFRE_DEGISTIR.bat
```

çalıştırın.

Yeni e-posta ve en az 10 karakterli güçlü bir şifre girin. Sonraki girişlerde yeni bilgiler kullanılır.

## 9. Tek sunuculu üretim şeklini yerelde test etme

Geliştirme testi tamamlandıktan sonra:

1. `3_URETIM_SURUMU_HAZIRLA.bat` dosyasını çalıştırın.
2. İşlem tamamlandığında `4_URETIM_SURUMUNU_BASLAT.bat` dosyasını çalıştırın.
3. Tarayıcıda şu adres açılır:

```text
http://127.0.0.1:3000
```

Bu modda React ve Go için iki ayrı terminal yerine tek Go sunucusu bütün siteyi sunar. Render'daki çalışma şekline daha yakındır.

## 10. Siteyi kapatma

Geliştirme modunda açılan şu iki pencereyi kapatın:

- Taksimetre Backend
- Taksimetre Frontend

Üretim testinde yalnızca Taksimetre Sunucusu penceresini kapatın.

## 11. Yerel dosyalar nerede tutulur?

```text
backend\taksimetre.db          Aktif test veritabanı
backend\auth_config.json       Yerel kullanıcı ve parola özeti
backend\backups\               Otomatik ve manuel sunucu yedekleri
```

Bu dosyalarda kişisel veri bulunabileceği için gerçek kullanıma başladıktan sonra üçüncü kişilerle paylaşmayın ve GitHub'a yüklemeyin.

## 12. Test ortamını sıfırlama

Sunucu kapalıyken:

```text
6_TEST_VERILERINI_SIL.bat
```

çalıştırın ve `SIL` yazın.

Bu işlem test veritabanını, yerel kullanıcı ayarını ve yerel yedekleri siler. Sonraki başlatmada sistem boş olarak yeniden oluşur.

## 13. Render aşamasına geçmeden önce kontrol listesi

- Farklı plakalar iki tarayıcıdan aynı anda kaydedilebiliyor.
- Aynı plakada eski sürümle kayıt engelleniyor.
- Tarife çakışması engelleniyor.
- Belge numarası tekil oluşuyor.
- Belge tekrar yazdırıldığında ilk kayıt tarihi korunuyor.
- İşlem noktası belge geçmişinde görünüyor.
- Yedek indirilebiliyor.
- Yedek geri yüklenebiliyor.
- Şirketin gerçek yönetici e-postası ve güçlü şifresi belirlenmiş.

Bu kontroller tamamlandıktan sonra GitHub ve Render kurulumu yapılmalıdır.

## Başlatıcı pencere hemen kapanırsa

Bu pakette başlangıç sistemi yenilenmiştir:

1. ZIP dosyasını **Tamamen Ayıkla** ile normal bir klasöre çıkarın.
2. Önce `0_SISTEM_KONTROLU.bat` dosyasını çalıştırın.
3. Ardından `1_BASLAT.bat` dosyasını çalıştırın.
4. Normal test modu Node.js istemez; derlenmiş frontend Go backend üzerinden sunulur.
5. Bir hata olursa pencere kapanmaz ve `BASLATMA_LOGU.txt` oluşur.
