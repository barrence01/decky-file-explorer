import { useEffect, useState, useCallback } from "react";
import { useTimedFeedback } from "./useTimedFeedback";
import { ServerAPIService } from "../../utils/ServerAPI";

export function useBaseDirSetting(api: ServerAPIService, onSaved?: () => void) {
    const [baseDir, setBaseDir] = useState("");
    const [invalid, setInvalid] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const feedback = useTimedFeedback();

    useEffect(() => {
        const loadDefaults = async () => {
            const _baseDir = await api.getBaseDir();
            setBaseDir(_baseDir);
        };

        loadDefaults();  
    }, []);
  
    const validate = async (value: string) => {
        feedback.showError("");
        setInvalid(true);

        if (!value || value.trim() === "") {
            feedback.showError("Base directory cannot be empty.");
            return;
        }

        if (value.trim() === "/") {
            feedback.showError("Base directory cannot be the root directory.");
            return;
        }

        if (!value.startsWith("/")) { 
            feedback.showError("Base directory must be an absolute path.");
            return; 
        }

        // Check if the directory exists
        const pathExists = await api.checkPathExists(value);
        if (!pathExists) {
            feedback.showError("The specified base directory does not exist.");
            return;
        }

        setInvalid(false);
    };

    const save = useCallback(async () => {
        api.info("Calling useBaseDirSetting")
        if (invalid) {
            return;
        }

        setIsSaving(true);
        const success = await api.saveSetting("base_dir", baseDir);
        if (success) {
            feedback.showSuccess("Base directory saved successfully.");
            onSaved?.();
        } else {
            feedback.showError("Failed to save base directory.");
        }

        setIsSaving(false); 
    }, [baseDir, invalid]);

    return {
        baseDir,
        setBaseDir,
        invalid,
        validate,
        save,
        feedback,
        isSaving
    };
}
