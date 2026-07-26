import { body } from "express-validator";

export const validateRegistration = [
        body("username")
                .trim()
                .notEmpty()
                .withMessage("Username must not be empty"),
        body("password")
                .trim()
                .notEmpty()
                .withMessage("Password must not be empty")
                .isLength({ min: 8, max: 20 })
                .withMessage("Password must be between 8 and 20 characters"),
        body("passwordConfirm")
                .trim()
                .notEmpty()
                .withMessage("Password must not be empty")
                .isLength({ min: 8, max: 20 })
                .withMessage("Password must be between 8 and 20 characters")
                .custom((value, { req }) => {
                        return value === req.body.password;
                })
                .withMessage("Passwords must match"),
];

export const validateLogin = [
        body("username")
                .trim()
                .notEmpty()
                .withMessage("Username must not be empty")
                .trim()
                .notEmpty()
                .withMessage("Password must not be empty")
                .isLength({ min: 8, max: 20 })
                .withMessage("Password must be between 8 and 20 characters"),
];

export const validateProfileUpdate = [
        body("bio").if(body("bio").notEmpty()).trim(),
        body("age").if(body("age").notEmpty()).isNumeric(),
];

export const validateMessageSending = [body("content").trim().notEmpty()];
