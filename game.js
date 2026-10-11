import { preload } from './js/runtime/images';
import Main from './js/main';

// 贴图加载完成后再启动（个别贴图加载失败会自动回退到程序化绘制）
preload().then(() => {
  new Main();
});
