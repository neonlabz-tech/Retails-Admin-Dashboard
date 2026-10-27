import mongoose from "mongoose";
import path from "node:path";
import fs from "node:fs";
import dns from "node:dns";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore if restricted
}

declare global {
  var __mongooseConn: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
    memoryUri: string | null;
  } | undefined;
}

const cached = global.__mongooseConn ?? { conn: null, promise: null, memoryUri: null };
global.__mongooseConn = cached;

async function startEmbeddedFallback(): Promise<string> {
  if (cached.memoryUri) return cached.memoryUri;
  const dbPath = path.join(process.cwd(), ".data", "mongo");
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const instance = await MongoMemoryServer.create({
    instance: {
      dbName: "ecommerce_admin",
      dbPath,
      storageEngine: "wiredTiger",
    },
  });
  cached.memoryUri = instance.getUri("ecommerce_admin");
  console.warn(
    "[db] MONGODB_URI was unreachable. Started an embedded MongoDB instance for local development. " +
      "Set MONGODB_URI (e.g. MongoDB Atlas) for production."
  );
  return cached.memoryUri;
}

async function resolveConnection(): Promise<typeof mongoose> {
  const primaryUri = process.env.MONGODB_URI;

  if (primaryUri) {
    try {
      const conn = await mongoose.connect(primaryUri, {
        serverSelectionTimeoutMS: 15000,
        bufferCommands: false,
      });
      console.log(`[db] Connected to primary MONGODB_URI (${mongoose.connection.name})`);
      return conn;
    } catch (err) {
      console.warn("[db] Failed to connect to primary MONGODB_URI, falling back:", (err as Error).message);
    }
  }

  const fallbackUri = await startEmbeddedFallback();
  return mongoose.connect(fallbackUri, { bufferCommands: false });
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = resolveConnection();
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}

export default connectDB;
