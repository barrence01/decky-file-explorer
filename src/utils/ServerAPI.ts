import { callable } from "@decky/api";

export interface ServerStatus {
  status: "online" | "offline";
  ipv4_address: string | null;
  port: number | null;
}

export interface ApiResponse<T = any> {
  success: boolean; 
  message: string;
  data: T;
}

export class ServerAPIService {

  // Server methods
  private getFileExplorerStatus = callable<[], ApiResponse<ServerStatus>>("get_file_explorer_status");
  private startFileExplorer = callable<[], ApiResponse<ServerStatus>>("start_file_explorer");
  private stopFileExplorer = callable<[], ApiResponse<ServerStatus>>("stop_file_explorer");
  
  // Settings methods
  private getServerSetting = callable<[key: string], ApiResponse>("get_server_setting");
  private getCredentialSetting = callable<[key: string], ApiResponse>("get_credential_setting");
  private saveServerUsername = callable<[value: string], ApiResponse>("save_user_username");
  private saveServerUserPassword = callable<[value: string], ApiResponse>("save_user_password");
  private saveServerSettings = callable<[key: string, value: any], ApiResponse>("save_server_settings");
  private resetSettings = callable<[], void>("reset_settings"); 
  
  // Logging methods
  private logInfo = callable<[msg: string], void>("logInfo");
  private logError = callable<[msg: string], void>("logError");

  // State
  private serverPort: number = 8082;
  private runStatus: boolean = false;
  private ipv4Address: string = "";

  private DEFAULT_SERVER_PORT: number = 8082;

  constructor() {
    // Initialize port from settings
    this.getPortFromSettings().catch(console.error);
  }

  // Server operations
  async getServerStatus(): Promise<ServerStatus> {
    const response = await this.getFileExplorerStatus();
    
    if (response.success && response.data) {
      this.runStatus = response.data.status === "online";
      if (response.data.ipv4_address) {
        this.ipv4Address = response.data.ipv4_address;
      }
      if (response.data.port !== null) {
        this.serverPort = response.data.port;
      }
      return response.data;
    }

    return {
      status: "offline",
      ipv4_address: null,
      port: await this.getPortFromSettings()
    };
  }

  async startServer(): Promise<ServerStatus> {
    const response = await this.startFileExplorer();
    
    if (response.success && response.data) {
      this.runStatus = response.data.status === "online";
      if (response.data.ipv4_address) {
        this.ipv4Address = response.data.ipv4_address;
      }
      if (response.data.port !== null) {
        this.serverPort = response.data.port;
      }
      return response.data;
    }
    
    return {
      status: "offline",
      ipv4_address: null,
      port: await this.getPortFromSettings()
    };
  }

  async stopServer(): Promise<ServerStatus> {
    const response = await this.stopFileExplorer();
    
    if (response.success && response.data) {
      this.runStatus = false;
      return response.data;
    }
    
    this.runStatus = false;
    return {
      status: "offline",
      ipv4_address: null,
      port: await this.getPortFromSettings()
    };
  }

  // Settings operations
  async getSetting(key: string): Promise<any> {
    const response = await this.getServerSetting(key);
    return response.success ? response.data : null;
  }

  async getCredential(key: string): Promise<any> {
    const response = await this.getCredentialSetting(key);
    return response.success ? response.data : null;
  }

  async saveSetting(key: string, value: any): Promise<boolean> {
    const response = await this.saveServerSettings(key, value);
    return response.success;
  }

  async saveUsername(value: any): Promise<boolean> {
    const response = await this.saveServerUsername(value);
    return response.success;
  }

  async savePassword(value: any): Promise<boolean> {
    const response = await this.saveServerUserPassword(value);
    return response.success;
  }

  async resetAllSettings(): Promise<void> {
    await this.resetSettings();
    // Reset local state
    this.serverPort = await this.getPortFromSettings();
    this.runStatus = false;
    this.ipv4Address = "";
  }

  // Convenience methods
  async getPortFromSettings(): Promise<number> {
    const port = await this.getSetting("port");
    if (port !== null && port !== undefined) {
      this.serverPort = Number(port) || this.DEFAULT_SERVER_PORT;
    }
    return this.serverPort;
  }

  async setPort(port: number): Promise<boolean> {
    const success = await this.saveSetting("port", port);
    if (success) {
      this.serverPort = port || this.DEFAULT_SERVER_PORT;
    }
    return success;
  }

  async getUsername(): Promise<string> {
    const username = await this.getCredential("user_login");
    return username || "admin";
  }

  async getBaseDir(): Promise<string> {
    const baseDir = await this.getSetting("base_dir");
    return baseDir || "";
  }

  // State getters
  isRunning(): boolean {
    return this.runStatus;
  }

  getCurrentPort(): number {
    return this.serverPort;
  }

  getCurrentIP(): string {
    return this.ipv4Address;
  }

  // Logging
  async info(message: string): Promise<void> {
    return await this.logInfo(message);
  }

  async error(message: string): Promise<void> {
    return await this.logError(message);
  }
}

export const serverAPI = new ServerAPIService();