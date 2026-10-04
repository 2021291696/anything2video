# 原生竖屏接线

传统模板 common 的 W/H/FPS、安全区、字幕与覆盖层按 1280×720 设计。仅修改 Composition 或 render 分辨率会留下错位/出界；新竖屏片使用新的内容和覆盖层坐标，不放大旧 Main 来伪装完成。

## 最小接线

先在 project.json 声明实际 width=1080、height=1920、fps、totalFrames 和 composition。在 src/Root.tsx 为真正的竖屏组件注册 Composition，尺寸和时间直接来自结构化声明。模板 tsconfig 已支持 resolveJsonModule；这个例子中的 NativeVideo 必须是你已实现并有完整 storyboard 的镜头树。

```tsx
import React from 'react';
import {Composition} from 'remotion';
import project from '../project.json';
import {NativeVideo} from './NativeVideo';

export const Root: React.FC = () => {
  if (!Number.isInteger(project.totalFrames) || !project.totalFrames || project.totalFrames < 1) {
    throw new Error('Declare the implemented draft/full duration before rendering');
  }
  return <Composition id={project.composition} component={NativeVideo}
    width={project.width} height={project.height} fps={project.fps}
    durationInFrames={project.totalFrames} />;
};
```

每个新镜头使用 useVideoConfig() 读取 width/height/fps，或一套明确竖屏常量；不要 import 历史 common 的 W/H 作为竖屏坐标。用静态 import 注册真实组件，Sequence 从 storyboard 的 from-1 开始，持续 to-from+1；组件内 useCurrentFrame 返回局部0起帧，需要全片1起帧时加 shot.from。

字体沿用授权文件与真实 FontFace 加载，不靠系统字体一定存在。新字幕与HUD也使用竖屏布局，避免引入旧横屏 Overlay。模板旧预览 Composition 可保留，但不能当竖屏审片结果。

## 多点验证

全分辨率分别渲开场、复杂中段、结尾，看正文、长命令、字幕与实际状态变化。保守关键信息区 x80–900、y180–1500，字幕 y1400–1570；这是制作建议而非平台官方UI数值。正常字至少42px、字幕48–56px；内容多先减信息再改布局。还需按设备实际发布预览复核。

render.mjs 拒绝 Composition 与 project.json 不一致。check-plan 核覆盖与文件，registration/visual/teaching 仍需对实际媒体查证。改 fps 后配音/章表、相位、拍点、硬编码帧常量同步重建，类型检查不能检测语义时轴错位。

本次缓存前向样片采用独立 CacheVideo + CacheScene，实渲1080×1920、30fps、480帧；它证明接线可用，不替代完整运动/听感或平台认证。
