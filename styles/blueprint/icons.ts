// 图标骨架：Iconify 开源图标（蓝图渲染用，白线勾勒）。许可逐条登记，随交付 MANIFEST 披露。
// bridge/car: Pictogrammers Free License (Apache-2.0)；tower: MDI 同许可。

export type IconDef = {viewBox: string; ds: string[]; license: string; source: string};

export const ICONS: Record<string, IconDef> = {
  bridge: {
    viewBox: "0 0 24 24", license: "Pictogrammers Free License (Apache-2.0)", source: "mdi:bridge via api.iconify.design",
    ds: ["M7 14v-3.09c-.72-.33-1.39-.73-2-1.2V14zm-2 4H3v-2H1v-2h2V7h2v1.43C6.8 10 9.27 11 12 11s5.2-1 7-2.57V7h2v7h2v2h-2v2h-2v-2H5zm12-7.09V14h2V9.71c-.61.47-1.28.87-2 1.2M16 14v-2.68c-.64.23-1.31.4-2 .52V14zm-3 0v-2.04L12 12l-1-.04V14zm-3 0v-2.16c-.69-.12-1.36-.29-2-.52V14z"],
  },
  tower: {
    viewBox: "0 0 24 24", license: "Pictogrammers Free License (Apache-2.0)", source: "mdi:transmission-tower via api.iconify.design",
    ds: ["m8.28 5.45l-1.78-.9L7.76 2h8.47l1.27 2.55l-1.78.89L15 4H9zM18.62 8h-4.53l-.79-3h-2.6l-.79 3H5.38L4.1 10.55l1.79.89l.73-1.44h10.76l.72 1.45l1.79-.89zm-.85 14H15.7l-.24-.9L12 15.9l-3.47 5.2l-.23.9H6.23l2.89-11h2.07l-.36 1.35L12 14.1l1.16-1.75l-.35-1.35h2.07zm-6.37-7l-.9-1.35l-1.18 4.48zm3.28 3.12l-1.18-4.48l-.9 1.36z"],
  },
  car: {
    viewBox: "0 0 24 24", license: "Pictogrammers Free License (Apache-2.0)", source: "mdi:car-side via api.iconify.design",
    ds: ["m16 6l3 4h2c1.11 0 2 .89 2 2v3h-2a3 3 0 0 1-3 3a3 3 0 0 1-3-3H9a3 3 0 0 1-3 3a3 3 0 0 1-3-3H1v-3c0-1.11.89-2 2-2l3-4zm-5.5 1.5H6.75L4.86 10h5.64zm1.5 0V10h5.14l-1.89-2.5zm-6 6A1.5 1.5 0 0 0 4.5 15A1.5 1.5 0 0 0 6 16.5A1.5 1.5 0 0 0 7.5 15A1.5 1.5 0 0 0 6 13.5m12 0a1.5 1.5 0 0 0-1.5 1.5a1.5 1.5 0 0 0 1.5 1.5a1.5 1.5 0 0 0 1.5-1.5a1.5 1.5 0 0 0-1.5-1.5"],
  },
};
