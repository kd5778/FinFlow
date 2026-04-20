import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Button from "./Button";
import Input from "./Input";
import { validate } from "../validation";
import { toastTrigger } from "../helpers/helpers";
import { IconButton, InputAdornment } from "@mui/material";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import "../stylesheets/RegisterLogin.css";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, valid, invalid
  const [input, setInput] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_LINK}user/reset-password/${token}`, { withCredentials: true });
        if (data.status === 1) {
          setStatus('valid');
        } else {
          setStatus('invalid');
          toastTrigger({ message: data.reason || 'Invalid or expired reset link', progressColor: '#c90909' });
        }
      } catch (error) {
        setStatus('invalid');
        toastTrigger({ message: 'Invalid or expired reset link', progressColor: '#c90909' });
      }
    };
    verifyToken();
  }, [token]);

  const onInput = async (e) => {
    const result = { ...input, [e.target.name]: e.target.value };
    const validationErrors = await validate(result, 'passwordChange');
    setErrors(validationErrors || {});
    setInput(result);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (errors.password || errors.confirmNewPassword || !input.password || !input.confirmPassword) {
      toastTrigger({ message: 'Please fix form errors', progressColor: '#c90909' });
      return;
    }
    if (input.password !== input.confirmPassword) {
      toastTrigger({ message: 'Passwords do not match', progressColor: '#c90909' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_LINK}user/reset-password/${token}`,
        { password: input.password },
        { withCredentials: true }
      );
      if (data.status === 1) {
        toastTrigger({ message: 'Password reset successful! Redirecting to login...', progressColor: '#007b60' });
        setTimeout(() => navigate('/login'), 2000);
      } else {
        toastTrigger({ message: data.reason || 'Reset failed', progressColor: '#c90909' });
      }
    } catch (error) {
      toastTrigger({ message: 'Reset failed, try again', progressColor: '#c90909' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return <div className="componentBoxHeader"><h1>Verifying reset link...</h1></div>;
  }

  if (status === 'invalid') {
    return (
      <div className="componentBoxHeader">
        <h1>Invalid Reset Link</h1>
        <p>The reset link is invalid or expired. <button onClick={() => navigate('/login')} style={{background: 'none', border: 'none', color: '#007b60', fontSize: 'inherit'}}>Request new one?</button></p>
      </div>
    );
  }

  return (
    <>
      <div className="componentBoxHeader">
        <h1>Reset Password</h1>
        <p>Enter new password for your account</p>
        <div className="altRoute">
          <button onClick={() => navigate('/login')} className="altRouteText" style={{background: 'none', border: 'none', fontSize: 'inherit'}}>
            back to login
          </button>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="registerPassword">
          <div className="inputContainer">
            <Input
              label="new password *"
              type={showPassword ? "text" : "password"}
              name="password"
              endAdornment={
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
              onInput={onInput}
              disabled={isSubmitting}
            />
            <p className="errorMessage">{errors.password}</p>
          </div>
          <div className="inputContainer">
            <Input
              label="confirm password *"
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              endAdornment={
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
              onInput={onInput}
              disabled={isSubmitting}
            />
            <p className="errorMessage">{errors.confirmNewPassword || (input.password !== input.confirmPassword ? "Passwords do not match" : null)}</p>
          </div>
        </div>
        <div className="registerButton">
          <Button text={isSubmitting ? "Resetting..." : "Reset Password"} type="submit" disabled={isSubmitting} />
        </div>
      </form>
    </>
  );
};

export default ResetPassword;

