import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Button from "./Button";
import Input from "./Input";
import { toastTrigger } from "../helpers/helpers";
import "../stylesheets/RegisterLogin.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toastTrigger({ message: "Email is required", progressColor: "#c90909" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_LINK}user/forgot-password`,
        { email },
        { withCredentials: true }
      );

      if (data.status === 1) {
        setSuccess(true);
        toastTrigger({
          message: data.message || "If an account exists, check your email for reset link",
          progressColor: "#007b60"
        });
        setTimeout(() => navigate("/login"), 3000);
      } else {
        toastTrigger({ message: data.reason || "Something went wrong", progressColor: "#c90909" });
      }
    } catch (error) {
      toastTrigger({ message: "Server error, try again", progressColor: "#c90909" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="componentBoxHeader">
        <h1>Check your email</h1>
        <p>Reset link sent if account exists. Redirecting to login...</p>
      </div>
    );
  }

  return (
    <>
      <div className="componentBoxHeader">
        <h1>Forgot Password</h1>
        <p>Enter your email to receive reset link</p>
        <div className="altRoute">
          <button onClick={() => navigate("/login")} className="altRouteText" style={{background: 'none', border: 'none', fontSize: 'inherit'}}>
            back to login
          </button>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="registerEmail inputContainer">
          <Input
            label="email *"
            type="email"
            name="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className="registerButton">
          <Button text={isSubmitting ? "Sending..." : "Send Reset Link"} type="submit" disabled={isSubmitting} />
        </div>
      </form>
    </>
  );
};

export default ForgotPassword;

