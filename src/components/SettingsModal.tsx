import { useCallback, FunctionComponent } from "react";
import {
  ModalRoot,
  DialogHeader,
  DialogSubHeader,
  ButtonItem,
  DialogBody
} from "@decky/ui";

import { usePortSetting } from "./hooks/usePortSetting";
import { PortSettings } from "./PortSettings";

import { useCredentialSetting } from "./hooks/useCredentialSetting";
import { CredentialSettings } from "./CredentialSettings";

import { useBaseDirSetting } from "./hooks/useBaseDirSetting";
import { BaseDirSettings } from "./BaseDirSettings";

import { useInactivityTimeoutSetting } from "./hooks/useInactivityTimeoutSetting";
import { InactivityTimeoutSettings } from "./InactivityTimeoutSettings";

const SettingsModal: FunctionComponent<{  
  closeModal?: () => void, 
  api: any,
  initialPort: number,
  onSettingsSaved?: () => void
}> = ({ closeModal, api, initialPort, onSettingsSaved }) => {

  const portHook = usePortSetting(api, initialPort, onSettingsSaved);
  const credentialHook = useCredentialSetting(api, onSettingsSaved);
  const baseDirHook = useBaseDirSetting(api, onSettingsSaved);
  const inactivityTimeoutHook = useInactivityTimeoutSetting(api, onSettingsSaved);

  const handleResetSettings = useCallback(async () => { 
    await api.resetAllSettings();
    closeModal?.();
  }, []);

  return (
    <ModalRoot closeModal={closeModal}>
      <DialogHeader>File Explorer Settings</DialogHeader>

      <DialogSubHeader>Change port number</DialogSubHeader>
      <PortSettings hook={portHook} />

      <DialogSubHeader>Change credentials</DialogSubHeader>
      <CredentialSettings hook={credentialHook} />

      <DialogSubHeader>Base Directory</DialogSubHeader>
      <BaseDirSettings hook={baseDirHook} />

      <DialogSubHeader>Auto shutdown</DialogSubHeader>
      <InactivityTimeoutSettings hook={inactivityTimeoutHook} />

      <DialogBody style={{ marginTop: "1%" }}>
        <ButtonItem onClick={handleResetSettings} bottomSeparator="none">
          Reset All Settings
        </ButtonItem>
      </DialogBody>
    </ModalRoot>
  );
};

export default SettingsModal;