import { showFileView, clearClipboard } from "./app.js";
import { scanRecordings } from "./gamerecording.js";

window.openAppMainPage = openAppMainPage;
window.openScanRecordingPage = openScanRecordingPage;

export async function openAppMainPage() {
  clearClipboard();
  showFileView();
}

export async function openScanRecordingPage() {
  clearClipboard();
  scanRecordings();
}