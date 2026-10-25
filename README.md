# Umay — Bir Ömürlük Hikâye (Supabase bağlantılı sürüm)

Premium, mobil uyumlu dijital aile anı defteri. Doğum anı: **17 Ekim 2026, 10:53, Türkiye saati (UTC+3)**.

## Bu sürümde
- Gerçek e-posta/şifre girişi (Supabase Auth)
- Aile üyeleri için veritabanı tabanlı ortak fotoğraf albümü
- Özel Supabase Storage bucket ve imzalı fotoğraf URL'leri
- Ortak mektuplar ve zaman kapsülleri
- Kilitli kapsüller: mesaj satırları, açılma zamanına kadar tüm aile üyelerine kapalıdır
- Yaş sayacı, özel günler, paylaşım ve PNG hatıra kartı

## 1) Supabase projesi oluştur
Supabase Dashboard'da bir proje oluştur veya aile sitesi için ayrı bir proje kullan. **Service role / secret key'i asla `supabase-config.js` dosyasına koyma.**

## 2) SQL'i çalıştır
Dashboard → SQL Editor → New query. `supabase-setup.sql` dosyasının tamamını yapıştırıp çalıştır.

## 3) Aile hesaplarını oluştur
Dashboard → Authentication → Users → Add user. Her aile üyesi için e-posta ve şifre oluştur. İstersen e-posta doğrulamasını açık tut.

Her kullanıcının UUID'sini Authentication → Users listesinden kopyala. SQL Editor'da aşağıdaki örneği kendi UUID'nle değiştirip çalıştır:

```sql
insert into public.umay_family_members (user_id, display_name, role)
values ('KULLANICININ-AUTH-UUIDSİ', 'Aile yöneticisi', 'admin');
```

Diğer aile üyeleri için rolü `member` yap. Kullanıcı `umay_family_members` tablosuna eklenmezse oturum açsa bile aile verilerine erişemez.

## 4) Proje URL ve anahtarını ekle
`supabase-config.js` dosyasını aç:
- `url`: Supabase Project Settings → API → Project URL
- `anonKey`: aynı ekrandaki anon/publishable key

**Yalnızca anon/publishable key kullan.** `service_role` veya `sb_secret_...` anahtarları tarayıcıda kullanma.

## 5) GitHub Pages'e yükle
Ayrı bir repository oluşturup bu paketteki dosyaları repository köküne yükle:
- `index.html`
- `styles.css`
- `app.js`
- `supabase-config.js`
- `supabase-setup.sql` (kurulum tamamlanınca repoda tutmak zorunda değilsin)
- `README.md`

Settings → Pages → Deploy from a branch → `main` → `/(root)` seç. Pages adresini aç, aile hesabıyla giriş yap ve fotoğraf yükleme/mektup/kapsül akışlarını test et.

## Gizlilik notları
- Siteye kayıt olma ekranı yok; hesapları yönetici oluşturur.
- Veritabanı RLS kuralları aile üyeliğini kontrol eder. Storage bucket özeldir.
- `supabase-config.js` içinde görünen anon/publishable key normaldir; erişim güvenliğini RLS ve Storage policy'leri sağlar.
- Kapsül mesajı için veritabanı sorgusu açılma tarihinden önce hiçbir aile üyesine mesaj satırını döndürmez. Bu nedenle kilitli kapsülün içeriği veritabanı politikasınca korunur.
- GitHub repository'sini public tutabilirsin, ancak **özel fotoğraf veya mektup dosyalarını repository'ye asla koyma**.
- Site bağlantısı tek başına erişim sağlamaz; ziyaretçinin Supabase aile hesabı gerekir.
- SQL kurulumu ve üyelik atamaları yapılmadan gerçek güvenli aile arşivi çalışmaz.

## Şimdiki sınırlar
Bu paket, tarayıcıdaki arayüzü ve Supabase bağlantı kodunu hazırlar; senin Supabase proje URL/anon key değerlerini ve aile hesaplarını ben bilemem. Bunlar Dashboard'dan eklenmeli. Kurulumdan sonra test ederek ilerle.
