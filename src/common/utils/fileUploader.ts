import fs from "node:fs/promises";
import path from "node:path";

export async function saveBufferToUploads(buffer: Buffer, originalName: string) {
	const uploadsDir = path.resolve(process.cwd(), "uploads");
	await fs.mkdir(uploadsDir, { recursive: true });

	const safeName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, "_");
	const ext = path.extname(safeName);
	const base = safeName.replace(ext, "");
	let finalName = safeName;
	let counter = 0;
	while (true) {
		const candidate = counter === 0 ? finalName : `${base}_${counter}${ext}`;
		const fullPath = path.join(uploadsDir, candidate);
		try {
			await fs.access(fullPath);
			counter += 1;
		} catch (_) {
			finalName = candidate;
			break;
		}
	}

	const outPath = path.join(uploadsDir, finalName);
	await fs.writeFile(outPath, buffer);
	return { finalName, outPath, size: buffer.length };
}
