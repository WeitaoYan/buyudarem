/**
 * 音频管理器
 * 注意：微信要求首次触摸后才能播放音频。
 * 当前项目未附带音频资源，将 enabled 置为 false 时所有播放为空操作；
 * 后续把音频文件放进 audio/ 并补全 src 即可启用。
 */
const ENABLED = false;

let instance;

export default class AudioManager {
  constructor() {
    if (instance) return instance;
    instance = this;
    this.enabled = ENABLED;

    if (!this.enabled) return;

    this.bgm = wx.createInnerAudioContext();
    this.bgm.loop = true;
    this.bgm.src = 'audio/bgm.mp3';

    this.shoot = wx.createInnerAudioContext();
    this.shoot.src = 'audio/bullet.mp3';

    this.boom = wx.createInnerAudioContext();
    this.boom.src = 'audio/boom.mp3';
  }

  // 首次触摸后调用
  startBgm() {
    if (!this.enabled) return;
    this.bgm.play();
  }

  playShoot() {
    if (!this.enabled) return;
    this.shoot.seek(0);
    this.shoot.play();
  }

  playCatch() {
    if (!this.enabled) return;
    this.boom.seek(0);
    this.boom.play();
  }
}
