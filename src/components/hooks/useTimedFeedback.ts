import { useState } from "react";

export function useTimedFeedback(timeout = 3000) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saved, setSaved] = useState(false);

  const showError = (msg: string) => {
    setSuccess("");
    setError(msg);
  };

  const showSuccess = (msg: string) => {
    setError("");
    setSuccess(msg);
    setSaved(true);

    setTimeout(() => {
      setSuccess("");
      setSaved(false);
    }, timeout);
  };

  return {
    error,
    success,
    saved,
    showError,
    showSuccess
  };
}
