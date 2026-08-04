import { createClient } from "redis";

export const redisClient = createClient({
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
});

redisClient.on("error", (error) => {
    console.error("Redis error: ", error);
});

await redisClient.connect();

// await redisClient.set("spot:health", "connected");
// const redisStatus = await redisClient.get("spot:health");
// console.log("Redis status: ", redisStatus);
