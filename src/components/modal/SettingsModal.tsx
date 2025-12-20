import React, { useCallback, useEffect, useState, FunctionComponent } from "react";
import { IoMdAlert } from "react-icons/io";
import {
  ButtonItem,
  TextField,
  ModalRoot,
  DialogHeader,
  DialogBody,
  Field,
  DialogSubHeader
} from "@decky/ui";

const SettingsModal: FunctionComponent<{  
  closeModal?: () => void, 
  api: any,
  initialPort: number,
  onSettingsSaved?: () => void
}> = ({ closeModal, api, initialPort, onSettingsSaved }) => {
  const [port, setPort] = useState(initialPort);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [baseDir, setBaseDir] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [invalidPortError, setInvalidPortError] = useState(false);
  const [invalidUsernameError, setInvalidUsernameError] = useState(false);
  const [invalidPasswordError, setInvalidPasswordError] = useState(false);
  const [portErrorMessage, setPortErrorMessage] = useState("");
  const [portSuccessMessage, setPortSuccessMessage] = useState("");
  const [portSaved, setPortSaved] = useState(false);
  const [usernamePasswordErrorMessage, setUsernamePasswordErrorMessage] = useState("");
  const [usernamePasswordSuccessMessage, setUsernamePasswordSuccessMessage] = useState("");
  const [usernamePasswordSaved, setUsernamePasswordSaved] = useState(false);
  const [baseDirErrorMessage, setBaseDirErrorMessage] = useState("");
  const [baseDirSuccessMessage, setBaseDirSuccessMessage] = useState("");
  const [baseDirSaved, setBaseDirSaved] = useState(false);

  const handleSavePort = useCallback(async () => {
    if (!port) {
      showError("port", "The field cannot be empty.");
      setInvalidPortError(true);
      return;
    }

    setIsSaving(true);
    if (!invalidPortError) {
      const success = await api.saveSetting("port", +port);
      if (success) {
        showSuccess("port", "Port number saved successfully.");
        onSettingsSaved?.();
      } else {
        showError("port", "Failed to save port number.");
      }
    }
    
    setIsSaving(false);
  }, [port, invalidPortError]);

  const handleSaveUsernamePassword = useCallback(async () => {
    if (!username && !password) {
      showError("usernameAndPassword", "The fields cannot be empty.");
      return;
    }
    if (!username) {
      showError("usernameAndPassword", "The username field cannot be empty.");
    }

    if (!password) {
      showError("usernameAndPassword", "The password field cannot be empty.");
    }

    if (!username || !password) {
      return;
    }

    setIsSaving(true);
    if (!invalidUsernameError && !invalidPasswordError) {

      const usernameSuccess = await api.saveUsername(username);
      const passwordSuccess = await api.savePassword(password);

      if (usernameSuccess && passwordSuccess) {
        showSuccess("usernameAndPassword", "Credentials changed successfully.");
        onSettingsSaved?.();
      } else {
        showError("usernameAndPassword", "Could not save credentials.");
      }
    }
    
    setIsSaving(false);
  }, [username, password, invalidUsernameError, invalidPasswordError]);

  const handleSaveBaseDir = useCallback(async () => {
    setIsSaving(true);

    const success = await api.saveSetting("base_dir", baseDir);
    if (success) {
      api.info("Base directory saved successfully.");
      showSuccess("baseDir", "Base directory saved successfully.");
      onSettingsSaved?.();
    } else {
      api.error("Failed to save base directory.");
      showError("baseDir", "Failed to save base directory.");
    }
    setIsSaving(false);
  }, [baseDir]);

  const handlePortChange = (e: any) => {
    const value = e.target.value;
    setPort(value);
    showError("port", "");
    setInvalidPortError(true);

    if (!value) {
      return;
    }

    if (value.length > 5) {
      setPort(value.substring(0, 5));
      return;
    }

    const isNumeric = !isNaN(+value)
    if (!isNumeric) {
      showError("port", "The port number must be numeric.")
      return;
    }
    
    const portNumber = +value;

    // Decky uses port 1337
    if (portNumber == 1337) {
      showError("port", "The port number 1337 cannot be used because it's already being used by decky.")
      return;
    }

    // To use a port equal or lower than 1024 on Linux, you need root access
    if (portNumber < 1024) {
      showError("port", "The port number must be higher than 1024.")
      return;
    }
    if (portNumber > 65535) {
      showError("port", "The port number must be lower than 65536.")
      return;
    }

    setInvalidPortError(false);
  };

  const handleUsernameChange = (e: any) => {
    const value = e.target.value;
    setUsername(value);
    showError("usernameAndPassword", "");
    setInvalidUsernameError(true);

    if (!value) {
      return;
    }

    if (value.length > 20) {
      setUsername(value.substring(0, 20));
      return;
    }

    if (value.length < 4) {
      showError("usernameAndPassword", "The username length can't be less than 4 characters.")
      return;
    }

    setInvalidUsernameError(false);
  };

  const handlePasswordChange = (e: any) => {
    const value = e.target.value;
    setPassword(value);
    showError("usernameAndPassword", "");
    setInvalidPasswordError(true);

    if (!value) {
      return;
    }

    if (value.length > 20) {
      setPassword(value.substring(0, 20));
      return;
    }

    if (value.length < 4) {
      showError("usernameAndPassword", "The password length can't be less than 4 characters.")
      return;
    }

    setInvalidPasswordError(false);
  };

  const handleBaseDirChange = (e: any) => {
    setBaseDir(e.target.value);
  };

  const showError = (field: string, message: string) => {
    switch(field) {
      case "port":
        setPortSuccessMessage("");
        setPortErrorMessage(message);
        break;
      case "usernameAndPassword":
        setUsernamePasswordSuccessMessage("");
        setUsernamePasswordErrorMessage(message);
        break;
      case "baseDir":
        setBaseDirSuccessMessage("");
        setBaseDirErrorMessage(message);
        break;
      default:
        break;
    }
  };

  const showSuccess = (field: string, message: string) => {
    switch(field) {
      case "port":
        setPortErrorMessage("");
        setPortSuccessMessage(message);
        setPortSaved(true);
        setTimeoutClearMessage(setPortSuccessMessage);
        setTimeoutClearSaved(setPortSaved);
        break;
      case "usernameAndPassword":
        setUsernamePasswordErrorMessage("");
        setUsernamePasswordSuccessMessage(message);
        setUsernamePasswordSaved(true);
        setTimeoutClearMessage(setUsernamePasswordSuccessMessage);
        setTimeoutClearSaved(setPortSaved);
        break;
      case "baseDir":
        setBaseDirErrorMessage("");
        setBaseDirSuccessMessage(message);
        setBaseDirSaved(true);
        setTimeoutClearMessage(setBaseDirSuccessMessage);
        setTimeoutClearSaved(setBaseDirSaved);
        break;
      default:
        break;
    }
  };

  const setTimeoutClearMessage = (functionCallback: any) => {
    setTimeout(() => { 
      functionCallback("");
    }, 3000);
  }

  const setTimeoutClearSaved = (functionCallback: any) => {
    setTimeout(() => { 
      functionCallback(false);
    }, 3000);
  }

  useEffect(() => {
    const loadDefaults = async () => {
      const _username = await api.getUsername();
      setUsername(_username);
      const _baseDir = await api.getBaseDir();
      setBaseDir(_baseDir);
    };

    loadDefaults();  
  }, []);

  const handleResetSettings = useCallback(async () => { 
    await api.resetAllSettings();
    setPort(initialPort);
    const _username = await api.getUsername();
    setUsername(_username);
    const _baseDir = await api.getBaseDir();
    setBaseDir(_baseDir);
    onSettingsSaved?.();
  }, [initialPort]);

  return (
    <ModalRoot closeModal={closeModal}>
      <DialogHeader>File Explorer Settings</DialogHeader>
      
      <DialogSubHeader>Change port number</DialogSubHeader>
      <DialogBody>
        <Field label="Port" 
          bottomSeparator="none"
          icon={invalidPortError ? <IoMdAlert size={20} color="red"/> : null}>
          <TextField
            description="TCP port used for connection."
            onChange={handlePortChange}
            value={port.toString()}
            style={{
              border: invalidPortError ? "1px red solid" : undefined
            }}
          />
        </Field>
        {portErrorMessage && (
          <div style={{ color: 'red', fontWeight: '300', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
            {portErrorMessage}
          </div>
        )}
        {portSuccessMessage && (
          <div style={{ color: 'green', fontWeight: 'bold', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
            {portSuccessMessage}
          </div>
        )}
        <ButtonItem onClick={handleSavePort} disabled={isSaving}>
          {portSaved ? "✓ Saved" : "Save Port"}
        </ButtonItem>
      </DialogBody>

      <DialogSubHeader>Change credentials</DialogSubHeader>
      <DialogBody>
        <Field label="Username" 
          bottomSeparator="none"
          icon={invalidUsernameError ? <IoMdAlert size={20} color="red"/> : null}>
          <TextField
            description="Set the username for the file browser."
            onChange={handleUsernameChange}
            value={username}
            style={{
              border: invalidUsernameError ? "1px red solid" : undefined
            }}
          />
        </Field>
        <Field label="Password"
          bottomSeparator="none"
          icon={invalidPasswordError ? <IoMdAlert size={20} color="red"/> : null}>
          <TextField
            description="Set the password for the file browser."
            onChange={handlePasswordChange}
            value={password}
            bIsPassword={true}
            style={{
              border: invalidPasswordError ? "1px red solid" : undefined
            }}
          />
        </Field>
        {usernamePasswordErrorMessage && (
          <div style={{ color: 'red', fontWeight: '300', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
            {usernamePasswordErrorMessage}
          </div>
        )}
        {usernamePasswordSuccessMessage && (
          <div style={{ color: 'green', fontWeight: 'bold', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
            {usernamePasswordSuccessMessage}
          </div>
        )}
        <ButtonItem onClick={handleSaveUsernamePassword} disabled={isSaving}>
          {usernamePasswordSaved ? "✓ Saved" : "Save Credentials"}
        </ButtonItem>
      </DialogBody>

      <DialogSubHeader>Base Directory</DialogSubHeader>
      <DialogBody>
        <Field label="Base Directory">
          <TextField
            description="Default directory for file browsing."
            onChange={handleBaseDirChange}
            value={baseDir}
          />
        </Field>

        {baseDirErrorMessage && (
          <div style={{ color: 'red', fontWeight: '300', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
            {baseDirErrorMessage}
          </div>
        )}
        {baseDirSuccessMessage && (
          <div style={{ color: 'green', fontWeight: 'bold', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
            {baseDirSuccessMessage}
          </div>
        )}

        <ButtonItem 
          onClick={handleSaveBaseDir} 
          disabled={isSaving}>
          {baseDirSaved ? "✓ Saved" : "Save Directory"}
        </ButtonItem>
      </DialogBody>

      <DialogBody style={{ marginTop: "1%" }}>
        <ButtonItem onClick={handleResetSettings} bottomSeparator="none">
          Reset All Settings
        </ButtonItem>
      </DialogBody>
    </ModalRoot>
  );
};

export default SettingsModal;