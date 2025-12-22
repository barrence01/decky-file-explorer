import { Field, TextField, ButtonItem, DialogBody } from "@decky/ui";
import { IoMdAlert } from "react-icons/io";

export function InactivityTimeoutSettings({ hook }: any) {
  const { shutdownTimeout, setShutdownTimeout, invalid,
        validate, save, feedback, isSaving } = hook;

  return (
    <DialogBody>
        <Field label="Inactivity timeout (seconds)"
            bottomSeparator="none"
            icon={invalid ? <IoMdAlert size={20} color="red"/> : null}>
            <TextField
            description="Server will shut down after this many seconds of inactivity."
            onChange={(e) => {
                setShutdownTimeout(e.target.value);
                validate(e.target.value);
            }}
            value={shutdownTimeout}
            style={{
              border: invalid ? "1px red solid" : undefined
            }}
            />
        </Field>

        {feedback.error && <div style={{ color: "red", fontWeight: '300', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>{feedback.error}</div>}
        {feedback.success && <div style={{ color: "green", fontWeight: 'bold', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>{feedback.success}</div>}

        <ButtonItem 
            onClick={save} disabled={isSaving}>
            {feedback.saved ? "✓ Saved" : "Save Timeout"}
        </ButtonItem>
    </DialogBody>
  );
}
