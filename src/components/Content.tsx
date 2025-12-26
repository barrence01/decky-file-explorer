import React, { useState, useEffect } from "react";
import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  showModal
} from "@decky/ui";
import { useServerAPI } from "../contexts/ServerAPIContext";
import { QRCodeSVG } from 'qrcode.react';
import SettingsModal from "./SettingsModal";

const Content: React.FC = () => {
  const api = useServerAPI();
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);


  useEffect(() => {
      fetchServerStatus();
      fetchSettings();
  }, []);

  const fetchServerStatus = async () => {
    let status = null;
    try {
      const status = await api.getServerStatus();
      setServerStatus(status);
    } catch (error) {
      await api.error(`Failed to fetch server status: ${error}`);
      await api.error(`Python return: ${status}`);
    }
  };

  const fetchSettings = async () => {
    try {
      const portResponse = await api.getSetting("port");
      const baseDirResponse = await api.getSetting("base_dir");
      
      setSettings({
        port: portResponse?.data || portResponse,
        baseDir: baseDirResponse?.data || baseDirResponse,
      });
    } catch (error) {
      await api.error(`Failed to fetch settings: ${error}`);
    }
  };

  const handleStartServer = async () => {
    setLoading(true);
    try {
      const result = await api.startServer();
      setServerStatus(result);
      if (result.status === "online") {
        await api.info(`Server started on ${result.ipv4_address}:${result.port}`);
      }
    } catch (error) {
      await api.error(`Failed to start server: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopServer = async () => {
    setLoading(true);
    try {
      const result = await api.stopServer();
      setServerStatus(result);
      await api.info("Server stopped");
    } catch (error) {
      await api.error(`Failed to stop server: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PanelSection title="Server Control">
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={fetchServerStatus}
            disabled={loading}
          >
            Refresh Status
          </ButtonItem>
        </PanelSectionRow>
        
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={handleStartServer}
            disabled={loading || serverStatus?.status === "online"}
          >
            {serverStatus?.status === "online" 
              ? `Server Running on ${serverStatus.ipv4_address}:${serverStatus.port}`
              : "Start Server"}
          </ButtonItem>
        </PanelSectionRow>
        
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={handleStopServer}
            disabled={loading || serverStatus?.status === "offline"}
          >
            Stop Server
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      {serverStatus?.status === "online" && (
        <PanelSection title="Server QR Code">
          <PanelSectionRow>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px'
            }}>
              <QRCodeSVG
                value={`http://${serverStatus.ipv4_address}:${serverStatus.port}`}
                size={256}
                level="H"
                includeMargin={true}
                style={{ marginBottom: '10px' }}
              />
              <div style={{ 
                fontSize: '14px', 
                textAlign: 'center',
                wordBreak: 'break-all',
                marginTop: '8px'
              }}>
                {`http://${serverStatus.ipv4_address}:${serverStatus.port}`}
              </div>
            </div>
          </PanelSectionRow>
        </PanelSection>
      )}

      <PanelSection title="Settings">
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={() => showModal(
              <SettingsModal 
                api={api}
                initialPort={settings.port || 8082}
                onSettingsSaved={fetchSettings}
              />, 
              window
            )}
          >
            Open Settings
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
};

export default Content;