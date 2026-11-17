# Poker Masası

İnternetsiz oynanan Texas Hold'em (No-Limit). Gerçek para yok, yalnız fiş.

Adres: https://erman-tech.github.io/poker-masasi/

## Nasıl kurulur (internet varken, bir kez)

1. iPad'de ve üç telefonda adresi **Safari**'de aç.
2. Paylaş → **Ana Ekrana Ekle**. Sonra uygulamayı ana ekrandaki simgeden bir kez açıp kapat.
   Bundan sonra uçak modunda da açılır.

## Uçakta

- **iPad (masa):** simgeden aç → *Masa kur* → adlar (Erman, Fidan, Emrah) → *Masayı aç*.
  Ekranda 6 harfli bir **masa kodu** ve koltuk numaraları çıkar.
- **Her telefon:** simgeden aç → *Oyuncuyum* → masa kodu + kendi koltuk numaran → *Otur*.
- iPad *İlk eli dağıt* der. Herkes telefonunda *Kartlarımı al*'a basar; iki kart gelir.
  Kartlarına bakmak için ekrana **basılı tut**, bırakınca kapanır.
- Telefondaki **Kontrol** harfleri iPad'dekiyle aynıysa herkes doğru eldedir.
- Sırası gelen, iPad'de Fold / Check / Call / Raise / All-in'e basar. Ortak kartlar, pot,
  yan potlar ve kazanan iPad'de hesaplanır.
- Yanlış basılan hamle iPad'de **Geri al** ile düzelir.
- Herkes 1000 fişle başlar. Fişi biten oyun bitene kadar oynamaz. Tek kişi kalınca
  *Yeniden başla*: herkese yeniden 1000. Körler 10/20 ile başlar, 10 elde bir yükselir.

Telefonlar birbirine bağlanmaz; aynı masa kodu + aynı el numarası her cihazda aynı desteyi
karıştırır. Bu yüzden kopacak bir bağlantı yok; sayfa kapanırsa kaldığı yerden açılır.

Bilinen sınır: masa kodunu bilen ve kod yazmayı bilen biri, bu dosyalarla başkalarının
kartlarını hesaplayabilir. Arkadaş masası için yazıldı.

## Geliştirme

    npm test        # el gücü, pot ve kural testleri (node 20+)
