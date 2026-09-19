import { Ionicons } from '@expo/vector-icons';
import { SpotCategory } from '../types';

export const CATEGORY_ICONS: Record<SpotCategory, keyof typeof Ionicons.glyphMap> = {
  coffee: 'cafe',
  matcha: 'leaf',
  dessert: 'ice-cream',
  brunch: 'egg',
  home_based: 'home',
  pop_up: 'flash',
  food_truck: 'car',
};

export const CATEGORY_LABELS: Record<SpotCategory, string> = {
  coffee: 'Cafe',
  matcha: 'Matcha & Tea',
  dessert: 'Dessert',
  brunch: 'Brunch',
  home_based: 'Home-Based',
  pop_up: 'Pop-Up',
  food_truck: 'Food Truck',
};

// Map-pin-only palette — distinct from the brand theme, just needs to be
// visually distinguishable per category at a glance on the map.
export const CATEGORY_COLORS: Record<SpotCategory, string> = {
  coffee: '#EE4C6A',
  matcha: '#8CAA7B',
  dessert: '#F5A623',
  brunch: '#E0954B',
  home_based: '#8B6FD1',
  pop_up: '#5B8DEF',
  food_truck: '#3FA7A0',
};
