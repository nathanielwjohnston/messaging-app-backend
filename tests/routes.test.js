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

describe("Chats", () => {
        // TODO: make every test independent?

        beforeAll(async () => {
                await prisma.message.deleteMany({});
                await prisma.user.deleteMany({});
                await prisma.chat.deleteMany({});

                await request(app)
                        .post("/register")
                        .send({ username: "test-user1", password: "Password" });

                await request(app)
                        .post("/register")
                        .send({ username: "test-user2", password: "Password" });
        });

        let agent;

        beforeEach(async () => {
                agent = request.agent(app);
                await agent.post("/login").send({
                        username: "test-user1",
                        password: "Password",
                });
        });

        it("creates and returns a chat", async () => {
                const user = await prisma.user.findUnique({
                        where: { username: "test-user2" },
                });
                const response = await agent.post("/chats").send({
                        recipientId: user.id,
                });

                expect(response.headers["content-type"]).toMatch(/json/);
                expect(response.status).toEqual(200);

                expect(response.body.users).toMatchObject([
                        { username: "test-user1" },
                        { username: "test-user2" },
                ]);
        });
        it("returns chat that is already created", async () => {
                const user = await prisma.user.findUnique({
                        where: { username: "test-user2" },
                });

                const response = await agent.post("/chats").send({
                        recipientId: user.id,
                });

                expect(response.headers["content-type"]).toMatch(/json/);
                expect(response.status).toEqual(200);

                expect(response.body.users).toMatchObject([
                        { username: "test-user1" },
                        { username: "test-user2" },
                ]);

                expect(response.body.message).toEqual("Returned existing chat");
        });

        it("fetches a chat", async () => {
                await request(app)
                        .post("/register")
                        .send({ username: "test-user3", password: "Password" });

                const user = await prisma.user.findUnique({
                        where: { username: "test-user3" },
                });

                const createResponse = await agent.post("/chats").send({
                        recipientId: user.id,
                });

                const chatId = createResponse.body.id;

                const response = await agent.get(`/chats/${chatId}`);

                expect(response.headers["content-type"]).toMatch(/json/);
                expect(response.status).toEqual(200);

                expect(response.body.users).toMatchObject([
                        { username: "test-user1" },
                        { username: "test-user3" },
                ]);
        });
        it("fails to fetch a non-existent chat", async () => {
                const response = await agent.get("/chats/123456");

                expect(response.headers["content-type"]).toMatch(/json/);
                expect(response.status).toEqual(404);
        });

        it("fetches user chats", async () => {
                const user = await prisma.user.findUnique({
                        where: { username: "test-user1" },
                        include: { chats: true },
                });

                const response = await agent.get(`/users/${user.id}/chats`);

                expect(response.headers["content-type"]).toMatch(/json/);
                expect(response.status).toEqual(200);

                expect(response.body).toMatchObject(user.chats);
        });

        it("sends messages in a chat", async () => {
                const user = await prisma.user.findUnique({
                        where: {
                                username: "test-user1",
                        },
                        include: { chats: true },
                });

                const chat = user.chats[0];

                const response = await agent
                        .post(`/chats/${chat.id}/messages`)
                        .send({ content: "This is my first message" });

                expect(response.headers["content-type"]).toMatch(/json/);
                expect(response.status).toEqual(200);

                expect(response.body.content).toEqual(
                        "This is my first message",
                );
                expect(response.body.userId).toEqual(user.id);
                expect(response.body.chatId).toEqual(chat.id);
        });
        it("rejects sending messages in someone else's chat", async () => {
                const user1 = await prisma.user.findUnique({
                        where: {
                                username: "test-user2",
                        },
                });

                const user2 = await prisma.user.findUnique({
                        where: {
                                username: "test-user2",
                        },
                });

                const chat = await prisma.chat.create({
                        data: {
                                users: {
                                        connect: [
                                                { id: user1.id },
                                                { id: user2.id },
                                        ],
                                },
                        },
                });

                const response = await agent
                        .post(`/chats/${chat.id}/messages`)
                        .send({ content: "This isn't my chat" });

                expect(response.headers["content-type"]).toMatch(/json/);
                expect(response.status).toEqual(403);

                expect(response.body.message).toEqual("Not your chat");
        });
        it("rejects sending an empty message", async () => {
                const user = await prisma.user.findUnique({
                        where: {
                                username: "test-user1",
                        },
                        include: { chats: true },
                });

                const chat = user.chats[0];

                const response = await agent
                        .post(`/chats/${chat.id}/messages`)
                        .send({ content: "" });

                expect(response.headers["content-type"]).toMatch(/json/);
                expect(response.status).toEqual(400);

                expect(response.body.message).toEqual(
                        "No message content provided",
                );
        });
});
describe("Users", () => {
        beforeAll(async () => {
                await prisma.message.deleteMany({});
                await prisma.user.deleteMany({});
                await prisma.chat.deleteMany({});

                await request(app)
                        .post("/register")
                        .send({ username: "test-user1", password: "Password" });

                await request(app)
                        .post("/register")
                        .send({ username: "test-user2", password: "Password" });
        });

        let agent;

        beforeEach(async () => {
                agent = request.agent(app);
                await agent.post("/login").send({
                        username: "test-user1",
                        password: "Password",
                });
        });

        it("gets a list of users", async () => {
                const response = await agent.get("/users");

                expect(response.headers["content-type"]).toMatch(/json/);
                expect(response.status).toEqual(200);

                // Should not include current user
                expect(response.body).toMatchObject([
                        { username: "test-user2" },
                ]);
        });
        it("gets a user's profile", async () => {
                const user = await prisma.user.findUnique({
                        where: { username: "test-user2" },
                });

                const profile = await prisma.profile.update({
                        where: { id: user.id },
                        data: {
                                bio: "This is my new bio",
                                age: 44,
                        },
                });

                const response = await agent.get(`/users/${user.id}/profile`);

                expect(response.headers["content-type"]).toMatch(/json/);
                expect(response.status).toEqual(200);

                expect(response.body).toMatchObject(profile);
        });
        it("rejects getting a profile for a non-existent user", async () => {
                const response = await agent.get("/users/123456/profile");

                expect(response.headers["content-type"]).toMatch(/json/);
                expect(response.status).toEqual(404);

                expect(response.body.message).toEqual(
                        "This user does not exist",
                );
        });
        it("lets a user update their profile", async () => {
                const user = await prisma.user.findUnique({
                        where: { username: "test-user1" },
                });

                const newBio = "This is an updated bio";
                const newAge = 33;

                const response = await agent
                        .put(`/users/${user.id}/profile`)
                        .send({
                                bio: newBio,
                                age: newAge,
                        });

                expect(response.headers["content-type"]).toMatch(/json/);
                expect(response.status).toEqual(200);

                const updatedProfile = await prisma.profile.findUnique({
                        where: { id: user.id },
                });

                expect(updatedProfile.bio).toEqual(newBio);
                expect(updatedProfile.age).toEqual(newAge);
        });
        it("rejects a user updating another user's profile", async () => {
                const user = await prisma.user.findUnique({
                        where: { username: "test-user2" },
                });

                const response = await agent
                        .put(`/users/${user.id}/profile`)
                        .send({
                                bio: "This is an illegal bio update",
                                age: 90,
                        });

                expect(response.headers["content-type"]).toMatch(/json/);
                expect(response.status).toEqual(403);

                expect(response.body.message).toEqual("Not your profile");
        });
        it("lets a user update their avatar", async () => {
                const user = await prisma.user.findUnique({
                        where: { username: "test-user1" },
                });

                const response = await agent
                        .put(`/users/${user.id}/profile`)
                        .attach("avatar", "./tests/assets/avatar.png");

                console.log("test2");

                expect(response.headers["content-type"]).toMatch(/json/);
                expect(response.status).toEqual(200);

                const updatedProfile = await prisma.profile.findUnique({
                        where: { id: user.id },
                });

                expect(updatedProfile.avatarUrl).toBeDefined();
        });
});
