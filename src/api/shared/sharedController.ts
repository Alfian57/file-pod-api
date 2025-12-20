import type { Readable } from "node:stream";
import archiver from "archiver";
import type { Request, RequestHandler, Response } from "express";
import { logger } from "@/server";
import type { SharedFilePayload, SharedFolderPayload } from "./sharedModel";
import { sharedService } from "./sharedService";

class SharedController {
	public renderSharedPage: RequestHandler = async (req: Request, res: Response) => {
		const { token } = req.params;
		const svc = await sharedService.getSharedLinkMeta(token);

		if (svc.statusCode !== 200 || !svc.data) {
			// Render 404 Page
			return res.status(404).send(this.buildHtmlPage({ error: "Link not found or expired." }));
		}

		const meta = svc.data;
		return res.send(this.buildHtmlPage({ meta }));
	};

	public handleDownload: RequestHandler = async (req: Request, res: Response) => {
		const { token } = req.params;
		const { password } = req.body; // Expecting password from form POST

		const svc = await sharedService.getSharedLink(token, password);

		if (svc.statusCode !== 200) {
			// If Unauthorized (wrong password), re-render page with error
			const metaSvc = await sharedService.getSharedLinkMeta(token);
			if (metaSvc.data) {
				return res.status(401).send(this.buildHtmlPage({ meta: metaSvc.data, error: "Incorrect password" }));
			}
			return res.status(svc.statusCode).send(this.buildHtmlPage({ error: svc.message }));
		}

		const payload = svc.data as SharedFilePayload | SharedFolderPayload;
		try {
			if (payload.type === "file") {
				const file = payload.file;
				const objectStream = await sharedService.getObjectStream(file.filename);

				res.setHeader("Content-Disposition", `attachment; filename="${file.originalName}"`);
				res.setHeader("Content-Type", file.mimeType || "application/octet-stream");

				objectStream.pipe(res);

				objectStream.on("error", (err: Error) => {
					logger.error(`Stream error for shared file ${file.id}: ${err.message}`);
					if (!res.headersSent) res.status(500).send({ message: "Error streaming file" });
				});
				return;
			}

			if (payload.type === "folder") {
				const folder = payload.folder;
				const files: Array<{ id: string; originalName: string; filename: string }> = payload.files || [];

				res.setHeader("Content-Disposition", `attachment; filename="${folder.name}.zip"`);
				res.setHeader("Content-Type", "application/zip");

				const archive = archiver("zip", { zlib: { level: 9 } });
				archive.on("error", (err: Error) => {
					logger.error(`Archive error: ${err.message}`);
					if (!res.headersSent) res.status(500).send({ message: "Error creating zip" });
				});

				archive.pipe(res);

				for (const f of files) {
					try {
						const objectStream: Readable = await sharedService.getObjectStream(f.filename);
						archive.append(objectStream, { name: f.originalName });
					} catch (err: unknown) {
						logger.error(`Error fetching object ${f.filename}`);
					}
				}

				await archive.finalize();
				return;
			}
		} catch (ex: unknown) {
			logger.error(`Error handling shared download`);
			return res.status(500).send(this.buildHtmlPage({ error: "Download failed" }));
		}
	};

