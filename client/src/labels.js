export const STATUS = {
  venue_claim: {
    label: 'Venue says halal',
    tone: 'ok',
    help: 'The business itself advertises halal meat on its website, menu, delivery app or in its name.'
  },
  third_party_listing: {
    label: 'Listed by halal guides',
    tone: 'mid',
    help: 'A halal directory or travel guide lists it. Nobody from this site has visited yet.'
  },
  customer_reports: {
    label: 'Customers say halal',
    tone: 'low',
    help: 'Customer reviews mention halal, but the business itself does not advertise it. Ask before you buy.'
  }
};

export const TYPE = { butcher: 'Butcher', shop: 'Shop', online: 'Online delivery', restaurant: 'Restaurant' };
export const SELLER_TYPES = ['butcher', 'shop', 'online'];

export const GROUPS = {
  sellers: { label: 'Butchers & shops', short: 'Buy meat' },
  restaurants: { label: 'Restaurants', short: 'Eat out' }
};

export const MEATS = ['chicken', 'beef', 'lamb', 'goat'];
export const MEAT_ICON = { chicken: '🐔', beef: '🐄', lamb: '🐑', goat: '🐐' };

// Cover art for places that don't have a photo yet, keyed by the main meat.
export const COVER = {
  chicken: ['#F4B23E', '#F79A3E', '#3A1D05'],
  beef: ['#F06A5D', '#C2304F', '#FFF4F2'],
  lamb: ['#7FD8B6', '#3FA98A', '#08291F'],
  goat: ['#7FD8B6', '#3FA98A', '#08291F'],
  none: ['#6B2C70', '#2B0F2E', '#FBE9FB']
};
// Places with unconfirmed meats rotate through darker variants so neighbours differ.
const UNKNOWN = [
  ['#6B2C70', '#2B0F2E', '#FBE9FB'],
  ['#8A2C4E', '#3A0F24', '#FFE9EF'],
  ['#2F6F64', '#123A34', '#E6FBF4'],
  ['#9A5A1E', '#3D1F08', '#FFF1DE']
];
export const coverFor = (p) => {
  if (p.meats?.length) return COVER[p.meats[0]] ?? COVER.none;
  const h = [...p.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return UNKNOWN[h % UNKNOWN.length];
};
