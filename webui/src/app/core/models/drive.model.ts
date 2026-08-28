export interface DriveInfo {
  path: string;
  fstype: string;
  removable: boolean;
  transport: string;
}

export interface DriveListResponse {
  currentDrive: string;
  drives: DriveInfo[];
}
