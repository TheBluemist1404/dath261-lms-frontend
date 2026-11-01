import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../../..");
const SKILL_DIR = path.resolve(__dirname, "..");
const ARTIFACTS_DIR = path.join(SKILL_DIR, "artifacts");
const PID_FILE = path.join(SKILL_DIR, ".run.pid");
const DEFAULT_PORT = 4173;
const BASE_URL = `http://localhost:${DEFAULT_PORT}`;

function ensureArtifactsDir() {
	if (!fs.existsSync(ARTIFACTS_DIR)) {
		fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
	}
}

async function pingUrl(url, timeoutMs = 2000) {
	return new Promise((resolve) => {
		const req = http.get(url, { timeout: timeoutMs }, (res) => {
			let data = "";
			res.on("data", (chunk) => (data += chunk));
			res.on("end", () =>
				resolve({
					ok: res.statusCode === 200,
					status: res.statusCode,
					body: data,
				}),
			);
		});
		req.on("error", (err) => resolve({ ok: false, error: err.message }));
		req.on("timeout", () => {
			req.destroy();
			resolve({ ok: false, error: "timeout" });
		});
	});
}

async function doctor() {
	ensureArtifactsDir();
	const report = {
		timestamp: new Date().toISOString(),
		nodeVersion: process.version,
		rootDir: ROOT_DIR,
		distExists: fs.existsSync(path.join(ROOT_DIR, "dist/index.html")),
	};

	const pingResult = await pingUrl(`${BASE_URL}/`);
	report.serverRunning = pingResult.ok;
	report.serverStatus = pingResult.status || null;

	const reportPath = path.join(ARTIFACTS_DIR, "doctor.json");
	fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

	console.log(`[verify-nodus doctor] Node: ${report.nodeVersion}`);
	console.log(
		`[verify-nodus doctor] Build dist: ${report.distExists ? "FOUND" : "MISSING (run build)"}`,
	);
	console.log(
		`[verify-nodus doctor] Preview server (${BASE_URL}): ${report.serverRunning ? "ONLINE (200 OK)" : "OFFLINE"}`,
	);
	console.log(`[verify-nodus doctor] Report saved: ${reportPath}`);

	return report.distExists;
}

async function launch() {
	const distHtml = path.join(ROOT_DIR, "dist/index.html");
	if (!fs.existsSync(distHtml)) {
		console.log("[verify-nodus launch] dist/ not found, building first...");
		execSync("pnpm build", { cwd: ROOT_DIR, stdio: "inherit" });
	}

	const existing = await pingUrl(`${BASE_URL}/`);
	if (existing.ok) {
		console.log(`[verify-nodus launch] Server already online at ${BASE_URL}`);
		return;
	}

	console.log(
		`[verify-nodus launch] Starting preview server on port ${DEFAULT_PORT}...`,
	);
	let pid = null;
	if (process.platform === "win32") {
		const root = ROOT_DIR.replace(/\\/g, "/");
		const psCmd = `(Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npx','vite','preview','--port','${DEFAULT_PORT}' -WorkingDirectory '${root}' -WindowStyle Hidden -PassThru).Id`;
		const out = execSync(`powershell.exe -NoProfile -Command "${psCmd}"`, {
			cwd: ROOT_DIR,
			encoding: "utf8",
		});
		pid = out.trim();
	} else {
		const child = spawn(
			"npx",
			["vite", "preview", "--port", String(DEFAULT_PORT)],
			{
				cwd: ROOT_DIR,
				detached: true,
				stdio: "ignore",
			},
		);
		pid = String(child.pid);
		child.unref();
	}

	if (pid) {
		fs.writeFileSync(PID_FILE, pid, "utf8");
	}

	let ready = false;
	const deadline = Date.now() + 15000;
	while (Date.now() < deadline) {
		await new Promise((r) => setTimeout(r, 300));
		const res = await pingUrl(`${BASE_URL}/`);
		if (res.ok) {
			ready = true;
			break;
		}
	}

	if (!ready) {
		console.error(
			"[verify-nodus launch] Failed to verify preview server startup within timeout.",
		);
		cleanup();
		process.exit(1);
	}

	console.log(`[verify-nodus launch] Server ready at ${BASE_URL} (pid ${pid})`);
}

async function drive(feature = "auth-login") {
	ensureArtifactsDir();
	console.log(`[verify-nodus drive] Driving feature: ${feature}...`);

	const pingResult = await pingUrl(`${BASE_URL}/`);
	const previewAvailable = pingResult.ok;

	if (previewAvailable) {
		const htmlRes = await pingUrl(`${BASE_URL}/login`);
		if (htmlRes.ok && htmlRes.body) {
			const snapshotPath = path.join(ARTIFACTS_DIR, "login-shell.html");
			fs.writeFileSync(snapshotPath, htmlRes.body, "utf8");
			console.log(
				`[verify-nodus drive] Captured HTML shell to ${snapshotPath}`,
			);
		}
	}

	let testCmd = "";
	if (feature === "auth-login") {
		testCmd = "pnpm test src/features/auth/components/login-form.test.tsx";
	} else if (feature === "auth-register") {
		testCmd =
			"pnpm test src/features/auth/components/register-form.test.tsx src/features/auth/components/role-toggle.test.tsx";
	} else if (feature === "protected-routes") {
		testCmd =
			"pnpm test src/features/auth/routing/guards.test.ts src/features/auth/routing/route-guards.adversarial.test.ts";
	} else if (feature === "role-navigation") {
		testCmd =
			"pnpm test src/features/admin/components/admin-route.test.tsx src/features/auth/session.test.ts";
	} else {
		testCmd = "pnpm test";
	}

	console.log(`[verify-nodus drive] Executing test verification: ${testCmd}`);
	let stdout = "";
	try {
		stdout = execSync(testCmd, { cwd: ROOT_DIR, encoding: "utf8" });
	} catch (err) {
		stdout = `${err.stdout || ""}\n${err.stderr || ""}`;
		throw err;
	} finally {
		const logPath = path.join(ARTIFACTS_DIR, `${feature}.log`);
		fs.writeFileSync(logPath, stdout, "utf8");
		console.log(`[verify-nodus drive] Proof artifact saved: ${logPath}`);
	}

	console.log(`[verify-nodus drive] Feature ${feature} verified successfully.`);
}

function cleanup() {
	if (fs.existsSync(PID_FILE)) {
		const pid = fs.readFileSync(PID_FILE, "utf8").trim();
		if (pid) {
			console.log(`[verify-nodus cleanup] Stopping process pid ${pid}...`);
			try {
				if (process.platform === "win32") {
					execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
				} else {
					process.kill(Number(pid), "SIGTERM");
				}
			} catch {
				// Process already stopped
			}
		}
		fs.unlinkSync(PID_FILE);
	}
	console.log(
		`[verify-nodus cleanup] Teardown complete. Artifacts in ${ARTIFACTS_DIR} preserved.`,
	);
}

const action = process.argv[2] || "doctor";
const target = process.argv[3];

if (action === "doctor") {
	doctor().then((ok) => process.exit(ok ? 0 : 1));
} else if (action === "launch") {
	launch();
} else if (action === "drive") {
	drive(target);
} else if (action === "cleanup") {
	cleanup();
} else {
	console.log("Usage: node verify.mjs [doctor|launch|drive <feature>|cleanup]");
	process.exit(1);
}
