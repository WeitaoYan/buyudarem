import { DESIGN_WIDTH } from './config';

// 微信小游戏主画布（首次 createCanvas 返回上屏画布）
const canvas = wx.createCanvas();
GameGlobal.canvas = canvas;

const winInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
const dpr = winInfo.pixelRatio || 1;

// 画布物理像素尺寸
canvas.width = winInfo.screenWidth * dpr;
canvas.height = winInfo.screenHeight * dpr;

// 以设计宽度 750 等比缩放到屏幕宽度
export const SCALE = winInfo.screenWidth / DESIGN_WIDTH;

// 可视设计区尺寸（设计坐标系下）
export const VIEW_WIDTH = DESIGN_WIDTH;
export const VIEW_HEIGHT = winInfo.screenHeight / SCALE;

// 顶部安全区（设计坐标系）
export const SAFE_TOP = (winInfo.safeArea ? winInfo.safeArea.top : 0) / SCALE;

export const ctx = canvas.getContext('2d');

// 把屏幕(CSS)坐标换算到设计坐标
export function toDesignX(clientX) {
  return clientX / SCALE;
}
export function toDesignY(clientY) {
  return clientY / SCALE;
}

// 每帧开始时重置变换：以设计坐标系绘制
export function beginFrame() {
  ctx.setTransform(SCALE * dpr, 0, 0, SCALE * dpr, 0, 0);
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
}
