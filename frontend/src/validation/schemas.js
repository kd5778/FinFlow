import joi from "joi";

// define schema for joi validation

// for register page

export const register = {
  firstName: joi
    .string()
    .required()
    .min(1)
    .max(50)
    .pattern(/^[A-Za-z\s'-]+$/)
    .trim()
    .normalize()
    .lowercase()
    .messages({
      "string.empty": "first name is required",
      "string.min": "first name should have a minimum length of 1",
      "string.max": "first name should have a maximum length of 50",
      "string.pattern.base":
        "first name can only contain letters, spaces, hyphens, and apostrophes",
    }),

  lastName: joi
    .string()
    .required()
    .min(1)
    .max(50)
    .pattern(/^[A-Za-z\s'-]+$/)
    .trim()
    .normalize()
    .lowercase()
    .messages({
      "string.empty": "last name is required",
      "string.min": "last name should have a minimum length of 1",
      "string.max": "last name should have a maximum length of 50",
      "string.pattern.base":
        "last name can only contain letters, spaces, hyphens, and apostrophes",
    }),

  number: joi
    .string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "string.empty": "phone number is required",
      "string.pattern.base": "phone number must be a valid 10-digit Indian phone number",
    }),

  email: joi
    .string()
    .required()
    .email({ tlds: { allow: false } })
    .messages({
      "string.empty": "email is required",
      "string.email": "email must be a valid email address",
    }),

  dob: joi
    .string()
    .pattern(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    .required()
    .custom((value, helpers) => {
      const currentDate = new Date();
      const birthDate = new Date(value);
      let age = currentDate - birthDate;

      age = Math.floor(age / (1000 * 60 * 60 * 24 * 365.25));

      if (age < 18) {
        return helpers.error("any.custom");
      }

      return value;
    })
    .messages({
      "string.empty": "date of birth is required",
      "string.pattern.base": "date of birth must be in the format dd/mm/yyyy",
      "any.custom": "age must be at least 18 years old",
    }),

  password: joi
    .string()
    .min(8)
    .max(32)
    .trim()
    .pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).*/)
    .messages({
      "string.empty": "password is required",
      "string.min":
        "password must have a minimum length of {#limit} characters",
      "string.max":
        "password must have a maximum length of {#limit} characters",
      "string.pattern.base":
        "password must contain an uppercase letter, a lowercase letter, and a number",
    }),

  confirmPassword: joi.string().valid(joi.ref("password")).messages({
    "any.only": "passwords do not match",
    "string.empty": "is not allowed to be empty",
  }),
};

// for login page

export const login = {
  email: joi
    .string()
    .required()
    .email({ tlds: { allow: false } })
    .messages({
      "string.empty": "email is required",
      "string.email": "email must be a valid email address",
    }),

  password: joi.string().min(8).max(32).trim().messages({
    "string.empty": "password is required",
    "string.min": "password must have a minimum length of {#limit} characters",
    "string.max": "password must have a maximum length of {#limit} characters",
  }),
};

// for payment page

export const pay = {
  payeeName: joi
    .string()
    .required()
    .min(1)
    .max(70)
    .pattern(/^[A-Za-z\s'-]+$/)
    .trim()
    .normalize()
    .lowercase()
    .messages({
      "string.empty": "payee name is required",
      "string.min": "payee name should have a minimum length of 1",
      "string.max": "payee n1ame should have a maximum length of 70",
      "string.pattern.base":
        "payee name can only contain letters, spaces, hyphens, and apostrophes",
    }),

  sortCode: joi
    .string()
    .pattern(/^IFSC\d{6}$/)
    .required()
    .length(10)
    .messages({
      "string.empty": "IFSC code is required",
      "string.pattern.base": "IFSC code must be in format IFSC followed by 6 digits",
    }),

  accountNumber: joi
    .string()
    .pattern(/^\d{10}$/)
    .required()
    .length(10)
    .messages({
      "string.empty": "bank account number is required",
      "string.pattern.base": "bank account number must be 10 digits",
    }),

  amount: joi
    .string()
    .required()
    .pattern(/^\d+(\.\d{1,2})?$/) // Allows positive decimal numbers with up to 2 decimal places
    .messages({
      "string.empty": "amount is required",
      "string.pattern.base":
        "amount must be a valid decimal number with up to 2 decimal places",
    }),

  category: joi
    .string()
    .required()
    .valid(
      "Food & Dining",
      "Rent & Housing",
      "Shopping",
      "Transport",
      "Bills & Utilities",
      "Entertainment",
      "Healthcare",
      "Education",
      "Investments",
      "Other"
    )
    .messages({
      "string.empty": "category is required",
      "any.only": "please select a valid category",
    }),
};

// for debit card validation

export const debit = {
  amount: joi
    .string()
    .required()
    .pattern(/^\d+(\.\d{1,2})?$/) // Allows positive decimal numbers with up to 2 decimal places
    .messages({
      "string.empty": "amount is required",
      "string.pattern.base":
        "amount must be a valid decimal number with up to 2 decimal places",
    }),

  cardNumber: joi.string().creditCard().required().messages({
    "string.empty": "debit card number is required",
    "string.creditCard": "debit card number must be a valid debit card number",
  }),

  expiryDate: joi
    .string()
    .pattern(/^\d{2}\/\d{2}$/)
    .required()
    .messages({
      "string.empty": "debit card expiry date is required",
      "string.pattern.base":
        "debit card expiry date must be in the format MM/YY",
    }),

  CVV: joi
    .string()
    .pattern(/^\d{3}$/)
    .required()
    .messages({
      "string.empty": "debit card CVV is required",
      "string.pattern.base": "debit card CVV must be a 3-digit number",
    }),
};

// for password change

export const passwordChange = {
  currentPassword: joi.string().min(8).max(32).trim().messages({
    "string.empty": "password is required",
    "string.min": "password must have a minimum length of {#limit} characters",
    "string.max": "password must have a maximum length of {#limit} characters",
  }),

  newPassword: joi
    .string()
    .min(8)
    .max(32)
    .trim()
    .pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).*/)
    .messages({
      "string.empty": "password is required",
      "string.min":
        "password must have a minimum length of {#limit} characters",
      "string.max":
        "password must have a maximum length of {#limit} characters",
      "string.pattern.base":
        "password must contain an uppercase letter, a lowercase letter, and a number",
    }),

  confirmNewPassword: joi.string().valid(joi.ref("newPassword")).messages({
    "any.only": "passwords do not match",
    "string.empty": "is not allowed to be empty",
  }),
};
