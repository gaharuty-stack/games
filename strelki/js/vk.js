// Обёртка над VK Bridge: реклама, облачные сохранения, социальные функции.
// Вне ВК работает в тестовом режиме: реклама имитируется.

const bridge = typeof window !== 'undefined' ? window.vkBridge : null;
const params = new URLSearchParams(location.search);
const withTimeout = (p, ms, fb) => Promise.race([p, new Promise((r) => setTimeout(() => r(fb), ms))]);

export const VK = {
  inVK: !!(params.get('vk_app_id') || params.get('api_id') || params.get('vk_platform')),
  platform: params.get('vk_platform') || 'web',
  // та же игра в Одноклассниках (через VK Bridge): там нет окна рейтинга, а приглашению нужен текст
  isOK: params.get('vk_client') === 'ok' || /_ok$/.test(params.get('vk_platform') || ''),
  inviteText: 'Помоги собрать подарки к Новому году — сыграй со мной в «Новогодние Стрелки»!',
  get hasLeaderboard() { return this.inVK && !this.isOK; },
  ready: false,
  onPause: null,
  onResume: null,
  mockAd: null, // (type) => Promise<boolean> — визуальная заглушка рекламы вне ВК

  async init() {
    if (!bridge) return;
    bridge.subscribe((e) => {
      const t = e.detail && e.detail.type;
      if (t === 'VKWebAppViewHide' && this.onPause) this.onPause();
      if (t === 'VKWebAppViewRestore' && this.onResume) this.onResume();
    });
    if (!this.inVK && !(bridge.isEmbedded && bridge.isEmbedded())) return;
    // вне клиента ВК мост может не ответить — не ждём дольше 2 секунд
    const timeout = new Promise((r) => setTimeout(() => r('timeout'), 2000));
    try {
      const res = await Promise.race([bridge.send('VKWebAppInit'), timeout]);
      this.ready = res !== 'timeout';
    } catch (e) {
      this.ready = false;
    }
    if (this.inVK) this.preload();
  },

  preload() {
    if (!bridge || !this.inVK) return;
    bridge.send('VKWebAppCheckNativeAds', { ad_format: 'interstitial' }).catch(() => {});
    bridge.send('VKWebAppCheckNativeAds', { ad_format: 'reward' }).catch(() => {});
  },

  async showInterstitial() {
    if (!this.inVK || !bridge) return this.mockAd ? this.mockAd('interstitial') : false;
    try {
      const r = await bridge.send('VKWebAppShowNativeAds', { ad_format: 'interstitial' });
      return !!(r && r.result);
    } catch (e) {
      return false;
    } finally {
      this.preload();
    }
  },

  async showRewarded() {
    if (!this.inVK || !bridge) return this.mockAd ? this.mockAd('reward') : true;
    try {
      const r = await bridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' });
      return !!(r && r.result);
    } catch (e) {
      return false;
    } finally {
      this.preload();
    }
  },

  async storageGet(key) {
    if (!this.inVK || !bridge) return null;
    try {
      const r = await withTimeout(bridge.send('VKWebAppStorageGet', { keys: [key] }), 2500, null);
      const item = r && r.keys && r.keys.find((k) => k.key === key);
      return item && item.value ? item.value : null;
    } catch (e) {
      return null;
    }
  },

  async storageSet(key, value) {
    if (!this.inVK || !bridge) return false;
    try {
      await bridge.send('VKWebAppStorageSet', { key, value });
      return true;
    } catch (e) {
      return false;
    }
  },

  async addToFavorites() {
    if (!this.inVK || !bridge) return false;
    try { await bridge.send('VKWebAppAddToFavorites'); return true; } catch (e) { return false; }
  },

  async invite() {
    if (!this.inVK || !bridge) return false;
    try { await bridge.send('VKWebAppShowInviteBox', this.isOK ? { message: this.inviteText } : {}); return true; } catch (e) { return false; }
  },

  async leaderboard(level) {
    if (!this.hasLeaderboard || !bridge) return false;
    try { await bridge.send('VKWebAppShowLeaderBoardBox', { user_result: level }); return true; } catch (e) { return false; }
  },
};
