import "dotenv/config";

import request from "supertest";
import {
        afterAll,
        beforeAll,
        beforeEach,
        describe,
        expect,
        it,
} from "@jest/globals";

import { prisma } from "../lib/prisma.js";

import { createApp } from "../app.js";

const app = createApp();

describe("Authentication", () => {
        beforeAll(async () => {
                await prisma.user.deleteMany({});
        });

        let agent;

        beforeEach(() => {
                agent = request.agent(app);
        });

        it("registers a user", async () => {
                const response = await request(app)
                        .post("/register")
                        .send({ username: "test-user", password: "Password" });

                expect(response.headers["content-type"]).toMatch(/json/);
                expect(response.status).toEqual(200);
                expect(response.body.message).toEqual("success");

                const user = await prisma.user.findUnique({
                        where: { username: "test-user" },
                });

                expect(user).toBeDefined;
        });
        it("logs a user in", async () => {
                const response = await request(app).post("/login").send({
                        username: "test-user",
                        password: "Password",
                });

                expect(response.headers["content-type"]).toMatch(/json/);
                expect(response.status).toEqual(200);
                expect(response.body.message).toEqual("success");
        });
        it("logs a user out", async () => {
                // Log user in and saves to session
                await agent.post("/login").send({
                        username: "test-user",
                        password: "Password",
                });

                const response = await agent.get("/logout");

                expect(response.headers["content-type"]).toMatch(/json/);
                expect(response.status).toEqual(200);
                expect(response.body.message).toEqual("success");
        });
        it("rejects log in attempt when logged in", async () => {
                // Log user in and saves to session
                await agent.post("/login").send({
                        username: "test-user",
                        password: "Password",
                });

                // Second attempt when logged in
                const response = await agent.post("/login").send({
                        username: "test-user",
                        password: "Password",
                });

                expect(response.headers["content-type"]).toMatch(/json/);
                expect(response.status).toEqual(409);
                expect(response.body.error).toEqual("Already logged in");
        });
        it("rejects log in attempt on incorrect credentials", async () => {
                const response = await request(app).post("/login").send({
                        username: "test-user",
                        password: "IncorrectPassword",
                });

                expect(response.status).toEqual(401);
        });

        afterAll(async () => {
                await prisma.user.deleteMany({});
        });
});

describe("Chats", () => {});
describe("Users", () => {});
