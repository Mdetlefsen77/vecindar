import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parse } from "yaml";

const RUTA_WORKFLOW = join(
  process.cwd(),
  ".github/workflows/recordatorio-parte.yml",
);

type Paso = { run?: string; env?: Record<string, string> };

function scriptDelPaso(): string {
  const workflow = parse(readFileSync(RUTA_WORKFLOW, "utf8"));
  const pasos: Paso[] = Object.values<{ steps: Paso[] }>(workflow.jobs)[0]
    .steps;
  return pasos.at(-1)!.run!;
}

type Peticion = Pick<IncomingMessage, "method" | "url" | "headers">;

let cerrar: (() => void) | null = null;
afterEach(() => cerrar?.());

async function servidorLocal(status = 200) {
  const peticiones: Peticion[] = [];
  const server = createServer((req, res) => {
    peticiones.push({ method: req.method, url: req.url, headers: req.headers });
    res.statusCode = status;
    res.end(JSON.stringify({ ok: status === 200 }));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  cerrar = () => server.close();
  const { port } = server.address() as AddressInfo;
  return { peticiones, url: `http://127.0.0.1:${port}` };
}

function correrScript(env: Record<string, string>) {
  return new Promise<{ code: number; salida: string }>((resolve) => {
    execFile(
      "bash",
      ["-c", scriptDelPaso()],
      { env: { PATH: process.env.PATH ?? "", NODE_ENV: "test", ...env } },
      (error, stdout, stderr) => {
        const code = error ? Number(error.code ?? 1) : 0;
        resolve({ code, salida: stdout + stderr });
      },
    );
  });
}

describe("workflow recordatorio-parte", () => {
  it("I-102 · llama GET /api/cron/recordatorio-parte con Bearer y sale con 0", async () => {
    const { peticiones, url } = await servidorLocal();

    const { code } = await correrScript({
      CRON_SECRET: "secreto-de-prueba",
      SITE_URL: url,
    });

    expect(code).toBe(0);
    expect(peticiones).toHaveLength(1);
    expect(peticiones[0].method).toBe("GET");
    expect(peticiones[0].url).toBe("/api/cron/recordatorio-parte");
    expect(peticiones[0].headers.authorization).toBe(
      "Bearer secreto-de-prueba",
    );
  });

  it("I-103 · sin CRON_SECRET sale con 1, avisa con ::error:: y no llama al servidor", async () => {
    const { peticiones, url } = await servidorLocal();

    const { code, salida } = await correrScript({ SITE_URL: url });

    expect(code).toBe(1);
    expect(salida).toContain(
      "::error::Faltan el secret CRON_SECRET o la variable SITE_URL del repo.",
    );
    expect(peticiones).toHaveLength(0);
  });

  it("I-104 · sin SITE_URL sale con 1 y avisa con ::error::", async () => {
    const { code, salida } = await correrScript({
      CRON_SECRET: "secreto-de-prueba",
    });

    expect(code).toBe(1);
    expect(salida).toContain(
      "::error::Faltan el secret CRON_SECRET o la variable SITE_URL del repo.",
    );
  });

  it("I-105 · si el endpoint responde 401 el script sale con un código distinto de 0", async () => {
    const { url } = await servidorLocal(401);

    const { code } = await correrScript({
      CRON_SECRET: "secreto-equivocado",
      SITE_URL: url,
    });

    expect(code).not.toBe(0);
  });
});
