export type BannerItem = {
  id: string;
  src: string;
  name?: string;
};

export const BANNERS: BannerItem[] = [
  { id: 'jjk_gojo', src: '/banners/jjk_gojo_banner.webp', name: 'Gojo' },
  { id: 'slime_rimuru', src: '/banners/slime_rimuru_banner.webp', name: 'Rimuru' },
  { id: 'hsdxd_rias', src: '/banners/hsdxd_rias_banner.webp', name: 'Rias' },
];

export const getBannerSrc = (bannerId?: string | null) => {
  if (!bannerId) return BANNERS[0].src;
  const found = BANNERS.find(b => b.id === bannerId);
  return found?.src || BANNERS[0].src;
};
