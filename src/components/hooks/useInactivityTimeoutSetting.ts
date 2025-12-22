import { useEffect, useState, useCallback } from "react";
import { useTimedFeedback } from "./useTimedFeedback";
import { ServerAPIService } from "../../utils/ServerAPI";

export function useInactivityTimeoutSetting(api: ServerAPIService, onSaved?: () => void) {
    const [shutdownTimeout, setShutdownTimeout] = useState(600);
    const [invalid, setInvalid] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const feedback = useTimedFeedback();

    useEffect(() => {
        const loadDefaults = async () => {
            const _timeout = await api.getShutdownTimeoutFromSettings();
            setShutdownTimeout(_timeout);
        };

        loadDefaults();  
    }, []);
  
    const validate = (value: string) => {
        feedback.showError("");
        setInvalid(true);

        if (!value) {
            feedback.showError("Timeout cannot be empty.");
            return;
        }

        if (isNaN(+value)) {
            feedback.showError("Timeout must be a number.");
            return;
        }

        const seconds = +value;

        if (seconds < 15) {
            feedback.showError("Minimum timeout is 15 seconds.");
            return;
        }

        if (seconds > 86400) {
            feedback.showError("Maximum timeout is 86400 seconds (24h).");
            return;
        }

        setInvalid(false);
    };

    const save = useCallback(async () => {
        api.info("Calling useInactivityTimeoutSetting")
        if (invalid) {
            return;
        }

        setIsSaving(true);
        const success = await api.setShutdownTimeoutSettings(shutdownTimeout);
        if (success) {
            feedback.showSuccess("Base directory saved successfully.");
            onSaved?.();
        } else {
            feedback.showError("Failed to save base directory.");
        }

        setIsSaving(false); 
    }, [shutdownTimeout, invalid]);

    return {
        shutdownTimeout,
        setShutdownTimeout,
        invalid,
        validate,
        save,
        feedback,
        isSaving
    };
}
