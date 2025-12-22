import { useState, useCallback } from "react";
import { useTimedFeedback } from "./useTimedFeedback";
import { ServerAPIService } from "../../utils/ServerAPI";

export function usePortSetting(api: ServerAPIService, initialPort: number, onSaved?: () => void) {
  const [port, setPort] = useState(initialPort);
  const [invalid, setInvalid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const feedback = useTimedFeedback();

  const validate = (value: string) => {
    feedback.showError("");
    setInvalid(true);

    if (!value) {
      return;
    };

    if (value.length > 5) { 
      setPort(Number(value.substring(0, 5)));
      return; 
    }

    const num = +Number(value);
    if (isNaN(num)) {
      feedback.showError("The port number must be numeric.");
      return;
    }
    if (num === 1337) {
      feedback.showError("Port 1337 is reserved by Decky.");
      return;
    }
    if (num < 1024 || num > 65535) {
      feedback.showError("Port must be between 1024 and 65535.");
      return;
    }

    setInvalid(false);
  };

  const save = useCallback(async () => {
    api.info("Calling usePortSetting")
    if (invalid) {
      return;
    };

    setIsSaving(true);
    const success = await api.saveSetting("port", Number(port));
    if (success) {
      feedback.showSuccess("Port saved successfully.");
      onSaved?.();
    } else {
      feedback.showError("Failed to save port.");
    }

    setIsSaving(false); 
  }, [port, invalid]);

  return {
    port,
    setPort,
    invalid,
    validate,
    save,
    feedback,
    isSaving
  };
}
