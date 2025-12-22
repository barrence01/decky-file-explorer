import { useEffect, useState, useCallback } from "react";
import { useTimedFeedback } from "./useTimedFeedback";
import { ServerAPIService } from "../../utils/ServerAPI";

export function useCredentialSetting(api: ServerAPIService, onSaved?: () => void) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [invalidUsername, setInvalidUsername] = useState(false);
    const [invalidPassword, setInvalidPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const feedback = useTimedFeedback();

    useEffect(() => {
        const loadDefaults = async () => {
            const _username = await api.getUsername();
            setUsername(_username);
        };

        loadDefaults();  
    }, []);
  
    const validateUsername = (value: string) => {
        feedback.showError("");
        setInvalidUsername(true);

        if (!value || value.trim() === "") {
            return;
        };

        if (value.length > 20) { 
            setUsername(value.substring(0, 20));
            return; 
        }

        if (value.length < 4) { 
            feedback.showError("The username length can't be less than 4 characters.");
            return;
        }

        setInvalidUsername(false);
    };

    const validatePassword = (value: string) => {
        feedback.showError("");
        setInvalidPassword(true);

        if (!value || value.trim() === "") {
            return;
        };

        if (value.length > 20) { 
            setPassword(value.substring(0, 20));
            return; 
        }

        if (value.length < 4) { 
            feedback.showError("The password length can't be less than 4 characters.");
            return;
        }

        setInvalidPassword(false);
    };

    const save = useCallback(async () => {
        api.info("Calling useCredentialSetting")
        if (!username) {
            feedback.showError("The username field cannot be empty.");
        }

        if (!password) {
            feedback.showError("The password field cannot be empty.");
        }
        api.info("Calling useCredentialSetting2")
        if (invalidUsername || invalidPassword) {
            return;
        };

        if (!username || !password) {
            return;
        };
        api.info("Calling useCredentialSetting3")
        setIsSaving(true);
        const usernameSuccess = await api.saveUsername(username);
        const passwordSuccess = await api.savePassword(password);
        if (usernameSuccess && passwordSuccess) {
            feedback.showSuccess("Credentials changed successfully.");
            onSaved?.();
        } else {
            feedback.showError("Could not save credentials.");
        }

        setIsSaving(false); 
    }, [username, password, invalidUsername, invalidPassword]);

    return {
        username,
        setUsername,
        password,
        setPassword,
        invalidUsername,
        invalidPassword,
        validateUsername,
        validatePassword,
        save,
        feedback,
        isSaving
    };
}
