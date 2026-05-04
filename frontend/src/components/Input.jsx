// importing react, components and libraries
import React from "react";

// importing mui stuff
import TextField from "@mui/material/TextField";
import {
  FormControl,
  InputAdornment,
  InputLabel,
  OutlinedInput
} from "@mui/material";

const Input = (props) => {
  const { label, type, name, autoFocus, onInput, id, placeholder, endAdornment } = props;

  if (endAdornment) {
    return (
      <FormControl fullWidth size="small" sx={{ marginTop: '1rem' }}>
        <InputLabel>{label}</InputLabel>
        <OutlinedInput
          name={name}
          placeholder={placeholder}
          sx={{
            borderRadius: "1rem",
            backgroundColor: "var(--input-bg)",
            height: "4rem",
          }}
          autoFocus={autoFocus}
          label={label}
          type={type}
          endAdornment={endAdornment}
          onInput={onInput}
        />
      </FormControl>
    );
  }

  return (
    <>
      <TextField
        name={name}
        InputProps={{
          sx: {
            borderRadius: "1rem",
            backgroundColor: "var(--input-bg)",
            zIndex: "0",
            height: "4rem",
          },
        }}
        autoFocus={autoFocus}
        fullWidth
        label={label}
        margin="dense"
        type={type}
        size="small"
        onInput={onInput}
        placeholder={placeholder}
      />
    </>
  );
};

export default Input;