	private buildHtmlPage({ meta, error }: { meta?: any; error?: string }) {
		// Simple helper to format bytes
		const formatSize = (bytes: any) => {
			if (!bytes || bytes === "0") return "";
			const b = Number(bytes);
			if (b < 1024) return b + " B";
			if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
			return (b / (1024 * 1024)).toFixed(1) + " MB";
		};

		const title = meta ? `${meta.name} - Shared via FilePod` : "FilePod";

		// Use simpler SVG icons or just text if SVGs are too verbose to inline without classes
		// Here we use style attributes for limited styling on SVGs
		const icon =
			meta?.type === "folder"
				? '<svg style="width:64px;height:64px;color:#3b82f6;margin:0 auto;" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>'
				: '<svg style="width:64px;height:64px;color:#3b82f6;margin:0 auto;" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>';

		const sizeBadge = meta?.size && meta.size !== "0" ? `<span class="badge">${formatSize(meta.size)}</span>` : "";

		return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #2563eb;
            --primary-hover: #1d4ed8;
            --bg: #f3f4f6;
            --surface: rgba(255, 255, 255, 0.9);
            --text-main: #111827;
            --text-sub: #6b7280;
            --border: #e5e7eb;
            --error-bg: #fef2f2;
            --error-text: #ef4444;
        }
        body {
            font-family: 'Space Grotesk', sans-serif;
            background: var(--bg);
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 1rem;
        }
        .card {
            background: var(--surface);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            width: 100%;
            max-width: 448px;
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.5);
            text-align: center;
        }
        .error-box {
            background: var(--error-bg);
            color: var(--error-text);
            padding: 0.75rem;
            border-radius: 0.5rem;
            margin-bottom: 1.5rem;
            font-size: 0.875rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }
        .icon-container {
            margin-bottom: 1rem;
            display: flex;
            justify-content: center;
        }
        h1 {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-main);
            margin: 0 0 0.25rem 0;
            word-break: break-all;
        }
        p {
            font-size: 0.875rem;
            color: var(--text-sub);
            margin: 0;
        }
        .badge {
            display: inline-block;
            background: #f3f4f6;
            color: #4b5563;
            font-size: 0.75rem;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            margin-top: 0.5rem;
        }
        form {
            margin-top: 2rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .input-group {
            text-align: left;
        }
        label {
            display: block;
            font-size: 0.75rem;
            font-weight: 700;
            color: var(--text-sub);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.25rem;
            margin-left: 0.25rem;
        }
        input[type="password"] {
            width: 100%;
            box-sizing: border-box;
            padding: 0.75rem 1rem;
            border-radius: 0.75rem;
            border: 1px solid var(--border);
            font-family: inherit;
            outline: none;
            transition: all 0.2s;
            background: #f9fafb;
        }
        input[type="password"]:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
            background: white;
        }
        .btn {
            width: 100%;
            background: var(--primary);
            color: white;
            font-weight: 700;
            padding: 0.875rem 1.5rem;
            border-radius: 0.75rem;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -1px rgba(37, 99, 235, 0.1);
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            font-size: 1rem;
            font-family: inherit;
        }
        .btn:hover {
            background: var(--primary-hover);
            transform: translateY(-1px);
        }
        .btn:active {
            transform: translateY(0);
        }
        .footer {
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border);
            font-size: 0.75rem;
            color: #9ca3af;
        }
        .footer span {
            color: #4b5563;
            font-weight: 700;
        }
    </style>
</head>
<body>
    <div class="card">
        ${
					error
						? `
            <div class="error-box">
                <svg style="width:16px;height:16px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>${error}</span>
            </div>
        `
						: ""
				}

        ${
					!meta
						? `
            <div style="color: #9ca3af; margin-bottom: 1rem;">
                <svg style="width:64px;height:64px;margin:0 auto 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <h2 style="font-size: 1.25rem; font-weight: 700; color: #1f2937;">Content Not Found</h2>
            </div>
        `
						: `
            <div style="margin-bottom: 2rem;">
                <div class="icon-container">${icon}</div>
                <h1>${meta.name}</h1>
                <p>Shared by ${meta.ownerName}</p>
                ${sizeBadge}
            </div>

            <form action="/shared/${meta.token}/download" method="POST">
                ${
									meta.isPasswordProtected
										? `
                    <div class="input-group">
                        <label>Password Protected</label>
                        <input type="password" name="password" placeholder="Enter password to access" required>
                    </div>
                `
										: ""
								}
                
                <button type="submit" class="btn">
                    <svg style="width:20px;height:20px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Download ${meta.type === "folder" ? "Zip" : "File"}
                </button>
            </form>
        `
				}
        
        <div class="footer">
            Powered by <span>FilePod</span>
        </div>
    </div>
</body>
</html>
        `;
	}
}

export const sharedController = new SharedController();
