/**
 * 激励视频广告管理
 *
 * 流程：准备页点击开始 → 播放激励视频广告 → 看完发放奖励（开局随机特效）
 *
 * 真机：使用微信小游戏原生激励视频广告（wx.createRewardedVideoAd），
 *       需要先在微信公众平台申请广告位，把 ID 填到下面的 REWARDED_AD_UNIT_ID。
 * 预览/开发：未配置广告位 ID 时走 window.__mockRewardedAd（预览页提供的模拟广告），
 *       若连模拟广告也没有则直接发放奖励，保证开发流程不被卡住。
 */

// ===== 在此填入微信公众平台申请的激励视频广告位 ID =====
export const REWARDED_AD_UNIT_ID = '';

// 开局特效候选：均为有时长增益，持续 8 秒
const OPENING_BUFFS = ['rapid', 'spread', 'heavy', 'goldrush', 'freeze', 'thunder'];
const OPENING_BUFF_DURATION = 8;

/** 随机抽取一个开局特效 */
export function pickOpeningBuff() {
  const key = OPENING_BUFFS[Math.floor(Math.random() * OPENING_BUFFS.length)];
  return { key, duration: OPENING_BUFF_DURATION };
}

let rewardedAd = null;

/**
 * 播放激励视频广告
 * @param {Object} cb
 * @param {Function} cb.onReward 看完广告（发放奖励）
 * @param {Function} cb.onCancel 提前关闭/播放失败（不发放奖励）
 */
export function showRewardedAd({ onReward, onCancel }) {
  const noop = () => {};
  const reward = onReward || noop;
  const cancel = onCancel || noop;

  const canUseWxAd =
    REWARDED_AD_UNIT_ID &&
    typeof wx !== 'undefined' &&
    typeof wx.createRewardedVideoAd === 'function';

  if (canUseWxAd) {
    showWxRewardedAd({ onReward: reward, onCancel: cancel });
    return;
  }

  // 预览页模拟广告
  if (typeof window !== 'undefined' && typeof window.__mockRewardedAd === 'function') {
    window.__mockRewardedAd(reward, cancel);
    return;
  }

  // 兜底：开发环境直接发放，保证流程可跑通
  // eslint-disable-next-line no-console
  console.warn('[ad] 未配置激励广告位 ID，直接发放开局特效（开发模式）');
  reward();
}

/** 微信原生激励视频广告 */
function showWxRewardedAd({ onReward, onCancel }) {
  try {
    if (!rewardedAd) {
      rewardedAd = wx.createRewardedVideoAd({ adUnitId: REWARDED_AD_UNIT_ID });
    }
    const ad = rewardedAd;
    const onClose = (res) => {
      ad.offClose(onClose);
      ad.offError(onError);
      if (res && res.isEnded) onReward();
      else onCancel();
    };
    const onError = (err) => {
      ad.offClose(onClose);
      ad.offError(onError);
      // eslint-disable-next-line no-console
      console.warn('[ad] 激励广告播放失败', err);
      onCancel();
    };
    ad.onClose(onClose);
    ad.onError(onError);
    const p = ad.show();
    if (p && typeof p.catch === 'function') {
      p.catch(() => ad.load().then(() => ad.show()).catch(onError));
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[ad] 激励广告异常', e);
    onCancel();
  }
}
