// Uso: node scripts/reset-admin-password.mjs <usuario> [nuevaContraseña]
// Cambia la contraseña de un operador directamente en el estado privado (Supabase).
// Lee NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY de .env / .env.local.
import fs from "fs";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

for (const f of [".env", ".env.local"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
  }
}

const [username, given] = process.argv.slice(2);
if (!username) {
  console.error("Uso: node scripts/reset-admin-password.mjs <usuario> [nuevaContraseña]");
  process.exit(1);
}
const password = given || crypto.randomBytes(9).toString("base64url");
if (password.length < 10) {
  console.error("La contraseña debe tener al menos 10 caracteres.");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);
const BUCKET = "mas30-private";
const FILE = "mas30-state-v1.json";

const { data, error } = await supabase.storage.from(BUCKET).download(FILE);
if (error || !data) {
  console.error("No se pudo leer el estado privado. Abrí el sitio una vez para migrarlo y reintentá.", error?.message);
  process.exit(1);
}
const state = JSON.parse(await data.text());
const user = (state.adminUsers || []).find(
  (u) => u.username.trim().toLowerCase() === username.trim().toLowerCase()
);
if (!user) {
  console.error("Usuario no encontrado. Existentes:", (state.adminUsers || []).map((u) => u.username).join(", "));
  process.exit(1);
}
const salt = crypto.randomBytes(16);
user.password = `scrypt$${salt.toString("hex")}$${crypto.scryptSync(password, salt, 64).toString("hex")}`;
const up = await supabase.storage.from(BUCKET).upload(FILE, Buffer.from(JSON.stringify(state)), {
  contentType: "application/json",
  upsert: true,
  cacheControl: "0",
});
if (up.error) {
  console.error(up.error.message);
  process.exit(1);
}
console.log(`Contraseña de "${user.username}" actualizada.`);
if (!given) console.log(`Contraseña nueva (guardala ahora, no se vuelve a mostrar): ${password}`);
