import type {
  AccessoryId,
  CharacterDef,
  CosmeticDef,
  GlassesId,
  HatId,
  Loadout,
  SkinId,
} from '../../types/character';

export const CHARACTERS: CharacterDef[] = [
  { id: 'jelly', name: 'Jelly Blob', color: '#ff7ab8', accent: '#ffd1e8', shape: 'blob', cost: 0, blurb: 'Squishy and always smiling.' },
  { id: 'wobbler', name: 'Blue Wobbler', color: '#4aa8ff', accent: '#b7e0ff', shape: 'wobbler', cost: 0, blurb: 'The original wobbler. Very wobbly.' },
  { id: 'bean', name: 'Pink Bean', color: '#ff9ec2', accent: '#fff0f6', shape: 'bean', cost: 120, blurb: 'A tiny bean with big dreams.' },
  { id: 'alien', name: 'Green Alien', color: '#6bdc5a', accent: '#d8ffc9', shape: 'alien', cost: 200, blurb: 'Came for the race, stayed for the snacks.' },
  { id: 'duck', name: 'Yellow Duck', color: '#ffd93b', accent: '#ff9f1c', shape: 'duck', cost: 280, blurb: 'Waddles fast. Quacks louder.' },
  { id: 'monster', name: 'Purple Monster', color: '#9b6bff', accent: '#e4d6ff', shape: 'monster', cost: 360, blurb: 'Looks scary. Is not scary.' },
  { id: 'robot', name: 'Little Robot', color: '#b8c4d8', accent: '#46d6ff', shape: 'robot', cost: 450, blurb: 'Beep boop, obstacle course.' },
  { id: 'slime', name: 'Rainbow Slime', color: '#ff6bd6', accent: '#ffffff', shape: 'slime', cost: 600, blurb: 'Changes color when excited.' },
];

export const HATS: CosmeticDef<HatId>[] = [
  { id: 'none', name: 'No hat', cost: 0 },
  { id: 'party', name: 'Party Hat', cost: 60 },
  { id: 'tophat', name: 'Top Hat', cost: 110 },
  { id: 'propeller', name: 'Propeller Cap', cost: 140 },
  { id: 'crown', name: 'Crown', cost: 250 },
];

export const GLASSES: CosmeticDef<GlassesId>[] = [
  { id: 'none', name: 'No glasses', cost: 0 },
  { id: 'round', name: 'Round Specs', cost: 50 },
  { id: 'shades', name: 'Cool Shades', cost: 90 },
  { id: 'star', name: 'Star Glasses', cost: 130 },
];

export const ACCESSORIES: CosmeticDef<AccessoryId>[] = [
  { id: 'none', name: 'Nothing', cost: 0 },
  { id: 'bowtie', name: 'Bow Tie', cost: 70 },
  { id: 'scarf', name: 'Cozy Scarf', cost: 100 },
  { id: 'cape', name: 'Hero Cape', cost: 180 },
];

export const SKINS: CosmeticDef<SkinId>[] = [
  { id: 'classic', name: 'Classic', cost: 0 },
  { id: 'candy', name: 'Candy Swirl', cost: 150 },
  { id: 'ice', name: 'Frosty', cost: 200 },
  { id: 'gold', name: 'Golden', cost: 400 },
  { id: 'galaxy', name: 'Galaxy', cost: 500 },
];

export const TINTS = ['#ff4d6d', '#ff9f1c', '#ffd93b', '#6bdc5a', '#3ddbb0', '#4aa8ff', '#9b6bff', '#ff6bd6'];

export const DEFAULT_LOADOUT: Loadout = {
  hat: 'none',
  glasses: 'none',
  accessory: 'none',
  skin: 'classic',
  tint: null,
};

export const getCharacter = (id: string) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
