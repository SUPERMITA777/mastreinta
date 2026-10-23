// Uso: node scripts/reset-admin-password.mjs <usuario> [nuevaContraseña] [rol]
// Crea o actualiza un operador directamente en el estado privado (Supabase).
// Roles válidos: SUPERADMIN | ADMIN | LECTOR_QR | CAJA_VENTAS | RRPP
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

const [username, given, roleArg] = process.argv.slice(2);
if (!username) {
  console.error(
    "Uso: node scripts/reset-admin-password.mjs <usuario> [nuevaContraseña] [rol]"
  );
  console.error("Roles: SUPERADMIN | ADMIN | LECTOR_QR | CAJA_VENTAS | RRPP");
  process.exit(1);
}
const VALID_ROLES = ["SUPERADMIN", "ADMIN", "LECTOR_QR", "CAJA_VENTAS", "RRPP"];
const role = roleArg || (username.trim().toLowerCase() === "superadmin" ? "SUPERADMIN" : "ADMIN");
if (!VALID_ROLES.includes(role)) {
  console.error(`Rol inválido "${role}". Válidos: ${VALID_ROLES.join(", ")}`);
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
if (!Array.isArray(state.adminUsers)) state.adminUsers = [];
let user = state.adminUsers.find(
  (u) => u.username.trim().toLowerCase() === username.trim().toLowerCase()
);
const created = !user;
if (!user) {
  // Se crea el operador si no existe (permite inicializar el sistema sin
  // contraseñas por defecto en el código fuente).
  user = {
    id: `usr-${username.trim().toLowerCase()}-${crypto.randomBytes(4).toString("hex")}`,
    username: username.trim(),
    role,
    fullName: username.trim(),
    assignedEventIds: [],
    active: true,
    createdAt: new Date().toISOString(),
  };
  state.adminUsers.push(user);
}
if (!state.adminUsers.some((u) => u.role === "SUPERADMIN" && u.active !== false)) {
  console.error(
    "Atención: el estado quedaría sin ningún SUPERADMIN activo. Creá uno con rol SUPERADMIN antes de continuar."
  );
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
console.log(
  created
    ? `Operador "${user.username}" creado con rol ${user.role}.`
    : `Contraseña de "${user.username}" actualizada.`
);
if (!given) console.log(`Contraseña nueva (guardala ahora, no se vuelve a mostrar): ${password}`);
