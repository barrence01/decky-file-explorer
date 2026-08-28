import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  AssembleClipRequest,
  AssembleClipResponse,
  SteamClipListResponse,
} from '../models/steam-clip.model';
import { ApiError } from '../models/api-error.model';

@Injectable({ providedIn: 'root' })
export class GameRecordingService {
  constructor(private readonly http: HttpClient) {}

  listClips(): Promise<SteamClipListResponse> {
    return firstValueFrom(
      this.http.get<SteamClipListResponse>('/api/steam/clips', {
        withCredentials: true,
      })
    );
  }

  getThumbnailUrl(clipId: string): string {
    return `/api/steam/clips/thumbnail/${encodeURIComponent(clipId)}`;
  }

  async assembleClip(request: AssembleClipRequest): Promise<AssembleClipResponse> {
    try {
      return await firstValueFrom(
        this.http.post<AssembleClipResponse>(
          '/api/steam/clips/assemble',
          request,
          { withCredentials: true }
        )
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        throw new ApiError('conflict', 409);
      }
      throw error;
    }
  }
}
