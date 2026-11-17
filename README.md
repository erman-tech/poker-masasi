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

## Novo Poker (kasaya karşı)

*Masa kur* → **Novo Poker**. 1-3 oyuncu (tek kişi de olur), telefon gerekmez; tablette ya da tek başına telefonda açılır. Önce herkes sırayla kart çeker, sonra tek tek oyuna girip girmeyeceği sorulur. Dağıtımdan önce desteden 3 kart yakılır (oyun 49 kartla), kart çekmeden önce 1 kart gömülür.
- Giriş: ante $25 + zorunlu express $25. Express yalnız ilk 5 karta bakar ve dağıtım biter bitmez kapanır:
  bonus varsa kasa öder, yoksa kasa express'i alır. Bonuslar: sahte renk 2 · As-Papaz-Kız 5 · üçlü 8 · kent 30 ·
  renk 60 · full 100 · beş surat (5 kartın hepsi vale/kız/papaz) 120 · kare 200 · renkli kent 250 · royal flush 500.
- Kart çektikten sonra pas: ante ve kart çekme ücreti kasada kalır (express zaten kapandı).
- Sırayla: Pas · Oyna ($50) · Kart çek ($25, istediğin kartları seç) · 6. kart ($25).
- Kasanın son kartı açık, 4'ü kapalı. Kasa As-Papaz ve üstüyle oyuna girer; girmezse
  ante'yi al ya da $25 verip kasaya kart çektir (kasa en yüksek kartını atar, bir kart yakar, sıradakini alır).
- Betten en az 4 kat ödeyen elle oynayana sigorta sorulur: yok / min $50 / max (kazanılacak betin yarısı,
  parası azsa parası kadar). Kasanın oyunu olmazsa 1'e 1 öder, olursa kasanın.
- Üst çubukta kasanın bu oyundaki artı/eksisi. Parası biten tabletten para yükler.
- Her el iPad'in güvenli rastgele üreteciyle sıfırdan karıştırılır.

## Geliştirme

    npm test        # el gücü, pot ve kural testleri (node 20+)
