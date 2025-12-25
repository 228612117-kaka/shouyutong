
export interface SignDetails {
  word: string;
  pinyin: string;
  definition: string;
  handShape: string;
  movement: string;
  location: string;
  tips: string;
}

export interface SavedSign extends SignDetails {
  imageUrl: string | null;
  updatedAt: number;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  MANAGE = 'MANAGE'
}
