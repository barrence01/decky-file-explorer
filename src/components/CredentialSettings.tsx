import { Field, TextField, ButtonItem, DialogBody } from "@decky/ui";
import { IoMdAlert } from "react-icons/io";

export function CredentialSettings({ hook }: any) {
  const { username, setUsername, password, setPassword, invalidUsername, invalidPassword,
        validateUsername, validatePassword, save, feedback, isSaving } = hook;

  return (
    <DialogBody>
        <Field label="Username" 
          bottomSeparator="none"
          icon={invalidUsername ? <IoMdAlert size={20} color="red"/> : null}>
          <TextField
            description="Set the username for the file browser."
            value={username}
            onChange={(e) => {
                setUsername(e.target.value);
                validateUsername(e.target.value);
            }}
            style={{
              border: invalidUsername ? "1px red solid" : undefined
            }}
          />
        </Field>
        <Field label="Password"
          bottomSeparator="none"
          icon={invalidPassword ? <IoMdAlert size={20} color="red"/> : null}>
          <TextField
            description="Set the password for the file browser."
            value={password}
            bIsPassword={true}
            onChange={(e) => {
                setPassword(e.target.value);
                validatePassword(e.target.value);
            }}
            style={{
              border: invalidPassword ? "1px red solid" : undefined
            }}
          />
        </Field>

        {feedback.error && <div style={{ color: "red", fontWeight: '300', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>{feedback.error}</div>}
        {feedback.success && <div style={{ color: "green", fontWeight: 'bold', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>{feedback.success}</div>}

        <ButtonItem onClick={save} disabled={isSaving}>
          {feedback.saved ? "✓ Saved" : "Save Credentials"}
        </ButtonItem>
      </DialogBody>
  );
}
