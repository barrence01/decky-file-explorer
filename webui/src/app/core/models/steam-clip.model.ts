export interface SteamClip {
  userId: string;
  clipId: string;
  basePath: string;
  videoDir: string;
  mpd: string;
  thumbnail: string | null;
  hasAudio: boolean;
}

export interface SteamClipListResponse {
  count: number;
  clips: SteamClip[];
}

export interface AssembleClipRequest {
  mpd: string;
  overwrite: boolean;
  browser_compatible: boolean;
}

export interface AssembleClipResponse {
  status: string;
  output: string;
  overwritten: boolean;
}
