import { Field, TextField, ButtonItem, DialogBody } from "@decky/ui";
import { IoMdAlert } from "react-icons/io";

export function PortSettings({ hook }: any) {
  const { port, setPort, validate, invalid, save, feedback, isSaving } = hook;

  return (
    <DialogBody>
      <Field
        label="Port"
        bottomSeparator="none"
        icon={invalid ? <IoMdAlert size={20} color="red" /> : null}>
        <TextField
          description="TCP port used for connection."
          value={port.toString()}
          onChange={(e) => {
            setPort(e.target.value);
            validate(e.target.value);
          }}
          style={{ border: invalid ? "1px red solid" : undefined }}
        />
      </Field>

      {feedback.error && <div style={{ color: "red", fontWeight: '300', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>{feedback.error}</div>}
      {feedback.success && <div style={{ color: "green", fontWeight: 'bold', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>{feedback.success}</div>}

      <ButtonItem onClick={save} disabled={isSaving}>
        {feedback.saved ? "✓ Saved" : "Save Port"}
      </ButtonItem>
    </DialogBody>
  );
}
