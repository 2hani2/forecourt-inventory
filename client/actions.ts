import type { Vehicle } from './api';
export type Action =
  | { type: 'purchase' | 'delete' | 'restock'; vehicle: Vehicle }
  | { type: 'edit'; vehicle?: Vehicle }
  | { type: 'help' };
