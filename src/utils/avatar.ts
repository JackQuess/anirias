export type AvatarAnime = 'hsdxd' | 'jjk';

export type AvatarItem = {
  id: string;
  name: string;
  anime: AvatarAnime;
  image: string;
};

export const AVATARS: AvatarItem[] = [
  { id: 'hsdxd_female_blackhair', name: 'Akeno Himejima', anime: 'hsdxd', image: 'hsdxd_female_blackhair.webp' },
  { id: 'hsdxd_male_brownhair', name: 'Issei Hyoudou', anime: 'hsdxd', image: 'hsdxd_male_brownhair.webp' },
  { id: 'hsdxd_female_whitehair', name: 'Asia Argento', anime: 'hsdxd', image: 'hsdxd_female_whitehair.webp' },
  { id: 'hsdxd_female_redhair', name: 'Rias Gremory', anime: 'hsdxd', image: 'hsdxd_female_redhair.webp' },
  { id: 'hsdxd_female_orangehair', name: 'Xenovia Quarta', anime: 'hsdxd', image: 'hsdxd_female_orangehair.webp' },
  { id: 'jjk_itadori', name: 'Yuji Itadori', anime: 'jjk', image: 'jjk_itadori.webp' },
  { id: 'jjk_gojo', name: 'Satoru Gojo', anime: 'jjk', image: 'jjk_gojo.webp' },
  { id: 'jjk_megumi', name: 'Megumi Fushiguro', anime: 'jjk', image: 'jjk_megumi.webp' },
];

export const getAvatarSrc = (avatarId?: string | null) => {
  if (!avatarId) return '/avatars/default.webp';
  return `/avatars/${avatarId}.webp`;
};
