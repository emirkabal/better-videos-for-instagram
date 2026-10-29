const en = {
  title: "Instagram deserves\na better player.",
  intro: "Meet the new controls. Built around what you watch.",
  installed: "Ready to watch",
  updated: "Updated to",
  explore: "See what's new",
  open: "Open Instagram",
  feed: "Feed",
  pip: "Picture-in-Picture",
  seek: "Frame previews",
  stories: "Stories",
  feedTitle: "Just the video.\nUntil you need more.",
  feedBody:
    "Volume, speed and fullscreen in one small panel. Move over the video to reveal your controls. Move away and they disappear.",
  feedNote:
    "Choose in settings whether a click pauses the video or opens the Reel.",
  pipTitle: "A small window.\nThe whole player.",
  pipBody:
    "Keep Reels beside whatever you're doing. Next, previous, playback speed and auto-skip, all inside the floating player.",
  pipNote:
    "Switch between Reels and the feed, and the floating window closes automatically.",
  seekTitle: "See where\nyou're going.",
  seekBody:
    "Move along the timeline to see the moment before you jump. Now available on feed videos and individual posts, too.",
  seekNote:
    "On Instagram, frame previews appear when the video includes a spritesheet.",
  storiesTitle: "Your Stories.\nA little quieter.",
  storiesBody:
    "Volume and speed sit on the right. The panel slides away when you're watching, and comes back when you need it.",
  storiesNote: "Your volume and playback speed are remembered.",
  demo: "Interactive player demo",
  demoNote: "Try the controls. This demo won't change your settings.",
  demoUnavailable: "The demo video could not be loaded.",
  previewHint: "Move over the timeline to preview a frame",
  play: "Play",
  pause: "Pause",
  previous: "Previous demo clip",
  next: "Next demo clip",
  speed: "Playback speed",
  volume: "Volume",
  fullscreen: "Fullscreen",
  autoSkip: "Auto-skip",
  detailsTitle: "And the everyday essentials.",
  speedTitle: "Your pace",
  speedBody: "From 0.25× to 2×, remembered for the next video.",
  volumeTitle: "Your volume",
  volumeBody: "Fine adjustment and a maximum-volume limit in settings.",
  skipTitle: "One Reel after another",
  skipBody:
    "Automatic skipping, with an option to wait while comments are open.",
  ready: "Back to your feed.",
  readyBody: "Everything's ready. Open Instagram and play a video.",
  support: "Support the project",
  supportTitle: "Like watching this way?",
  supportBody:
    "Better Videos is an independent, open-source project. If it makes your everyday scrolling better, you can support its development with a coffee.",
  supportAction: "Buy me a coffee",
  supportGithub: "Explore the source on GitHub",
  credit: "Demo footage: MDN · CC0"
}

const tr: typeof en = {
  title: "Instagram için\ngerçek bir oynatıcı.",
  intro: "Yeni kontrollerle tanış. Videoya daha çok yer aç.",
  installed: "İzlemeye hazırsın",
  updated: "Güncellendi",
  explore: "Yenilikleri gör",
  open: "Instagram'ı aç",
  feed: "Ana sayfa",
  pip: "Resim içinde resim",
  seek: "Kare önizlemeleri",
  stories: "Story",
  feedTitle: "İzlerken kaybolur.\nGerektiğinde yanında.",
  feedBody:
    "Ses, hız ve tam ekran tek bir küçük panelde. Fareyi videoya getir, kontroller görünsün. Uzaklaştır, video sana kalsın.",
  feedNote:
    "Videoya tıklayınca duraklamasını veya Reel'in açılmasını ayarlardan seçebilirsin.",
  pipTitle: "Küçük pencere.\nTam kontrol.",
  pipBody:
    "Başka bir şeyle uğraşırken Reels yanında kalsın. Önceki video, sonraki video, oynatma hızı ve otomatik geçiş; hepsi yüzen pencerede.",
  pipNote:
    "Reels ile ana sayfa arasında geçiş yaptığında yüzen pencere otomatik kapanır.",
  seekTitle: "Atlamadan önce\no anı gör.",
  seekBody:
    "İlerleme çubuğunda gezin, gitmek istediğin kareyi gör. Artık ana sayfa videolarında ve tekil gönderilerde de.",
  seekNote:
    "Instagram'da kare önizlemeleri, video için spritesheet sağlandığında görünür.",
  storiesTitle: "Story'ye daha çok\nyer kalsın.",
  storiesBody:
    "Ses ve hız sağ tarafta. İzlemeye başladığında panel sağa çekilir, ihtiyacın olduğunda geri gelir.",
  storiesNote: "Ses seviyen ve oynatma hızın hatırlanır.",
  demo: "Etkileşimli oynatıcı demosu",
  demoNote: "Kontrolleri dene. Buradaki değişiklikler ayarlarını etkilemez.",
  demoUnavailable: "Demo videosu yüklenemedi.",
  previewHint: "Bir kareyi görmek için ilerleme çubuğunda gezin",
  play: "Oynat",
  pause: "Duraklat",
  previous: "Önceki demo klibi",
  next: "Sonraki demo klibi",
  speed: "Oynatma hızı",
  volume: "Ses",
  fullscreen: "Tam ekran",
  autoSkip: "Otomatik geçiş",
  detailsTitle: "Her gün kullandığın detaylar da burada.",
  speedTitle: "Senin hızında",
  speedBody: "0.25× ile 2× arası. Bir sonraki video için de hatırlanır.",
  volumeTitle: "Ses kararında",
  volumeBody: "Hassas ses ayarı ve ayarlardan belirleyebileceğin üst sınır.",
  skipTitle: "Reels kesilmesin",
  skipBody: "Otomatik geçiş. İstersen yorumları okurken beklesin.",
  ready: "Akışına geri dön.",
  readyBody: "Her şey hazır. Instagram'ı aç, bir video oynat.",
  support: "Projeyi destekle",
  supportTitle: "Böyle izlemek daha güzel mi?",
  supportBody:
    "Better Videos bağımsız, açık kaynaklı bir proje. Günlük kullanımını biraz daha keyifli hale getiriyorsa bir kahveyle geliştirilmesine destek olabilirsin.",
  supportAction: "Bir kahve ısmarla",
  supportGithub: "Kaynak kodunu GitHub'da incele",
  credit: "Demo görüntüsü: MDN · CC0"
}

export const welcomeCopy = chrome.i18n.getUILanguage().startsWith("tr")
  ? tr
  : en
export type WelcomeCopy = typeof en
