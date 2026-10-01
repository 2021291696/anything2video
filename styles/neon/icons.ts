// 图标骨架：Iconify 开源图标（霓虹夜城渲染用，白芯彩晕）。许可逐条登记，随交付 MANIFEST 披露。
// 全部为 Pictogrammers Free License (Apache-2.0)，来源 mdi:* via api.iconify.design。

export type IconDef = {viewBox: string; ds: string[]; license: string; source: string};

export const ICONS: Record<string, IconDef> = {
  city: {
    viewBox: "0 0 24 24", license: "Pictogrammers Free License (Apache-2.0)", source: "mdi:city via api.iconify.design",
    ds: ["M19 15h-2v-2h2m0 6h-2v-2h2M13 7h-2V5h2m0 6h-2V9h2m0 6h-2v-2h2m0 6h-2v-2h2m-6-6H5V9h2m0 6H5v-2h2m0 6H5v-2h2m8-6V5l-3-3l-3 3v2H3v14h18V11z"],
  },
  cocktail: {
    viewBox: "0 0 24 24", license: "Pictogrammers Free License (Apache-2.0)", source: "mdi:glass-cocktail via api.iconify.design",
    ds: ["m7.5 7l-2-2h13l-2 2M11 13v6H6v2h12v-2h-5v-6l8-8V3H3v2z"],
  },
  car: {
    viewBox: "0 0 24 24", license: "Pictogrammers Free License (Apache-2.0)", source: "mdi:car-side via api.iconify.design",
    ds: ["m16 6l3 4h2c1.11 0 2 .89 2 2v3h-2a3 3 0 0 1-3 3a3 3 0 0 1-3-3H9a3 3 0 0 1-3 3a3 3 0 0 1-3-3H1v-3c0-1.11.89-2 2-2l3-4zm-5.5 1.5H6.75L4.86 10h5.64zm1.5 0V10h5.14l-1.89-2.5zm-6 6A1.5 1.5 0 0 0 4.5 15A1.5 1.5 0 0 0 6 16.5A1.5 1.5 0 0 0 7.5 15A1.5 1.5 0 0 0 6 13.5m12 0a1.5 1.5 0 0 0-1.5 1.5a1.5 1.5 0 0 0 1.5 1.5a1.5 1.5 0 0 0 1.5-1.5a1.5 1.5 0 0 0-1.5-1.5"],
  },
  music: {
    viewBox: "0 0 24 24", license: "Pictogrammers Free License (Apache-2.0)", source: "mdi:music-note-eighth via api.iconify.design",
    ds: ["M12 3v10.55c-.59-.34-1.27-.55-2-.55c-2.21 0-4 1.79-4 4s1.79 4 4 4s4-1.79 4-4V7h4V3z"],
  },
  home: {
    viewBox: "0 0 24 24", license: "Pictogrammers Free License (Apache-2.0)", source: "mdi:home-outline via api.iconify.design",
    ds: ["m12 5.69l5 4.5V18h-2v-6H9v6H7v-7.81zM12 3L2 12h3v8h6v-6h2v6h6v-8h3"],
  },
};
