// 词级点亮字幕（v3.9.0 配方层四件套之一；机制借鉴 lanshu-create-ai-presenter-video，MIT——Remotion 重写）。
// 数据底料：tts_build.py 写进 src/common/subs.ts 的 SubEntry.chars（逐字符起始帧，edge=实测词边界，kokoro=块内线性估计）。
// 每字符在 chars[i] 起 litFade 帧内由未读态过渡到已读态（easeOutQuad）；窗口 to 帧起 outFade 帧整体淡出。
// 未读态：缺省=已读色 38% 透明度（同色深浅，适合任意皮肤）；传 unlitColor 时改为「未读幽灵垫底+已读色淡入覆盖」双层。
// 帧号口径：chars/N/to 全部绝对帧（模板惯例 1 起）。Sequence 内使用时 N = fromN + useCurrentFrame()（同 SubtitleLine 约定）。
// 本组件与 Subtitle.tsx 互不替代：Subtitle 是全片默认字幕带；WordLitCaption 供整片卡拉OK风格或重点句升级时按块选用。
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {clamp01, easeOutQuad} from '../easing';

export const WordLitCaption: React.FC<{
  text: string;
  chars: number[];
  N?: number;
  to?: number;
  litFade?: number;
  outFade?: number;
  size?: number;
  color?: string;
  unlitColor?: string;
  weight?: number;
  fontFamily?: string;
  style?: React.CSSProperties;
}> = ({text, chars, N: nProp, to, litFade = 5, outFade = 8, size = 44, color = '#FFFFFF', unlitColor, weight = 700, fontFamily = `'Noto Sans SC', 'PingFang SC', sans-serif`, style}) => {
  const rel = useCurrentFrame();
  const N = nProp ?? rel + 1;
  const end = to ?? (chars.length ? chars[chars.length - 1] + 36 : N);
  const outP = outFade > 0 ? clamp01((end - N) / outFade) : 1;
  if (N > end || outP <= 0) return null;
  const font: React.CSSProperties = {whiteSpace: 'pre', fontFamily, fontWeight: weight, fontSize: size, ...style};
  if (!chars.length) return <div style={{...font, opacity: outP}}>{text}</div>;
  return (
    <div style={{...font, opacity: outP}}>
      {Array.from(text).map((ch, i) => {
        const f0 = chars[i] ?? chars[0];
        const lit = easeOutQuad(clamp01((N - f0) / Math.max(1, litFade)));
        return (
          <span key={i} style={{position: 'relative'}}>
            {unlitColor && <span aria-hidden style={{position: 'absolute', left: 0, color: unlitColor}}>{ch}</span>}
            <span style={{position: 'relative', color, opacity: unlitColor ? lit : 0.38 + 0.62 * lit}}>{ch}</span>
          </span>
        );
      })}
    </div>
  );
};
