import { Collection, User } from '../types';

export const currentUser: User = {
  id: 'user-1',
  name: 'You',
  avatar: 'https://i.pravatar.cc/150?img=47',
  savedSpotIds: ['spot-1', 'spot-4'],
  collectionIds: ['col-1'],
};

export const collections: Collection[] = [
  {
    id: 'col-1',
    name: 'Best Matcha in the Bay',
    description: 'Spots worth the trip for a good matcha.',
    spotIds: ['spot-1'],
  },
  {
    id: 'col-2',
    name: 'Cheap Eats Under $10',
    description: 'Good food that will not break the bank.',
    spotIds: ['spot-5', 'spot-6'],
  },
];
