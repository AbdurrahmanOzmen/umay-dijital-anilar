# Umay — Bir Ömürlük Hikâye (Supabase bağlantılı sürüm)

Premium, mobil uyumlu dijital aile anı defteri. 

## Bu sürümde
- Gerçek e-posta/şifre girişi
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





