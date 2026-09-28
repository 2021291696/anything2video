import React from 'react';
import {Stage} from '../../Main';
import {SHOTS_OVERLAY, SHOTS_OVERLAY_TOP, BG_OVERLAY} from '../../overlay';
import {VIDEO} from '../../config';
import {SHOTS_G4, BG_G4, FOOTAGE_G4} from './index';
// promo 时过滤 explainer 覆盖层（片头卡/章节卡/片尾压黑会盖进组预览，09-28 shotcraft-promo 实测）
const OV = VIDEO.recipe === 'promo' ? [] : SHOTS_OVERLAY;
const OVT = VIDEO.recipe === 'promo' ? [] : SHOTS_OVERLAY_TOP;
export const PreviewG4: React.FC = () => <Stage shots={[...OV, ...SHOTS_G4, ...OVT]} bg={[...BG_OVERLAY, ...BG_G4]} footage={FOOTAGE_G4} />;
