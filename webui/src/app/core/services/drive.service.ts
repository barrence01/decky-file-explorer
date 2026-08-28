import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DriveListResponse } from '../models/drive.model';

@Injectable({ providedIn: 'root' })
export class DriveService {
  constructor(private readonly http: HttpClient) {}

  listDrives(path?: string | null): Promise<DriveListResponse> {
    return firstValueFrom(
      this.http.post<DriveListResponse>(
        '/api/drives/list',
        { path },
        { withCredentials: true }
      )
    );
  }
}
