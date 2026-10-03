import React from 'react';

/**
 * 传统朱砂印章与竖排书法题字（OPUS 134–160s 家谱章右上角同型）：
 * - title: 竖排衬线大字（如「家谱」、「序章」、「源流」）
 * - stampText: 红色方印内的字符（如「OPUS」、「开物」、「天工」）
 * - 印章带斑驳微做旧双边框（天然印泥感）
 */
export const SealStamp: React.FC<{
  title?: string;
  stampText: string;
  accent?: string;
  textColor?: string;
  style?: React.CSSProperties;
}> = ({
  title,
  stampText,
  accent = '#C43C2E',
  textColor = '#2B2419',
  style
}) => {
  return (
    <div style={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      pointerEvents: 'none',
      userSelect: 'none',
      ...style
    }}>
      {title && (
        <div style={{
          writingMode: 'vertical-rl',
          fontFamily: `'Noto Serif SC', 'Songti SC', serif`,
          fontWeight: 900,
          fontSize: 32,
          letterSpacing: 10,
          color: textColor,
          marginBottom: 14,
          textShadow: '0 1px 2px rgba(0,0,0,0.12)'
        }}>
          {title}
        </div>
      )}
      <div style={{
        position: 'relative',
        border: `2px solid ${accent}`,
        padding: '4px 8px',
        borderRadius: 2,
        boxShadow: `inset 0 0 0 1px ${accent}33, 0 1px 4px rgba(196,60,46,0.15)`,
        background: 'rgba(196,60,46,0.03)'
      }}>
        <div style={{
          fontFamily: `'Fraunces', 'Georgia', serif`,
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: 2,
          color: accent,
          textTransform: 'uppercase'
        }}>
          {stampText}
        </div>
        {/* 印泥四个小角点缀 */}
        <div style={{position: 'absolute', left: 1, top: 1, width: 2, height: 2, background: accent, opacity: 0.6}} />
        <div style={{position: 'absolute', right: 1, top: 1, width: 2, height: 2, background: accent, opacity: 0.6}} />
        <div style={{position: 'absolute', left: 1, bottom: 1, width: 2, height: 2, background: accent, opacity: 0.6}} />
        <div style={{position: 'absolute', right: 1, bottom: 1, width: 2, height: 2, background: accent, opacity: 0.6}} />
      </div>
    </div>
  );
};
