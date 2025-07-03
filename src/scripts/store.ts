// store.ts
import { atom } from 'nanostores';

export const $counter = atom(0);
export const $ensResAddr = atom('')

export const increase = () => {
  $counter.set($counter.get() + 1);
}
