import express from "express";
import cors from "cors";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import { JSONFilePreset } from "lowdb/node";

const __dirname = dirname(fileURLToPath(import.meta.url));

// -------------------- ENSURE DB --------------------
const dataDir = join(__dirname, "data");
const dbFile = join(dataDir, "db.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(
    dbFile,
    JSON.stringify({
      content: {},
      products: [],
      collections: [],
      gallery: [],
      messages: []
    }, null, 2)
  );
}

const db = await JSONFilePreset(dbFile, {});

// -------------------- UPLOADS --------------------
const uploadDir = join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = file.originalname.split(".").pop();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`);
  }
});
const upload = multer({ storage });

// -------------------- APP --------------------
const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

// -------------------- API ROUTES --------------------

// Upload
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// Content
app.get("/api/content", async (_, res) => {
  await db.read();
  res.json(db.data.content || {});
});

app.post("/api/content", async (req, res) => {
  await db.read();
  db.data.content = { ...db.data.content, ...req.body };
  await db.write();
  res.json(db.data.content);
});

// Products
app.get("/api/products", async (_, res) => {
  await db.read();
  res.json(db.data.products || []);
});

app.post("/api/products", async (req, res) => {
  await db.read();
  const product = { id: Date.now().toString(), ...req.body };
  db.data.products.push(product);
  await db.write();
  res.json(product);
});

app.put("/api/products/:id", async (req, res) => {
  await db.read();
  const index = db.data.products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Not found" });

  db.data.products[index] = { ...db.data.products[index], ...req.body };
  await db.write();
  res.json(db.data.products[index]);
});

app.delete("/api/products/:id", async (req, res) => {
  await db.read();
  db.data.products = db.data.products.filter(p => p.id !== req.params.id);
  await db.write();
  res.json({ success: true });
});

// Collections
app.get("/api/collections", async (_, res) => {
  await db.read();
  res.json(db.data.collections || []);
});

// Messages
app.post("/api/messages", async (req, res) => {
  await db.read();
  db.data.messages.push({ id: Date.now().toString(), ...req.body });
  await db.write();
  res.json({ success: true });
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("✅ API running on port", PORT);
});
