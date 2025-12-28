import { showFileView, clearClipboard, asyncUpdateDriveIndicator} from "./app.js";
import { scanRecordings } from "./gamerecording.js";

window.openAppMainPage = openAppMainPage;
window.openScanRecordingPage = openScanRecordingPage;

export async function openAppMainPage() {
  clearClipboard();
  showFileView();
  asyncUpdateDriveIndicator();
}

export async function openScanRecordingPage() {
  clearClipboard();
  scanRecordings();
}