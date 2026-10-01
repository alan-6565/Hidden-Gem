import { ImageSourcePropType } from 'react-native';

// Storefront and menu images are normally uploaded URLs. The three showcase
// storefronts (supabase/scripts/seed_showcase_storefronts.sql) reference
// images bundled with the app instead, as `showcase:<key>`, so they work
// without uploading anything to Storage.
const SHOWCASE: Record<string, ImageSourcePropType> = {
  'solsteam-cover': require('../../assets/showcase/solsteam-cover.jpg'),
  'solsteam-logo': require('../../assets/showcase/solsteam-logo.jpg'),
  zebra: require('../../assets/showcase/zebra.jpg'),
  drink: require('../../assets/showcase/drink.jpg'),
  'taza-logo': require('../../assets/showcase/taza-logo.jpg'),
  'taza-hero': require('../../assets/showcase/taza-hero.jpg'),
  'chismesito-hero': require('../../assets/showcase/chismesito-hero.jpg'),
  'chismesito-logo': require('../../assets/showcase/chismesito-logo.jpg'),
  'chismesito-gallery-matcha': require('../../assets/showcase/chismesito-gallery-matcha.jpg'),
  'chismesito-about-drinks': require('../../assets/showcase/chismesito-about-drinks.jpg'),
  'chismesito-bakery': require('../../assets/showcase/chismesito-bakery.jpg'),
  'chismesito-trending': require('../../assets/showcase/chismesito-trending.jpg'),
};

export function imageSource(src: string | null | undefined): ImageSourcePropType | null {
  if (!src) return null;
  if (src.startsWith('showcase:')) return SHOWCASE[src.slice('showcase:'.length)] ?? null;
  return { uri: src };
}
