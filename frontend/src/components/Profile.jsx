import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Button from "./Button";
import { useDispatch, useSelector } from "react-redux";
import { selectAccount, setAccount } from "../store/mainSlice";
import { toastTrigger } from "../helpers/helpers";
import "../stylesheets/Home.css";
import "../stylesheets/Transfer.css";
import "../stylesheets/AltTemplate.css";

// profile / account page

const formatDate = (inputDate) => {
  if (!inputDate) {
    return "-";
  }

  if (typeof inputDate === "string") {
    const trimmedDate = inputDate.trim();

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmedDate)) {
      return trimmedDate;
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(trimmedDate)) {
      const [year, month, day] = trimmedDate.split("T")[0].split("-");
      return `${day}/${month}/${year}`;
    }
  }

  const dateObj = new Date(inputDate);

  if (Number.isNaN(dateObj.getTime())) {
    return inputDate;
  }

  const day = dateObj.getUTCDate().toString().padStart(2, "0");
  const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = dateObj.getUTCFullYear();

  return `${day}/${month}/${year}`;
};

const getEditableDobValue = (inputDate) => {
  if (!inputDate) {
    return "";
  }

  if (typeof inputDate === "string") {
    const trimmedDate = inputDate.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      return trimmedDate;
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmedDate)) {
      return trimmedDate.split("T")[0];
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmedDate)) {
      const [day, month, year] = trimmedDate.split("/");
      return `${year}-${month}-${day}`;
    }
  }

  const dateObj = new Date(inputDate);

  if (Number.isNaN(dateObj.getTime())) {
    return "";
  }

  return dateObj.toISOString().split("T")[0];
};

const getStoredDobValue = (inputDate) => {
  if (!inputDate) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
    const [year, month, day] = inputDate.split("-");
    return `${day}/${month}/${year}`;
  }

  return inputDate;
};

const inputStyles = {
  width: "100%",
  padding: "0.85rem 1rem",
  borderRadius: "0.8rem",
  border: "1px solid #d5d9e2",
  fontSize: "1rem",
  fontFamily: "inherit",
};

const Profile = () => {
  const dispatch = useDispatch();
  const account = useSelector(selectAccount);
  const [isEditing, setIsEditing] = useState(false);

  const initialFormValues = useMemo(
    () => ({
      firstName: account.firstName || "",
      lastName: account.lastName || "",
      dob: getEditableDobValue(account.dob),
      phoneNumber: account.phoneNumber || "",
    }),
    [account.firstName, account.lastName, account.dob, account.phoneNumber]
  );

  const [formValues, setFormValues] = useState(initialFormValues);

  useEffect(() => {
    setFormValues(initialFormValues);
  }, [initialFormValues]);

  const displayName =
    account.holderName ||
    account.name ||
    `${account.firstName || ""} ${account.lastName || ""}`.trim() ||
    "Your Profile";

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    const firstName = formValues.firstName.trim();
    const lastName = formValues.lastName.trim();
    const phoneNumber = formValues.phoneNumber.trim();
    const dob = getStoredDobValue(formValues.dob);

    if (!firstName || !lastName || !phoneNumber || !dob) {
      toastTrigger({
        message: "please complete all profile fields",
        progressColor: "#c90909",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const { data } = await axios.put(
        `${import.meta.env.VITE_API_LINK}account/`,
        {
          firstName,
          lastName,
          dob,
          phoneNumber,
        },
        {
          headers: {
            token,
          },
          withCredentials: true,
        }
      );

      if (data.status === 0) {
        toastTrigger({
          message: data.reason || "unable to update profile",
          progressColor: "#c90909",
        });
        return;
      }

      const {
        account_name,
        account_number,
        balance,
        currency_code,
        currency_country,
        currency_name,
        currency_symbol,
        ifsc_code,
        first_name,
        last_name,
        dob: savedDob,
        number,
      } = data.result;

      dispatch(
        setAccount({
          ...account,
          holderName: account_name,
          name: account_name,
          account_name,
          accountNumber: account_number,
          balance,
          currencyCode: currency_code,
          currencyName: currency_name,
          currencyCountry: currency_country,
          currencySymbol: currency_symbol,
          sortCode: ifsc_code,
          firstName: first_name,
          lastName: last_name,
          dob: savedDob,
          phoneNumber: number,
        })
      );

      toastTrigger({
        message: "profile updated successfully",
        progressColor: "#007b60",
      });

      setIsEditing(false);
    } catch (error) {
      console.log(error);

      toastTrigger({
        message: "something has gone wrong",
        progressColor: "#c90909",
      });
    }
  };

  const handleCancel = () => {
    setFormValues(initialFormValues);
    setIsEditing(false);
  };

  return (
    <>
      <div className="mainHomeContainer">
        <div className="homeHeader">
          <h1>{displayName}</h1>
        </div>

        <div className="homeContainer helpContainer">
          <div className="profileHeader">
            <div>
              <h2>Personal Information</h2>
            </div>

            <div
              className="editButton"
              style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
            >
              {isEditing ? (
                <>
                  <Button
                    text={"save details"}
                    type={"secondary"}
                    textSize={"1.2rem"}
                    onClick={handleSave}
                  ></Button>

                  <Button
                    text={"cancel"}
                    type={"secondary"}
                    textSize={"1.2rem"}
                    onClick={handleCancel}
                  ></Button>
                </>
              ) : (
                <Button
                  text={"edit details"}
                  type={"secondary"}
                  textSize={"1.2rem"}
                  onClick={() => setIsEditing(true)}
                ></Button>
              )}
            </div>
          </div>

          <div className="bankTransferBox">
            <div className="transferDetails profileDetails">
              <div className="detailOption">
                <h3>full legal first name</h3>
                {isEditing ? (
                  <input
                    type="text"
                    name="firstName"
                    value={formValues.firstName}
                    onChange={handleInputChange}
                    style={inputStyles}
                  />
                ) : (
                  <p>{account.firstName || "-"}</p>
                )}
              </div>

              <div className="detailOption">
                <h3>full legal last name</h3>
                {isEditing ? (
                  <input
                    type="text"
                    name="lastName"
                    value={formValues.lastName}
                    onChange={handleInputChange}
                    style={inputStyles}
                  />
                ) : (
                  <p>{account.lastName || "-"}</p>
                )}
              </div>

              <div className="detailOption">
                <h3>date of birth</h3>
                {isEditing ? (
                  <input
                    type="date"
                    name="dob"
                    value={formValues.dob}
                    onChange={handleInputChange}
                    style={inputStyles}
                  />
                ) : (
                  <p>{formatDate(account.dob)}</p>
                )}
              </div>

              <div className="detailOption">
                <h3>phone number</h3>
                {isEditing ? (
                  <input
                    type="text"
                    name="phoneNumber"
                    value={formValues.phoneNumber}
                    onChange={handleInputChange}
                    style={inputStyles}
                  />
                ) : (
                  <p>{account.phoneNumber || "-"}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
