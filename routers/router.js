import { Router } from "express";
import * as controller from "../controllers/controller.js";
import passport from "passport";

import multer from "multer";
import * as ft from "file-type";

import * as validator from "../validators/validator.js";
import { validationResult } from "express-validator";

const router = Router();

const storage = new multer.memoryStorage();
const upload = multer({
        storage,
        limits: { fileSize: 10000000 },
});

const isNotAuthenticated = (req, res, next) => {
        if (!req.isAuthenticated()) {
                return next();
        }

        return res.status(409).json({
                error: "Already logged in",
        });
};

const isAuthenticated = (req, res, next) => {
        if (req.isAuthenticated()) {
                return next();
        }

        return res.status(409).json({
                error: "Not logged in",
        });
};

const validateFileType = async (req, res, next) => {
        if (!req.file) {
                return next();
        }
        const buffer = req.file.buffer;
        const type = await ft.fromBuffer(buffer);
        const allowedTypes = ["image/jpeg", "image/png"];

        if (!type || !allowedTypes.includes(type.mime)) {
                return res
                        .status(415)
                        .json({ message: "The file can only be an image" });
        } else {
                next();
        }
};

router.get("/me", isAuthenticated, (req, res) => {
        res.json({ message: "success" });
});

router.post(
        "/register",
        isNotAuthenticated,
        validator.validateRegistration,
        (req, res, next) => {
                console.log(req.body);
                const { username, password, passwordConfirm } = req.body;

                const result = validationResult(req);
                if (!result.isEmpty()) {
                        const errors = result.array();
                        console.log(errors);

                        return res.status(400).send({
                                errors,
                                username,
                                password,
                                passwordConfirm,
                        });
                }
                next();
        },
        controller.register,
);

router.post(
        "/login",
        isNotAuthenticated,
        validator.validateLogin,
        (req, res, next) => {
                const { username, password } = req.body;

                const result = validationResult(req);
                if (!result.isEmpty()) {
                        const errors = result.array();
                        console.log(errors);

                        return res.status(400).send({
                                errors,
                                username,
                                password,
                        });
                }
                next();
        },
        passport.authenticate("local"),
        controller.login,
);

router.get("/logout", controller.logout);

// Create chat
router.post("/chats", isAuthenticated, controller.createChat);
router.get("/chats/:id", isAuthenticated, controller.getChat);

router.get("/users", isAuthenticated, controller.getUsers);
router.get("/users/:userid/profile", isAuthenticated, controller.getProfile);
router.put(
        "/users/:userid/profile",
        isAuthenticated,
        validator.validateProfileUpdate,
        (req, res, next) => {
                const { bio, age } = req.body || {};

                const result = validationResult(req);
                if (!result.isEmpty()) {
                        const errors = result.array();
                        console.log(errors);

                        return res.status(400).send({
                                errors,
                                bio,
                                age,
                        });
                }
                next();
        },
        upload.single("avatar"),
        validateFileType,
        controller.updateProfile,
);

router.get("/users/:userid/chats", isAuthenticated, controller.getUserChats);

router.post(
        "/chats/:chatid/messages",
        isAuthenticated,
        validator.validateMessageSending,
        (req, res, next) => {
                const { content } = req.body;

                const result = validationResult(req);
                if (!result.isEmpty()) {
                        const errors = result.array();

                        console.log(errors);

                        return res.status(400).send({
                                errors,
                                content,
                                message: "No message content provided",
                        });
                }
                next();
        },
        controller.sendMessage,
);

export default router;
