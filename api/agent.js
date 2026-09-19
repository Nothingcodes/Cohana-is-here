import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import fetch from 'node-fetch';
import path from 'path';
import sharp from 'sharp';
import crypto from 'node:crypto';
import fs from 'node:fs';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const GEMINI_API_KEY = '';

const STEEL_API_KEY = '';
const CONFIRMATION_SECRET = GEMINI_API_KEY;

const RUNTIME_CONFIG = {
    limits: {
        fileUploadBytes: 3_500_000,
        imageMaxDimension: 1280,
        imageJpegQuality: 82,
        vercelFunctionMaxMs: 290_000,
        timeoutGuardMs: 15_000,
        maxComputerUseTurnsPerRequest: 6,
        maxComputerUseTotalTurns: 120,
        confirmationTokenTtlMs: 10 * 60 * 1000,
        steelSessionTimeoutMs: 15 * 60 * 1000,
        screenshotMaxBytes: 7 * 1024 * 1024
    },
    models: {
        orchestrator: 'gemini-3.5-flash-lite',
        computerUse: 'gemini-3.5-flash-lite'
    },
    agents: {
        antigravity: 'antigravity-preview-09-2026',
        deepResearch: 'deep-research-preview-04-2026'
    }
};

if (!GEMINI_API_KEY) {
    console.warn('[Cohana Agent] GEMINI_API_KEY / GOOGLE_API_KEY is not configured.');
}
if (!STEEL_API_KEY) {
    console.warn('[Cohana Agent] STEEL_API_KEY is not configured. Computer Use will fail until configured.');
}

const client = new GoogleGenAI({
    apiKey: GEMINI_API_KEY
});

class RuntimeObservability {
    static logSessionState(sessionId, stage, details = {}) {
        console.log(
            `[Cohana Agent][${new Date().toISOString()}][Session: ${sessionId}][${stage}]`,
            JSON.stringify(details, null, 2)
        );
    }
}

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(
                () => reject(new Error('Stream Timeout')),
                Math.max(1_000, ms)
            )
        )
    ]);
}

async function getInteractionStream(clientInstance, interactionId, lastEventId) {
    const options = {
        stream: true,
        ...(lastEventId ? { last_event_id: lastEventId } : {})
    };
    try {
        return await clientInstance.interactions.get(interactionId, options);
    } catch (err) {
        return await clientInstance.interactions.get({ id: interactionId, ...options });
    }
}

async function withRetry(fn, retries = 3, initialDelayMs = 1_000) {
    let lastError = null;

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            const message = String(error?.message || '').toLowerCase();
            const isRetryable =
                error?.status === 429 ||
                message.includes('429') ||
                message.includes('quota exceeded') ||
                message.includes('rate limit') ||
                message.includes('temporarily unavailable') ||
                message.includes('service unavailable') ||
                message.includes('timeout') ||
                message.includes('econnreset') ||
                message.includes('socket hang up');

            if (!isRetryable || attempt === retries - 1) {
                throw error;
            }

            await new Promise(resolve =>
                setTimeout(resolve, initialDelayMs * Math.pow(2, attempt))
            );
        }
    }

    throw lastError || new Error('Request failed.');
}

function getMimeTypeFromFilename(filename) {
    const ext = path.extname(filename).toLowerCase();

    switch (ext) {
        case '.json': return 'application/json';
        case '.html': return 'text/html';
        case '.css': return 'text/css';
        case '.js':
        case '.mjs':
        case '.cjs': return 'application/javascript';
        case '.ts':
        case '.tsx': return 'text/typescript';
        case '.py': return 'text/x-python';
        case '.md': return 'text/markdown';
        case '.csv': return 'text/csv';
        case '.xml': return 'application/xml';
        case '.pdf': return 'application/pdf';
        case '.doc': return 'application/msword';
        case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case '.ppt': return 'application/vnd.ms-powerpoint';
        case '.pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        case '.png': return 'image/png';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.webp': return 'image/webp';
        case '.svg': return 'image/svg+xml';
        case '.zip': return 'application/zip';
        default: return 'text/plain';
    }
}

class PathGuard {
    static filename(value) {
        if (typeof value !== 'string') return 'file.txt';
        const normalized = value
            .replace(/\\/g, '/')
            .split('/')
            .filter(Boolean)
            .pop();
        if (!normalized) return 'file.txt';
        return normalized
            .replace(/\0/g, '')
            .replace(/^\.+$/, 'file.txt');
    }
}

async function compressImage(buffer, originalMime) {
    if (!buffer || !buffer.length || buffer.length < 100_000) {
        return { buffer, mime: originalMime };
    }

    try {
        const compressed = await sharp(buffer)
            .rotate()
            .resize({
                width: RUNTIME_CONFIG.limits.imageMaxDimension,
                height: RUNTIME_CONFIG.limits.imageMaxDimension,
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({
                quality: RUNTIME_CONFIG.limits.imageJpegQuality,
                mozjpeg: true,
                progressive: true
            })
            .withMetadata(false)
            .toBuffer();

        return { buffer: compressed, mime: 'image/jpeg' };
    } catch {
        return { buffer, mime: originalMime };
    }
}

async function prepareImageInputs(prompt, imageFiles, resolution = null) {
    const validImageFiles = (imageFiles || []).filter(
        file => file?.buffer && String(file?.mimetype || '').startsWith('image/')
    );
    
    if (!validImageFiles.length) {
        return prompt;
    }
    
    const inputs = [{ type: 'text', text: prompt }];
    
    for (const file of validImageFiles) {
        const { buffer, mime } = await compressImage(file.buffer, file.mimetype);
        const imagePart = {
            type: 'image',
            data: buffer.toString('base64'),
            mime_type: mime
        };
        if (resolution) {
            imagePart.resolution = resolution;
        }
        inputs.push(imagePart);
    }
    
    return inputs;
}

function prepareDeepResearchInputs(prompt, imageFiles, documentFiles) {
    const inputs = [{ type: 'text', text: prompt }];

    for (const file of imageFiles) {
        if (!file?.buffer) continue;
        inputs.push({
            type: 'image',
            data: file.buffer.toString('base64'),
            mime_type: file.mimetype || getMimeTypeFromFilename(file.originalname)
        });
    }

    for (const file of documentFiles) {
        if (!file?.buffer) continue;
        inputs.push({
            type: 'document',
            data: file.buffer.toString('base64'),
            mime_type: file.mimetype || getMimeTypeFromFilename(file.originalname)
        });
    }

    return inputs;
}

async function publishAgentOutputs(environmentId, safeSend, isRuntimeExpired) {
    if (!environmentId || isRuntimeExpired()) return [];
    if (!GEMINI_API_KEY) throw new Error('Gemini API key is not configured.');
    
    let fileList = [];
    
    // Query files using the Gemini Environment Files API
    try {
        if (client.environments?.files?.list) {
            const response = await client.environments.files.list({
                environment: environmentId,
                path: 'workspace/outputs',
                recursive: true
            });
            fileList = response.files || [];
        } else {
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/environments/${encodeURIComponent(environmentId)}/files/workspace/outputs?recursive=true`;
            const response = await fetch(listUrl, {
                method: 'GET',
                headers: { 'x-goog-api-key': GEMINI_API_KEY }
            });
            if (response.ok) {
                const data = await response.json();
                fileList = data.files || [];
            } else if (response.status !== 404) {
                const errText = await response.text().catch(() => '');
                console.warn(`[Files API] Listing workspace/outputs returned (${response.status}): ${errText.slice(0, 300)}`);
            }
        }
    } catch (listError) {
        console.warn('[Files API] Failed to list workspace/outputs via SDK, trying REST fallback:', listError.message);
        try {
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/environments/${encodeURIComponent(environmentId)}/files/workspace/outputs?recursive=true`;
            const response = await fetch(listUrl, {
                method: 'GET',
                headers: { 'x-goog-api-key': GEMINI_API_KEY }
            });
            if (response.ok) {
                const data = await response.json();
                fileList = data.files || [];
            }
        } catch (_) {}
    }
    
    if (!Array.isArray(fileList) || fileList.length === 0) {
        return [];
    }
    
    const shared = [];
    
    for (const file of fileList) {
        if (isRuntimeExpired()) break;
        
        const fileType = String(file.type || '').toUpperCase();
        if (fileType === 'DIRECTORY') continue;
        
        const rawPath = file.path || file.name || '';
        let cleanPath = rawPath.replace(/\\/g, '/').trim();
        while (cleanPath.startsWith('./')) cleanPath = cleanPath.slice(2);
        cleanPath = cleanPath.replace(/^\/+/, '');
        
        if (!cleanPath.startsWith('workspace/outputs/')) {
            cleanPath = `workspace/outputs/${cleanPath}`;
        }
        
        const relativePath = cleanPath.slice('workspace/outputs/'.length).replace(/^\/+/, '');
        if (!relativePath || relativePath.includes('..')) continue;
        
        const cleanName = PathGuard.filename(file.name || relativePath.split('/').pop());
        if (!cleanName) continue;
        
        const size = Number(file.size_bytes || file.sizeBytes || file.size || 0);
        const mimeType = file.mime_type || file.mimeType || getMimeTypeFromFilename(cleanName);
        
        // Download URL targets our single-file endpoint which proxies the Files API directly
        const fileUrl = `/api/agent/file?environment=${encodeURIComponent(environmentId)}&path=${encodeURIComponent(cleanPath)}`;
        
        const result = {
            status: 'success',
            filename: cleanName,
            path: `/workspace/outputs/${relativePath}`,
            url: fileUrl,
            mime_type: mimeType,
            size
        };
        
        shared.push(result);
        safeSend({ type: 'file_shared', ...result });
    }
    
    return shared;
}

function getUserMemoriesInstruction(userMemories) {
    return userMemories
        ? `\n\nUSER CONTEXT:\n${String(userMemories).slice(0, 20_000)}`
        : '';
}

function getOrchestratorInstruction(userMemories) {
    return `
You are Cohana Computer's Master Orchestrator, powered by cx5 family of models.
Your sole task is to analyze the user's intent and select exactly ONE primary execution agent to handle the task. Never attempt to execute the user's task yourself.

AVAILABLE EXECUTION AGENTS:
1. antigravity - Primary autonomous agent operating inside a full, sandboxed Linux remote environment with root access, local filesystem (/workspace/), native code execution (Python 3, Node.js, Bash), Google Search, URL context, and document/artifact creation tools. Generates downloadable deliverables under /workspace/outputs/.
2. computer_use - GUI browser automation agent. Choose ONLY when the task strictly requires interacting with a live web browser interface via mouse clicks, typing, scrolling, form navigation, or visual GUI web interactions.
3. deep_research - Long-running autonomous research, synthesis, literature review, and multi-source analysis agent equipped with Deep Research capabilities, Google Search, and URL Context.

ROUTING DECISION MATRIX:
- Choose 'antigravity' for: coding, repository tasks, data processing, file creation/editing, PDF/Word/PowerPoint deck generation, local script execution, command-line operations, archive extraction, document workflows, and general execution.
- Choose 'computer_use' for: tasks that explicitly require operating a live web browser GUI (e.g., logging into websites, filling forms interactively, clicking UI elements, browser-only navigation).
- Choose 'deep_research' for: deep market research, literature synthesis, multi-source evidence gathering, thorough investigations, or comparative research queries.

OUTPUT SPECIFICATION:
Return STRICT JSON ONLY matching this schema:
{
  "agent": "antigravity" | "computer_use" | "deep_research",
  "reason": "One concise sentence justifying the agent choice."
}
${getUserMemoriesInstruction(userMemories)}
`.trim();
}

function getAntigravityInstruction(userMemories, repository = null) {
    let repoDirective = '';
    if (repository && repository.url) {
        const targetPath = repository.target || '/workspace/repo';
        repoDirective = `
<attached_repository>
- Repository Name: "${repository.name || 'Repository'}"
- Git Source URL: ${repository.url}
- Workspace Mount Path: "${targetPath}"
- Repository Directives:
  1. Inspect "${targetPath}" first using command-line tools (e.g. \`ls -la "${targetPath}"\`, \`find "${targetPath}" -maxdepth 2\`, \`cat "${targetPath}/package.json"\`) to understand structure, build system, and dependencies before modifying anything.
  2. Treat "${targetPath}" as your primary project root. All code inspection, script executions, dependency installations, and modifications must be performed inside or relative to "${targetPath}".
  3. Modify and write code directly in "${targetPath}". Ensure all tests or builds pass within this root directory.
</attached_repository>
`;
    }
    
    return `
<identity>
You are Antigravity, a powerful agentic AI assistant designed by the Google DeepMind team working on Advanced Agentic Coding and autonomous problem solving.
You are pair programming with the user to solve their tasks end-to-end. Your goal is to solve as many things on your own as possible. Use your native tools to answer your own questions, inspect the environment, test hypotheses, and verify results. Ask the user a question only as a last resort.
If an approach is blocked or a command fails, do not brute-force the outcome or retry the exact same failing action repeatedly. Analyze the error output, inspect stack traces, consider alternative approaches or libraries, and resolve the underlying issue.
</identity>

<environment>
- Operating System: High-performance sandboxed Linux VM with full root privileges.
- Working Directory: Your active workspace is located at \`/workspace/\`. Always use absolute paths for all file operations.
- Runtimes & Tooling: Full access to Bash, Python 3, Node.js, package managers (\`apt\`, \`pip\`, \`npm\`), Linux CLI utilities, Google Search, URL Context, and mounted skill definitions (\`.agents/skills/*\`).
- Web Access: Perform web research natively using Google Search, URL Context, and command-line utilities (\`curl\`, \`fetch\`). You operate independently without live browser GUI handoffs.
</environment>
${repoDirective}
<deliverables_and_file_publishing>
- Artifact Publishing: Any downloadable deliverable, report, script output, PDF, Word document, spreadsheet, or slide deck MUST be saved directly in \`/workspace/outputs/\` (e.g., \`/workspace/outputs/analysis.pdf\`). Files saved here are automatically published via the Files API and provided to the user as direct download links.
- Format Selection: Default to Markdown (.md) for text deliverables unless the user explicitly requests Word, PDF, PowerPoint, or Excel.
- Critical Visual Asset Review: BEFORE declaring any visual asset or document complete (PDF, DOCX, PPTX, XLSX, charts, HTML renders), you MUST verify:
  1. No awkward text wrapping, mid-word hyphenation, or truncated labels.
  2. High-contrast typography between text and background colors.
  3. Clean multi-page pagination, margins, and headers/footers.
  4. The output file exists, is properly formatted, and is non-empty in \`/workspace/outputs/\`.
</deliverables_and_file_publishing>

<specialized_skills>
- Word Documents (.docx): Use \`python-docx\` or Node \`docx\` following \`.agents/skills/docx/SKILL.md\`. Apply modern typographic hierarchy, 1-inch margins, and styled tables.
- PDF Documents (.pdf): Use \`reportlab\`, \`pypdf\`, or headless Chromium/Puppeteer following \`.agents/skills/pdfs/SKILL.md\`. Ensure dynamic page numbers ("Page X of Y") and clean layouts.
- Presentation Decks (.pptx): Use \`python-pptx\` following \`.agents/skills/slides/SKILL.md\`. Use 16:9 widescreen, bold visual cards, high contrast, and structured takeaways. Avoid dense walls of text.
- Spreadsheets (.xlsx/.csv): Use \`openpyxl\`, \`xlsxwriter\`, or \`pandas\` following \`.agents/skills/xlsx/SKILL.md\`. Add styled header rows, autowidth columns, and explicit formula calculations.
</specialized_skills>

<style_and_communication>
- Language: ALWAYS respond in the user's language. All generated artifacts (reports, decks, documents) must match the user's language.
- Tone: Helpful, clear, concise, and professional software engineering collaborator. Avoid filler phrases ("To achieve this", "Here is the plan", "Let's get started").
- Formatting: Format responses in clean GitHub-style Markdown with clear section headers (\`##\`, \`###\`). Never leak internal tool names or raw internal system markers in your final text.
- Punctuation & Emojis: Avoid exclamation points and unprompted emojis unless explicitly requested.
- Citations: When citing real-world facts from web search or URL context, use natural inline Markdown links: \`[Source Name](url)\`. Never use generic anchors like \`[source]\` or raw unlinked URLs. In generated documents, include full source URLs.
</style_and_communication>
${getUserMemoriesInstruction(userMemories)}
`.trim();
}

const SKILL_REGISTRY = {
    docx: {
        type: 'inline',
        target: '.agents/skills/docx/SKILL.md',
        content: `# Word Document Creation and Processing Skill (.docx)

## Overview
Use Python's \`python-docx\` library or Node.js \`docx\` package to programmatically create, edit, and format Microsoft Word (.docx) documents.

## Execution Directives
- **Output Path**: Save all generated Word files under \`/workspace/outputs/\` (e.g., \`/workspace/outputs/report.docx\`).
- **Design & Formatting**:
  - Apply modern typographic hierarchy (Document Title, Subtitle, Heading 1-3, Body Text).
  - Set professional page margins (1 inch / 2.54 cm).
  - Use custom color palettes for headings and visual accents.
  - Standardize table formatting with styled header rows, padding, and subtle borders.
  - Add headers/footers with document title and page numbers where applicable.
- **Validation**: Always verify created files exist and are non-empty before finishing.`
    },
    pdfs: {
        type: 'inline',
        target: '.agents/skills/pdfs/SKILL.md',
        content: `# PDF Generation and Processing Skill (.pdf)

## Overview
Use Python (\`reportlab\`, \`fpdf2\`, \`pypdf\`, \`pdfplumber\`) or Node.js (\`pdfkit\`, \`puppeteer\`) to generate, convert, inspect, and manipulate PDF documents.

## Execution Directives
- **Output Path**: Save all generated PDF files under \`/workspace/outputs/\` (e.g., \`/workspace/outputs/document.pdf\`).
- **Design & Layout**:
  - Ensure clean multi-page pagination with headers, footers, dynamic page numbers ("Page X of Y"), and proper margins.
  - For complex graphic layouts, render HTML/CSS and print to PDF via headless Chromium/Puppeteer or Python ReportLab canvas/platypus.
  - Embed clear typography, structured headings, and visual dividers.
- **Validation**: Verify that generated PDF files are saved to \`/workspace/outputs/\` and rendered properly.`
    },
    slides: {
        type: 'inline',
        target: '.agents/skills/slides/SKILL.md',
        content: `# Presentation Decks Skill (.pptx / .pdf)

## Overview
Use Python's \`python-pptx\` or HTML/CSS rendered to PDF/slides to generate clean, high-impact presentation decks.

## Execution Directives
- **Output Path**: Save all presentation files under \`/workspace/outputs/\` (e.g., \`/workspace/outputs/presentation.pptx\`).
- **Design Rules**:
  - Standard widescreen aspect ratio (16:9).
  - High-contrast visual hierarchy: high-impact slide title, concise subtitle, bulleted takeaways, and visual callouts/cards.
  - Modern aesthetic: clean dark or light theme background, consistent color scheme (primary accent + neutral dark/light background).
  - Avoid dense text walls; split complex information across distinct visual cards or multiple slides.
- **Validation**: Ensure presentation files are exported cleanly to \`/workspace/outputs/\`.`
    },
    xlsx: {
        type: 'inline',
        target: '.agents/skills/xlsx/SKILL.md',
        content: `# Excel Spreadsheet and Table Processing Skill (.xlsx / .csv)

## Overview
Use Python's \`openpyxl\`, \`xlsxwriter\`, or \`pandas\` to generate, format, analyze, and style Excel spreadsheets and complex tabular datasets.

## Execution Directives
- **Output Path**: Save all generated spreadsheets under \`/workspace/outputs/\` (e.g., \`/workspace/outputs/data_summary.xlsx\`).
- **Styling & Formulas**:
  - Format headers with background fills, bold white/dark text, and auto-adjusted column widths.
  - Use Excel formulas (\`SUM\`, \`AVERAGE\`, \`VLOOKUP\`, \`COUNTIF\`) where appropriate.
  - Format currencies, percentages, and dates with explicit number formatting.
  - Add conditional formatting or visual zebra striping for large tables.
- **Validation**: Verify the spreadsheet file is written cleanly to \`/workspace/outputs/\`.`
    }
};

const PLUGIN_ALIAS_MAP = {
    // Word / DOCX
    word: 'docx',
    docx: 'docx',
    doc: 'docx',
    
    // PDF
    pdf: 'pdfs',
    pdfs: 'pdfs',
    document: 'pdfs',
    
    // Slides / Presentation
    presentation: 'slides',
    slides: 'slides',
    slide: 'slides',
    powerpoint: 'slides',
    pptx: 'slides',
    ppt: 'slides',
    deck: 'slides',
    
    // Excel / Tables
    table: 'xlsx',
    tables: 'xlsx',
    excel: 'xlsx',
    xlsx: 'xlsx',
    xls: 'xlsx',
    sheet: 'xlsx',
    sheets: 'xlsx',
    spreadsheet: 'xlsx',
    spreadsheets: 'xlsx',
    csv: 'xlsx'
};

function resolveSkillsFromPlugins(input) {
    if (!input) return [];
    
    let pluginKeys = [];
    
    if (Array.isArray(input)) {
        pluginKeys = input.map(item => String(item || '').replace(/^@/, '').toLowerCase().trim());
    } else if (typeof input === 'string') {
        const matches = input.match(/@([a-zA-Z0-9_-]+)/g) || [];
        pluginKeys = matches.map(m => m.slice(1).toLowerCase().trim());
    }
    
    const matchedSkillKeys = new Set();
    
    for (const key of pluginKeys) {
        const canonicalKey = PLUGIN_ALIAS_MAP[key];
        if (canonicalKey && SKILL_REGISTRY[canonicalKey]) {
            matchedSkillKeys.add(canonicalKey);
        }
    }
    
    return Array.from(matchedSkillKeys).map(key => SKILL_REGISTRY[key]);
}

async function handleSkillsEndpoint(req, res) {
    try {
        const body = req.body || {};
        const queryInput = body.plugins || body.prompt || req.query.q || '';
        const matchedSkills = resolveSkillsFromPlugins(queryInput);
        
        return res.json({
            ok: true,
            count: matchedSkills.length,
            skills: matchedSkills
        });
    } catch (error) {
        console.error('[Cohana Skills Endpoint Error]', error);
        return res.status(500).json({
            ok: false,
            error: error?.message || 'Failed to resolve skills for requested plugins.'
        });
    }
}

const BROWSER_TASK_TOOL = {
    type: 'function',
    name: 'browser_task',
    description: 'Hand a live browser GUI task to Cohana Computer Use. Calling this function permanently hands off browser execution; Antigravity must stop afterwards.',
    parameters: {
        type: 'object',
        properties: {
            start_url: {
                type: 'string',
                description: 'Optional URL where the Computer Use browser should start.'
            },
            task: {
                type: 'string',
                description: 'Required precise description of what Computer Use should do in the browser.'
            }
        },
        required: ['task']
    }
};
function getDomainFromUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.hostname;
    } catch {
        return 'github.com';
    }
}

function buildNetworkConfig(repository) {
    if (!repository || !repository.token) return null;
    const token = String(repository.token).trim();
    if (!token) return null;
    const domain = getDomainFromUrl(repository.url);
    const basicAuth = Buffer.from(`x-oauth-basic:${token}`).toString('base64');
    return {
        allowlist: [
            {
                domain,
                transform: {
                    Authorization: `Basic ${basicAuth}`
                }
            },
            {
                domain: '*'
            }
        ]
    };
}
function buildAntigravityEnvironment(existingEnvironmentId, imageFiles, dynamicSkills = [], repository = null) {
    const network = buildNetworkConfig(repository);
    
    // When an existing environment is present, reuse it (refreshing network credentials if a token is present)
    if (existingEnvironmentId) {
        if (network) {
            return {
                type: 'remote',
                environment_id: existingEnvironmentId,
                network
            };
        }
        return existingEnvironmentId;
    }
    
    const sources = [];
    
    if (repository && repository.url) {
        sources.push({
            type: 'repository',
            source: repository.url,
            target: repository.target || '/workspace/repo'
        });
    }
    
    if (Array.isArray(dynamicSkills) && dynamicSkills.length > 0) {
        sources.push(...dynamicSkills);
    }
    
    return {
        type: 'remote',
        ...(sources.length ? { sources } : {}),
        ...(network ? { network } : {})
    };
}

function getPendingFunctionCalls(interaction) {
    const calls = new Map();
    const results = new Set();

    for (const step of interaction?.steps || []) {
        if (step?.type === 'function_call' && step.id) {
            calls.set(step.id, step);
        }
        if (step?.type === 'function_result' && step.call_id) {
            results.add(step.call_id);
        }
    }

    return Array.from(calls.values()).filter(step => !results.has(step.id));
}

function getStepText(interaction) {
    const parts = [];
    for (const step of interaction?.steps || []) {
        if (step?.type !== 'model_output') continue;
        for (const item of step.content || []) {
            if (item?.type === 'text' && item.text) parts.push(item.text);
        }
    }
    return parts.join('\n');
}

function getLatestImages(interaction) {
    const images = [];
    for (const step of interaction?.steps || []) {
        if (step?.type !== 'model_output') continue;
        for (const item of step.content || []) {
            if (item?.type === 'image' && item.data) {
                images.push({ data: item.data, mime_type: item.mime_type || 'image/png' });
            }
        }
    }
    return images;
}

function getAgentIdentity(interaction) {
    const direct = interaction?.agent;
    if (direct === RUNTIME_CONFIG.agents.antigravity || direct?.includes('antigravity')) return 'antigravity';
    if (direct === RUNTIME_CONFIG.agents.deepResearch || direct?.includes('deep-research')) return 'deep_research';
    if (direct === 'computer_use' || interaction?.model === RUNTIME_CONFIG.models.computerUse) return 'computer_use';
    
    for (const step of interaction?.steps || []) {
        if (step?.type === 'code_execution_call' || step?.type === 'code_execution_result') {
            return 'antigravity';
        }
        if (step?.type === 'function_call' && (step.name === 'yield_to_user' || step.name === 'click' || step.name === 'type')) {
            return 'computer_use';
        }
    }
    
    const raw = JSON.stringify(interaction?.steps || interaction || '');
    const marker = raw.match(/\[COHANA_AGENT=(antigravity|deep_research|computer_use)\]/i);
    return marker?.[1]?.toLowerCase() || null;
}

function buildAgentInputMarker(agent, text) {
    return `[COHANA_AGENT=${agent}]\n${text}`;
}

function extractComputerState(interaction) {
    const raw = JSON.stringify(interaction?.steps || []);
    const match = raw.match(/COHANA_BROWSER_SESSION=([A-Za-z0-9_-]+)/);
    return match?.[1] || null;
}

function signConfirmation(payload) {
    if (!CONFIRMATION_SECRET) {
        throw new Error('COHANA_CONFIRMATION_SECRET or GEMINI_API_KEY is required for confirmations.');
    }
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
        .createHmac('sha256', CONFIRMATION_SECRET)
        .update(body)
        .digest('base64url');
    return `${body}.${signature}`;
}

function verifyConfirmation(token) {
    if (!CONFIRMATION_SECRET || typeof token !== 'string') {
        throw new Error('Invalid confirmation token.');
    }

    const [body, signature] = token.split('.');
    if (!body || !signature) throw new Error('Invalid confirmation token.');

    const expected = crypto
        .createHmac('sha256', CONFIRMATION_SECRET)
        .update(body)
        .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        throw new Error('Invalid confirmation token signature.');
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.expires_at || Date.now() > payload.expires_at) {
        throw new Error('Confirmation token has expired.');
    }
    return payload;
}

function denormalizeX(x, width) {
    const value = Number(x);
    if (!Number.isFinite(value)) {
        throw new Error(`Invalid Computer Use x coordinate: ${x}`);
    }
    return Math.max(0, Math.min(width - 1, Math.floor((value / 1000) * width)));
}

function denormalizeY(y, height) {
    const value = Number(y);
    if (!Number.isFinite(value)) {
        throw new Error(`Invalid Computer Use y coordinate: ${y}`);
    }
    return Math.max(0, Math.min(height - 1, Math.floor((value / 1000) * height)));
}

function getComputerViewport(page) {
    const viewport = page?.viewport?.() || {};
    return {
        width: Number(viewport.width) > 0 ? Number(viewport.width) : 1280,
        height: Number(viewport.height) > 0 ? Number(viewport.height) : 800
    };
}

function formatComputerAction(action, screen) {
    const name = String(action?.name || 'unknown');
    const args = action?.arguments || {};
    const chunks = [];

    if (args.x != null || args.y != null) {
        chunks.push(`{x:${args.x ?? 'â'}, y:${args.y ?? 'â'}}`);
    } else if (
        args.start_x != null || args.start_y != null ||
        args.end_x != null || args.end_y != null
    ) {
        chunks.push(
            `{start:{x:${args.start_x ?? 'â'}, y:${args.start_y ?? 'â'}}, ` +
            `end:{x:${args.end_x ?? 'â'}, y:${args.end_y ?? 'â'}}}`
        );
    }

    if (typeof args.intent === 'string' && args.intent.trim()) {
        chunks.push(`intent:${JSON.stringify(args.intent.trim())}`);
    }

    if (typeof args.url === 'string' && args.url) {
        chunks.push(`url:${JSON.stringify(args.url)}`);
    }

    if (typeof args.key === 'string' && args.key) {
        chunks.push(`key:${JSON.stringify(args.key)}`);
    }

    if (typeof args.direction === 'string' && args.direction) {
        chunks.push(`direction:${JSON.stringify(args.direction)}`);
    }

    if (args.magnitude_in_pixels != null) {
        chunks.push(`magnitude:${Number(args.magnitude_in_pixels)}`);
    }

    // Do not expose entered text back to the client. It may contain secrets,
    // credentials, OTPs, payment data, or other sensitive user input.
    if (['type', 'type_text_at'].includes(name)) {
        chunks.push('text:[redacted]');
    }

    return `[${name}: ${chunks.join(' ')}]`;
}

function serializeComputerActionForClient(action, screen) {
    const args = { ...(action?.arguments || {}) };
    if (['type', 'type_text_at'].includes(action?.name) && 'text' in args) {
        args.text = '[redacted]';
    }

    const normalized = {
        x: action?.arguments?.x ?? null,
        y: action?.arguments?.y ?? null,
        start_x: action?.arguments?.start_x ?? null,
        start_y: action?.arguments?.start_y ?? null,
        end_x: action?.arguments?.end_x ?? null,
        end_y: action?.arguments?.end_y ?? null
    };

    let pixels = null;
    if (normalized.x != null && normalized.y != null) {
        pixels = {
            x: denormalizeX(normalized.x, screen.width),
            y: denormalizeY(normalized.y, screen.height)
        };
    }

    return {
        id: action?.id || null,
        name: action?.name || null,
        arguments: args,
        intent: typeof action?.arguments?.intent === 'string'
            ? action.arguments.intent
            : null,
        safety_decision: action?.arguments?.safety_decision || null,
        display: formatComputerAction(action, screen),
        coordinates: {
            normalized,
            pixels,
            viewport: {
                width: screen.width,
                height: screen.height
            }
        }
    };
}

async function executeComputerAction(page, action, screen) {
    const name = action?.name;
    const args = action?.arguments || {};
    const x = args.x == null ? null : denormalizeX(args.x, screen.width);
    const y = args.y == null ? null : denormalizeY(args.y, screen.height);

    switch (name) {
        case 'open_web_browser':
        case 'open_app':
            return { ok: true };

        case 'click':
        case 'click_at':
            await page.mouse.click(x, y);
            break;

        case 'double_click':
            await page.mouse.dblclick(x, y);
            break;

        case 'triple_click':
            await page.mouse.click(x, y, { clickCount: 3 });
            break;

        case 'middle_click':
            await page.mouse.click(x, y, { button: 'middle' });
            break;

        case 'right_click':
            await page.mouse.click(x, y, { button: 'right' });
            break;

        case 'mouse_down':
            await page.mouse.move(x, y);
            await page.mouse.down();
            break;

        case 'mouse_up':
            await page.mouse.move(x, y);
            await page.mouse.up();
            break;

        case 'move':
        case 'hover_at':
            await page.mouse.move(x, y);
            break;

        case 'type':
        case 'type_text_at':
            if (x != null && y != null) {
                await page.mouse.click(x, y);
            }
            if (args.clear_before_typing !== false) {
                await page.keyboard.down('Control').catch(() => {});
                await page.keyboard.press('A').catch(() => {});
                await page.keyboard.up('Control').catch(() => {});
                await page.keyboard.press('Backspace').catch(() => {});
            }
            await page.keyboard.type(String(args.text || ''));
            if (args.press_enter) {
                await page.keyboard.press('Enter');
            }
            break;

        case 'drag_and_drop': {
            const sx = denormalizeX(args.start_x, screen.width);
            const sy = denormalizeY(args.start_y, screen.height);
            const ex = denormalizeX(args.end_x, screen.width);
            const ey = denormalizeY(args.end_y, screen.height);
            await page.mouse.move(sx, sy);
            await page.mouse.down();
            await page.mouse.move(ex, ey, { steps: 10 });
            await page.mouse.up();
            break;
        }

        case 'wait':
        case 'wait_5_seconds':
            await new Promise(resolve =>
                setTimeout(
                    resolve,
                    Math.min(10_000, Number(args.seconds || 5) * 1000)
                )
            );
            break;

        case 'press_key':
            await page.keyboard.press(String(args.key || 'Enter'));
            break;

        case 'key_combination':
            await page.keyboard.press(String(args.keys || 'Control+A'));
            break;

        case 'hotkey':
            await page.keyboard.press(
                Array.isArray(args.keys)
                    ? args.keys.join('+')
                    : String(args.keys || 'Control+A')
            );
            break;

        case 'key_down':
            await page.keyboard.down(String(args.key));
            break;

        case 'key_up':
            await page.keyboard.up(String(args.key));
            break;

        case 'take_screenshot':
            break;

        case 'scroll':
        case 'scroll_at': {
            const direction = String(args.direction || 'down').toLowerCase();
            const magnitude = Number(
                args.magnitude_in_pixels ?? args.magnitude ?? 300
            );
            const delta =
                direction === 'up'
                    ? -magnitude
                    : direction === 'left'
                        ? -magnitude
                        : magnitude;
            await page.mouse.move(
                x ?? screen.width / 2,
                y ?? screen.height / 2
            );
            if (direction === 'left' || direction === 'right') {
                await page.mouse.wheel(delta, 0);
            } else {
                await page.mouse.wheel(0, delta);
            }
            break;
        }

        case 'scroll_document':
            await page.evaluate(
                direction => {
                    window.scrollBy(
                        0,
                        String(direction).toLowerCase() === 'up'
                            ? -800
                            : 800
                    );
                },
                args.direction || 'down'
            );
            break;

        case 'navigate':
            await page.goto(
                String(args.url),
                { waitUntil: 'domcontentloaded', timeout: 30_000 }
            ).catch(() => {});
            break;

        case 'go_back':
            await page.goBack({
                waitUntil: 'domcontentloaded',
                timeout: 15_000
            }).catch(() => {});
            break;

        case 'go_forward':
            await page.goForward({
                waitUntil: 'domcontentloaded',
                timeout: 15_000
            }).catch(() => {});
            break;

        default:
            throw new Error(`Unsupported Computer Use action: ${name}`);
    }

    await page.waitForNavigation({
        waitUntil: 'domcontentloaded',
        timeout: 1500
    }).catch(() => {});

    return { ok: true, url: page.url() };
}

async function getComputerFunctionResults(page, actions) {
    const screenshotBuffer = await page.screenshot({ type: 'png' });
    if (screenshotBuffer.length > RUNTIME_CONFIG.limits.screenshotMaxBytes) {
        throw new Error('Computer Use screenshot exceeds configured size limit.');
    }

    const screenshot = screenshotBuffer.toString('base64');
    const currentUrl = page.url();

    return actions.map(({ name, callId, result, safetyAcknowledgement }) => ({
        type: 'function_result',
        name,
        call_id: callId,
        result: [
            {
                type: 'text',
                text: JSON.stringify({ url: currentUrl, ...result })
            },
            {
                type: 'image',
                data: screenshot,
                mime_type: 'image/png',
                resolution: 'ultra_high'
            },
            ...(safetyAcknowledgement
                ? [{ type: 'text', text: JSON.stringify({ safety_acknowledgement: true }) }]
                : [])
        ]
    }));
}

async function resolveConfirmationForAction(action, interactionId, browserSessionId) {
    const safetyDecision = action?.arguments?.safety_decision;
    if (!safetyDecision || safetyDecision.decision !== 'require_confirmation') return null;

    return signConfirmation({
        version: 1,
        expires_at: Date.now() + RUNTIME_CONFIG.limits.confirmationTokenTtlMs,
        action,
        interaction_id: interactionId,
        browser_session_id: browserSessionId
    });
}

async function streamInteraction({
    stream,
    safeSend,
    agent,
    state,
    isRuntimeExpired,
    onEvent,
    screen = { width: 1280, height: 800 }
}) {
    const functionCalls = new Map();
    let currentStep = null;
    let accumulatedCode = '';

    const emitFunctionCall = (call) => {
        const action = serializeComputerActionForClient(call, screen);
        safeSend({
            type: 'tool_call',
            agent,
            name: call.name || 'function',
            step_type: 'function_call',
            native: true,
            id: call.id || null,
            arguments: action.arguments,
            intent: action.intent,
            safety_decision: action.safety_decision,
            coordinates: action.coordinates,
            display: action.display,
            label: action.display
        });
    };

    for await (const event of stream) {
        if (isRuntimeExpired()) {
            if (typeof stream.return === 'function') {
                await stream.return().catch(() => {});
            }
            return {
                timedOut: true,
                completed: false,
                interaction: null
            };
        }

        const currentEventId = event.event_id || event.eventId || event.id;
        if (currentEventId) {
            state.lastEventId = currentEventId;
            safeSend({ type: 'event_id', id: currentEventId });
        }

        if (
            event.event_type === 'interaction.created' ||
            event.interaction?.id
        ) {
            const interaction = event.interaction;
            if (interaction?.id) {
                state.interactionId = interaction.id;
                safeSend({ type: 'interaction_id', id: interaction.id });
            }
            if (interaction?.environment_id) {
                state.environmentId = interaction.environment_id;
                safeSend({ type: 'environment_id', id: interaction.environment_id });
            }
        }

        if (event.event_type === 'interaction.status_update') {
            const status =
                event.status ||
                event.interaction?.status ||
                event.interaction_status ||
                'in_progress';

            state.status = status;
            if (status === 'requires_action') {
                state.requiresAction = true;
            }

            safeSend({
                type: 'status',
                status,
                agent
            });
        }

        if (event.event_type === 'step.start') {
            const step = event.step || {};
            currentStep = { ...step };
            accumulatedCode = '';

            if (step.type === 'function_call') {
                const key = event.index ?? step.index ?? step.id ?? functionCalls.size;
                functionCalls.set(key, {
                    index: key,
                    id: step.id || null,
                    name: step.name || 'function',
                    arguments:
                        step.arguments &&
                        typeof step.arguments === 'object'
                            ? { ...step.arguments }
                            : {},
                    rawArguments: ''
                });
            } else if (step.type === 'code_execution_call' || step.type === 'executable_code') {
                accumulatedCode = step.code || step.arguments?.code || '';
                safeSend({
                    type: 'code_execution_call',
                    agent,
                    language: step.language || 'python',
                    code: accumulatedCode,
                    id: step.id || null
                });
            } else if (step.type === 'code_execution_result' || step.type === 'code_result') {
                safeSend({
                    type: 'code_execution_result',
                    agent,
                    outcome: step.outcome || 'success',
                    output: step.output || step.content || '',
                    id: step.id || step.call_id || null
                });
            } else {
                if (step.type === 'url_context_call') {
                    const urls = step.urls || (step.url ? [step.url] : []) || [];
                    safeSend({
                        type: 'url_context_call',
                        agent,
                        urls,
                        url: urls[0] || '',
                        id: step.id || null
                    });
                } else if (step.type === 'url_context_result') {
                    safeSend({
                        type: 'url_context_result',
                        agent,
                        urls: step.urls || [],
                        results: step.results || step.content || step.output || '',
                        id: step.id || null
                    });
                } else if (step.type === 'google_search_call') {
                    safeSend({
                        type: 'google_search_call',
                        agent,
                        query: step.query || step.queries || '',
                        id: step.id || null
                    });
                } else if (step.type === 'google_search_result') {
                    safeSend({
                        type: 'google_search_result',
                        agent,
                        results: step.results || step.grounding_chunks || [],
                        id: step.id || null
                    });
                }

                safeSend({
                    type: 'tool_call',
                    agent,
                    name: step.name || step.type || 'native_tool',
                    step_type: step.type || null,
                    native: true,
                    label:
                        step.type === 'google_search_call'
                            ? 'Searching the web'
                            : step.type === 'url_context_call'
                                ? 'Reading URL'
                                : step.type === 'filesystem'
                                    ? 'Managing files'
                                    : `Running ${step.type || step.name || 'agent operation'}`
                });
            }
        }

        if (event.event_type === 'step.delta') {
            const delta = event.delta;
            if (!delta) continue;

            if (currentStep && (currentStep.type === 'code_execution_call' || currentStep.type === 'executable_code')) {
                const codeChunk = delta.code || delta.text || (typeof delta === 'string' ? delta : '');
                accumulatedCode += codeChunk;
                safeSend({
                    type: 'code_execution_call',
                    agent,
                    code: accumulatedCode,
                    language: currentStep.language || delta.language || 'python',
                    id: currentStep.id || null
                });
                continue;
            }

            if (delta.type === 'text' && delta.text) {
                safeSend({ type: 'text', content: delta.text, agent });
                continue;
            }

            if (delta.type === 'thought_summary') {
                const thought =
                    delta.content?.text ||
                    delta.text ||
                    '';
                if (thought) {
                    safeSend({
                        type: 'thought',
                        content: thought,
                        agent
                    });
                }
                continue;
            }

            if (delta.type === 'thought_signature') {
                const signature =
                    delta.signature ||
                    delta.content?.signature ||
                    '';
                if (signature) {
                    safeSend({
                        type: 'thought_signature',
                        content: signature,
                        agent
                    });
                }
                continue;
            }

            if (delta.type === 'arguments_delta') {
                const key = event.index ?? delta.index ?? null;
                const call = functionCalls.get(key);
                if (call) {
                    const fragment =
                        typeof delta.arguments === 'string'
                            ? delta.arguments
                            : typeof delta.content === 'string'
                                ? delta.content
                                : '';
                    call.rawArguments += fragment;
                }
                continue;
            }

            if (delta.type === 'image') {
                const imageData =
                    delta.data ||
                    delta.image?.data ||
                    delta.image;

                if (imageData) {
                    safeSend({
                        type:
                            agent === 'deep_research'
                                ? 'image_data'
                                : 'code_image',
                        mimeType:
                            delta.mime_type ||
                            delta.image?.mime_type ||
                            'image/png',
                        data: imageData,
                        agent,
                        call_id: currentStep?.id || currentStep?.call_id || null
                    });
                }
            }
        }

        if (event.event_type === 'step.stop') {
            const step = event.step || {};
            const key = event.index ?? step.index ?? step.id ?? null;
            const call = functionCalls.get(key);

            if (call) {
                let args = { ...call.arguments };

                if (call.rawArguments) {
                    try {
                        const parsed = JSON.parse(call.rawArguments);
                        if (
                            parsed &&
                            typeof parsed === 'object' &&
                            !Array.isArray(parsed)
                        ) {
                            args = parsed;
                        }
                    } catch (error) {
                        RuntimeObservability.logSessionState(
                            state.interactionId || 'unknown',
                            'COMPUTER_USE_ARGUMENT_PARSE_WARNING',
                            {
                                agent,
                                name: call.name,
                                error: error?.message || 'Invalid JSON'
                            }
                        );
                    }
                }

                emitFunctionCall({
                    id: call.id,
                    name: call.name,
                    arguments: args
                });

                safeSend({
                    type: 'tool_call_complete',
                    agent,
                    name: call.name,
                    step_type: 'function_call',
                    native: true,
                    id: call.id || null,
                    display: formatComputerAction(
                        { name: call.name, arguments: args },
                        screen
                    )
                });

                functionCalls.delete(key);
            } else if (step.type === 'code_execution_call' || step.type === 'executable_code' || currentStep?.type === 'code_execution_call') {
                const code = step.code || step.arguments?.code || accumulatedCode || currentStep?.code || '';
                safeSend({
                    type: 'code_execution_call',
                    agent,
                    language: step.language || currentStep?.language || 'python',
                    code,
                    id: step.id || currentStep?.id || null
                });
            } else if (step.type === 'code_execution_result' || step.type === 'code_result' || currentStep?.type === 'code_execution_result') {
                let outputText = '';
                const images = [];
                const rawOutput = step.output ?? step.content ?? currentStep?.output ?? currentStep?.content;

                if (typeof rawOutput === 'string') {
                    outputText = rawOutput;
                } else if (Array.isArray(rawOutput)) {
                    for (const part of rawOutput) {
                        if (part?.type === 'text' && part.text) {
                            outputText += (outputText ? '\n' : '') + part.text;
                        } else if (part?.type === 'image' && (part.data || part.image?.data)) {
                            images.push({
                                data: part.data || part.image?.data,
                                mimeType: part.mime_type || part.image?.mime_type || 'image/png'
                            });
                        }
                    }
                } else if (rawOutput && typeof rawOutput === 'object') {
                    if (rawOutput.text) outputText = rawOutput.text;
                    else if (rawOutput.output) outputText = String(rawOutput.output);
                    else outputText = JSON.stringify(rawOutput);
                }

                if (step.image || step.images) {
                    const stepImgs = Array.isArray(step.images) ? step.images : [step.image];
                    for (const img of stepImgs) {
                        if (img?.data || typeof img === 'string') {
                            images.push({
                                data: img.data || img,
                                mimeType: img.mime_type || img.mimeType || 'image/png'
                            });
                        }
                    }
                }

                safeSend({
                    type: 'code_execution_result',
                    agent,
                    outcome: step.outcome || step.status || 'success',
                    output: outputText,
                    images: images.length ? images : undefined,
                    id: step.id || step.call_id || currentStep?.id || currentStep?.call_id || null
                });

                for (const img of images) {
                    safeSend({
                        type: 'code_image',
                        mimeType: img.mimeType,
                        data: img.data,
                        agent,
                        call_id: step.id || step.call_id || currentStep?.id || null
                    });
                }
            } else {
                if (step.type === 'url_context_call') {
                    const urls = step.urls || (step.url ? [step.url] : []) || [];
                    safeSend({
                        type: 'url_context_call',
                        agent,
                        urls,
                        url: urls[0] || '',
                        id: step.id || null
                    });
                } else if (step.type === 'url_context_result') {
                    safeSend({
                        type: 'url_context_result',
                        agent,
                        urls: step.urls || [],
                        results: step.results || step.content || step.output || '',
                        id: step.id || null
                    });
                } else if (step.type === 'google_search_call') {
                    safeSend({
                        type: 'google_search_call',
                        agent,
                        query: step.query || step.queries || '',
                        id: step.id || null
                    });
                } else if (step.type === 'google_search_result') {
                    safeSend({
                        type: 'google_search_result',
                        agent,
                        results: step.results || step.grounding_chunks || [],
                        id: step.id || null
                    });
                }

                safeSend({
                    type: 'tool_call_complete',
                    agent,
                    name: step.name || step.type || 'native_tool',
                    step_type: step.type || null,
                    native: true
                });
            }

            currentStep = null;
            accumulatedCode = '';
        }

        if (event.event_type === 'interaction.completed') {
            state.completed = true;
            state.status = 'completed';
            safeSend({ type: 'status', status: 'completed', agent });
            return {
                timedOut: false,
                completed: true,
                interaction: event.interaction || null
            };
        }

        if (
            event.event_type === 'interaction.error' ||
            event.event_type === 'error'
        ) {
            const error =
                event.error ||
                event.interaction?.error ||
                {};
            throw new Error(
                error.message ||
                error.status ||
                `${agent} interaction failed.`
            );
        }

        if (onEvent) {
            await onEvent(event);
        }
    }

    return {
        timedOut: false,
        completed: state.completed,
        interaction: null
    };
}

async function getOrchestrationDecision(prompt, userMemories, inputContext, hasRepository = false) {
    const schema = {
        type: 'object',
        properties: {
            agent: {
                type: 'string',
                enum: ['antigravity', 'computer_use', 'deep_research']
            },
            reason: { type: 'string' }
        },
        required: ['agent', 'reason']
    };
    
    const repoContext = hasRepository ? '\nATTACHED REPOSITORY: User has attached an open Git repository in a remote Linux environment for Antigravity.' : '';
    const orchestrationPrompt = `\nTASK TO ROUTE:\n${prompt}\n\nINPUT CONTEXT:\n${inputContext || 'none'}${repoContext}\n\nChoose exactly one agent.`;
    
    let interaction;
    try {
        interaction = await withRetry(() => client.interactions.create({
            model: RUNTIME_CONFIG.models.orchestrator,
            system_instruction: getOrchestratorInstruction(userMemories),
            input: orchestrationPrompt,
            tools: [
                { type: 'code_execution' },
                { type: 'url_context' }
            ],
            response_format: {
                type: 'text',
                mime_type: 'application/json',
                schema
            },
            store: true,
            stream: false
        }));
    } catch (structuredOutputError) {
        console.warn('[Cohana Orchestrator] Structured routing output unavailable; retrying with constrained JSON prompt.', structuredOutputError.message);
        interaction = await withRetry(() => client.interactions.create({
            model: RUNTIME_CONFIG.models.orchestrator,
            system_instruction: `${getOrchestratorInstruction(userMemories)}\nReturn only valid JSON. No Markdown fences.`,
            input: orchestrationPrompt,
            tools: [
                { type: 'code_execution' },
                { type: 'url_context' }
            ],
            store: true,
            stream: false
        }));
    }
    
    const text = interaction.output_text || getStepText(interaction);
    try {
        const parsed = JSON.parse(text.trim());
        if (['antigravity', 'computer_use', 'deep_research'].includes(parsed.agent)) {
            // When repository is attached, prioritize antigravity for code/repo tasks
            if (hasRepository && parsed.agent !== 'computer_use') {
                return { agent: 'antigravity', reason: parsed.reason || 'Repository environment is attached for Antigravity execution.' };
            }
            return parsed;
        }
    } catch {}
    
    // Safe deterministic fallback when structured output is unavailable.
    const lower = prompt.toLowerCase();
    if (/(click|type|scroll|select|sign in|log in|checkout|website|web page|browser)/.test(lower) && !/(code|file|script|document|pdf|presentation|repo|git)/.test(lower)) {
        return { agent: 'computer_use', reason: 'The task is primarily live browser GUI interaction.' };
    }
    if (hasRepository) {
        return { agent: 'antigravity', reason: 'Repository environment is attached for Antigravity.' };
    }
    if (/(research|investigate|compare|market|literature|sources|citations|latest|current developments)/.test(lower)) {
        return { agent: 'deep_research', reason: 'The task is primarily evidence-heavy research and synthesis.' };
    }
    return { agent: 'antigravity', reason: 'The task requires general autonomous execution, files, code, or document work.' };
}

async function createAntigravityInteraction({
    input,
    previousInteractionId,
    environmentId,
    systemInstruction,
    imageFiles,
    skills = [],
    repository = null,
    safeSend,
    state,
    remainingTime,
    isRuntimeExpired
}) {
    const environment = buildAntigravityEnvironment(environmentId, imageFiles, skills, repository);
    const repoMarker = repository ? `[ATTACHED REPOSITORY: "${repository.name || 'Repository'}" at ${repository.target || '/workspace/repo'} (${repository.url})]\n` : '';
    const inputs = await prepareImageInputs(`${repoMarker}${input}`, imageFiles);
    
    const payload = {
        agent: RUNTIME_CONFIG.agents.antigravity,
        system_instruction: systemInstruction,
        input: inputs,
        environment,
        background: true,
        stream: true,
        store: true
    };
    
    if (previousInteractionId) {
        payload.previous_interaction_id = previousInteractionId;
    }
    
    safeSend({ type: 'status', status: 'starting', agent: 'antigravity' });
    
    try {
        return await withTimeout(
            withRetry(() => client.interactions.create(payload)),
            remainingTime()
        );
    } catch (createErr) {
        const errMsg = String(createErr?.message || '').toLowerCase();
        const isEnvError = environmentId && (
            errMsg.includes('404') ||
            errMsg.includes('not found') ||
            errMsg.includes('expired') ||
            errMsg.includes('environment')
        );
        const isPrevInteractionError = previousInteractionId && (
            errMsg.includes('previous_interaction_id') ||
            errMsg.includes('interaction not found') ||
            errMsg.includes('interaction expired') ||
            errMsg.includes('invalid interaction') ||
            errMsg.includes('agent') ||
            errMsg.includes('mismatch')
        );
        
        if (isEnvError || isPrevInteractionError) {
            console.warn('[Antigravity] Stale session or environment detected; provisioning fresh environment turn.', createErr.message);
            payload.environment = buildAntigravityEnvironment(isEnvError ? null : environmentId, imageFiles, skills, repository);
            delete payload.previous_interaction_id;
            if (isEnvError) state.environmentId = null;
            state.interactionId = null;
            
            return await withTimeout(
                withRetry(() => client.interactions.create(payload)),
                remainingTime()
            );
        }
        throw createErr;
    }
}

async function createDeepResearchInteraction({
    input,
    previousInteractionId,
    safeSend,
    remainingTime,
    collaborativePlanning = false
}) {
    const payload = {
        agent: RUNTIME_CONFIG.agents.deepResearch,
        input,
        background: true,
        stream: true,
        store: true,
        agent_config: {
            type: 'deep-research',
            thinking_summaries: 'auto',
            visualization: 'auto',
            ...(collaborativePlanning ? { collaborative_planning: true } : {})
        }
    };
    
    if (previousInteractionId) {
        payload.previous_interaction_id = previousInteractionId;
    }
    
    safeSend({
        type: 'status',
        status: collaborativePlanning ? 'planning' : 'researching',
        agent: 'deep_research'
    });
    
    return withTimeout(
        withRetry(() => client.interactions.create(payload)),
        remainingTime()
    );
}

async function ensureExistingInteraction(interactionId) {
    if (!interactionId) return null;
    return client.interactions.get(interactionId);
}

async function runAntigravity({
    prompt,
    userMemories,
    imageFiles,
    interactionId,
    previousInteractionId,
    lastEventId,
    environmentId,
    skills = [],
    repository = null,
    safeSend,
    state,
    isRuntimeExpired,
    remainingTime,
    isResume = false
}) {
    const systemInstruction = getAntigravityInstruction(userMemories, repository);
    let activeEnvironmentId = repository ? (repository.environmentId || null) : (environmentId || null);
    
    let stream;
    
    if (isResume && interactionId) {
        state.interactionId = interactionId;
        state.environmentId = activeEnvironmentId;
        state.lastEventId = lastEventId || null;
        
        const existing = await ensureExistingInteraction(interactionId).catch(() => null);
        if (existing) {
            state.status = existing.status;
            if (existing.environment_id) {
                activeEnvironmentId = existing.environment_id;
                state.environmentId = existing.environment_id;
            }
            
            if (existing.status === 'completed') {
                state.completed = true;
                const finalText = existing.output_text || getStepText(existing);
                if (finalText) {
                    safeSend({ type: 'text', content: finalText, agent: 'antigravity' });
                }
                safeSend({ type: 'status', status: 'completed', agent: 'antigravity' });
                return {
                    completed: true,
                    timedOut: false,
                    interaction: existing,
                    agent: 'antigravity',
                    status: 'completed',
                    environmentId: activeEnvironmentId
                };
            }
            
            if (existing.status === 'failed' || existing.status === 'cancelled') {
                throw new Error(existing.error?.message || `Antigravity interaction ended with status: ${existing.status}`);
            }
            
            if (existing.status === 'incomplete') {
                safeSend({ type: 'status', status: 'continuing', agent: 'antigravity' });
                const continuePayload = {
                    agent: RUNTIME_CONFIG.agents.antigravity,
                    system_instruction: systemInstruction,
                    input: prompt && prompt !== 'continue' ? prompt : 'continue',
                    previous_interaction_id: existing.id,
                    environment: buildAntigravityEnvironment(state.environmentId, [], skills, repository),
                    background: true,
                    stream: true,
                    store: true
                };
                stream = await withTimeout(
                    withRetry(() => client.interactions.create(continuePayload)),
                    remainingTime()
                );
            } else {
                safeSend({ type: 'status', status: 'resuming', agent: 'antigravity' });
                stream = await withTimeout(
                    withRetry(() => getInteractionStream(client, existing.id, state.lastEventId)),
                    remainingTime()
                );
            }
        } else {
            safeSend({ type: 'status', status: 'resuming', agent: 'antigravity' });
            stream = await withTimeout(
                withRetry(() => getInteractionStream(client, interactionId, state.lastEventId)),
                remainingTime()
            );
        }
    } else {
        stream = await createAntigravityInteraction({
            input: prompt,
            previousInteractionId: previousInteractionId || null,
            environmentId: activeEnvironmentId,
            systemInstruction,
            imageFiles,
            skills,
            repository,
            safeSend,
            state,
            remainingTime,
            isRuntimeExpired
        });
    }
    
    let result = await streamInteraction({
        stream,
        safeSend,
        agent: 'antigravity',
        state,
        isRuntimeExpired
    });
    
    if (state.environmentId) {
        activeEnvironmentId = state.environmentId;
    }
    
    if (isRuntimeExpired()) {
        return {
            ...result,
            completed: false,
            timedOut: true,
            status: state.status || 'in_progress',
            agent: 'antigravity',
            environmentId: activeEnvironmentId || state.environmentId
        };
    }
    
    // Handle mid-request stream drops while Vercel runtime is still healthy
    while (!isRuntimeExpired() && !result.completed && state.interactionId) {
        const current = await client.interactions.get(state.interactionId).catch(() => null);
        if (!current) break;
        
        state.status = current.status;
        if (current.environment_id) {
            activeEnvironmentId = current.environment_id;
            state.environmentId = current.environment_id;
        }
        
        if (current.status === 'completed') {
            state.completed = true;
            result.completed = true;
            result.interaction = current;
            const finalText = current.output_text || getStepText(current);
            if (finalText) {
                safeSend({ type: 'text', content: finalText, agent: 'antigravity' });
            }
            safeSend({ type: 'status', status: 'completed', agent: 'antigravity' });
            break;
        }
        
        if (current.status === 'failed' || current.status === 'cancelled') {
            throw new Error(current.error?.message || `Antigravity interaction ended with status: ${current.status}`);
        }
        
        if (current.status === 'incomplete') {
            state.status = 'incomplete';
            safeSend({
                type: 'interaction_incomplete',
                interaction_id: state.interactionId,
                environment_id: activeEnvironmentId || state.environmentId,
                last_event_id: state.lastEventId,
                agent: 'antigravity',
                status: 'incomplete'
            });
            break;
        }
        
        if (['in_progress', 'queued'].includes(current.status)) {
            safeSend({ type: 'status', status: 'in_progress', agent: 'antigravity' });
            const resumeStream = await withTimeout(
                withRetry(() => getInteractionStream(client, current.id, state.lastEventId)),
                remainingTime()
            );
            
            result = await streamInteraction({
                stream: resumeStream,
                safeSend,
                agent: 'antigravity',
                state,
                isRuntimeExpired
            });
        } else {
            break;
        }
    }
    
    const isTimedOut = isRuntimeExpired() && !result.completed;
    
    return {
        ...result,
        timedOut: isTimedOut,
        agent: 'antigravity',
        status: state.status,
        environmentId: activeEnvironmentId || state.environmentId
    };
}

async function runDeepResearch({
    prompt,
    userMemories,
    imageFiles,
    documentFiles,
    interactionId,
    previousInteractionId,
    lastEventId,
    safeSend,
    state,
    isRuntimeExpired,
    remainingTime,
    isResume = false
}) {
    const researchInputs = prepareDeepResearchInputs(
        `${prompt}${getUserMemoriesInstruction(userMemories)}`,
        imageFiles,
        documentFiles
    );
    
    let stream;
    
    if (isResume && interactionId) {
        state.interactionId = interactionId;
        state.lastEventId = lastEventId || null;
        
        const existing = await ensureExistingInteraction(interactionId).catch(() => null);
        if (existing) {
            state.status = existing.status;
            if (existing.status === 'completed') {
                state.completed = true;
                const finalText = existing.output_text || getStepText(existing);
                if (finalText) {
                    safeSend({ type: 'text', content: finalText, agent: 'deep_research' });
                }
                safeSend({ type: 'status', status: 'completed', agent: 'deep_research' });
                return { completed: true, timedOut: false, interaction: existing, agent: 'deep_research', status: 'completed' };
            }
            if (existing.status === 'failed' || existing.status === 'cancelled') {
                throw new Error(existing.error?.message || `Deep Research interaction ended with status: ${existing.status}`);
            }
            if (existing.status === 'incomplete') {
                safeSend({ type: 'status', status: 'continuing', agent: 'deep_research' });
                stream = await createDeepResearchInteraction({
                    input: 'continue',
                    previousInteractionId: existing.id,
                    safeSend,
                    remainingTime,
                    collaborativePlanning: false
                });
            } else {
                safeSend({ type: 'status', status: 'resuming', agent: 'deep_research' });
                stream = await withTimeout(
                    withRetry(() => getInteractionStream(client, existing.id, state.lastEventId)),
                    remainingTime()
                );
            }
        } else {
            safeSend({ type: 'status', status: 'resuming', agent: 'deep_research' });
            stream = await withTimeout(
                withRetry(() => getInteractionStream(client, interactionId, state.lastEventId)),
                remainingTime()
            );
        }
    } else {
        stream = await createDeepResearchInteraction({
            input: researchInputs,
            previousInteractionId: previousInteractionId || null,
            safeSend,
            remainingTime,
            collaborativePlanning: false
        });
    }
    
    let result = await streamInteraction({
        stream,
        safeSend,
        agent: 'deep_research',
        state,
        isRuntimeExpired
    });
    
    while (!isRuntimeExpired() && !result.completed && state.interactionId) {
        const current = await client.interactions.get(state.interactionId).catch(() => null);
        if (!current) break;
        state.status = current.status;
        
        if (current.status === 'completed') {
            state.completed = true;
            result.completed = true;
            result.interaction = current;
            const finalText = current.output_text || getStepText(current);
            if (finalText) {
                safeSend({ type: 'text', content: finalText, agent: 'deep_research' });
            }
            safeSend({ type: 'status', status: 'completed', agent: 'deep_research' });
            break;
        }
        
        if (current.status === 'failed' || current.status === 'cancelled') {
            throw new Error(current.error?.message || `Deep Research interaction ended with status: ${current.status}`);
        }
        
        if (current.status === 'incomplete') {
            safeSend({ type: 'status', status: 'continuing', agent: 'deep_research' });
            const continueStream = await createDeepResearchInteraction({
                input: 'continue',
                previousInteractionId: current.id,
                safeSend,
                remainingTime,
                collaborativePlanning: false
            });
            
            result = await streamInteraction({
                stream: continueStream,
                safeSend,
                agent: 'deep_research',
                state,
                isRuntimeExpired
            });
        } else if (['in_progress', 'queued'].includes(current.status)) {
            safeSend({ type: 'status', status: 'researching', agent: 'deep_research' });
            const resumeStream = await withTimeout(
                withRetry(() => getInteractionStream(client, current.id, state.lastEventId)),
                remainingTime()
            );
            
            result = await streamInteraction({
                stream: resumeStream,
                safeSend,
                agent: 'deep_research',
                state,
                isRuntimeExpired
            });
        } else {
            break;
        }
    }
    
    const isTimedOut = isRuntimeExpired() && !result.completed;
    
    return {
        ...result,
        timedOut: isTimedOut,
        agent: 'deep_research',
        status: state.status
    };
}

const YIELD_TO_USER_TOOL = {
    type: 'function',
    name: 'yield_to_user',
    description: 'Request temporary human takeover of the live web browser when manual user intervention is required (e.g. MFA/OTP verification, CAPTCHA solving, account login, entering sensitive payment/personal info, resolving ambiguous UI states, or manual review). Pauses execution until the user completes the action and resumes.',
    parameters: {
        type: 'object',
        properties: {
            reason: {
                type: 'string',
                description: 'Clear and detailed explanation describing why human control is requested and what action the user must perform in the live browser.'
            }
        },
        required: ['reason']
    }
};

function getComputerUseInstruction(userMemories) {
    return `
You are Cohana Computer's Computer Use Agent, operating a live web browser interface.

HUMAN TAKEOVER DIRECTIVE (yield_to_user):
- When you encounter any obstacle requiring human intervention (such as multi-factor authentication MFA/OTP, CAPTCHA, logging into an account, entering sensitive credentials or payment data, ambiguous UI options, or manual confirmation), you MUST invoke the \`yield_to_user\` function tool.
- Supply a clear, actionable \`reason\` describing what the user must do in the live browser.
- Once you call \`yield_to_user\`, STOP taking browser actions immediately and wait.
- When the user resumes control, you will receive a fresh screenshot of the browser state and the user's report of what was changed.
- Inspect the fresh screenshot and continue your browser automation task from that point without restarting the session or resetting your progress.
${getUserMemoriesInstruction(userMemories)}
`.trim();
}

async function createSteelBrowser(startUrl = null) {
    if (!STEEL_API_KEY) throw new Error('STEEL_API_KEY is not configured.');

    const Steel = (await import('steel-sdk')).default;
    const puppeteerModule = await import('puppeteer-core');
    const puppeteer = puppeteerModule.default || puppeteerModule;

    const steel = new Steel({ steelAPIKey: STEEL_API_KEY });
    const session = await steel.sessions.create({
        timeout: RUNTIME_CONFIG.limits.steelSessionTimeoutMs
    });

    const browser = await puppeteer.connect({
        browserWSEndpoint: `${session.websocketUrl}&apiKey=${STEEL_API_KEY}`
    });

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();

    if (startUrl) {
        await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
    }

    const debugUrl = session.debugUrl || session.debug_url || null;

    return {
        steel,
        session,
        browser,
        page,
        debugUrl,
        screen: async () => {
            const viewport = page.viewport() || { width: 1280, height: 800 };
            return {
                width: viewport.width || 1280,
                height: viewport.height || 800
            };
        }
    };
}

async function connectSteelBrowser(sessionId) {
    if (!STEEL_API_KEY) throw new Error('STEEL_API_KEY is not configured.');

    const Steel = (await import('steel-sdk')).default;
    const puppeteerModule = await import('puppeteer-core');
    const puppeteer = puppeteerModule.default || puppeteerModule;
    const steel = new Steel({ steelAPIKey: STEEL_API_KEY });

    const session = await steel.sessions.retrieve(sessionId);
    const browser = await puppeteer.connect({
        browserWSEndpoint: `${session.websocketUrl}&apiKey=${STEEL_API_KEY}`
    });
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();

    const debugUrl = session.debugUrl || session.debug_url || null;

    return { steel, session, browser, page, debugUrl };
}



async function handleResumeUserControl(req, res) {
    const requestStartTime = Date.now();
    const safeSend = payload => {
        if (res.writableEnded) return;
        try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch {}
    };
    
    const MAX_RUNTIME_MS = RUNTIME_CONFIG.limits.vercelFunctionMaxMs;
    const TIMEOUT_GUARD_MS = RUNTIME_CONFIG.limits.timeoutGuardMs;
    const remainingTime = () => Math.max(
        1_000,
        MAX_RUNTIME_MS - (Date.now() - requestStartTime) - TIMEOUT_GUARD_MS
    );
    const isRuntimeExpired = () => Date.now() - requestStartTime >= MAX_RUNTIME_MS - TIMEOUT_GUARD_MS;
    
    try {
        const {
            interaction_id,
            previous_interaction_id,
            browser_session_id,
            user_message,
            prompt,
            last_event_id,
            userMemories
        } = req.body || {};
        
        const targetInteractionId =
            typeof interaction_id === 'string' && interaction_id.trim() ?
            interaction_id.trim() :
            typeof previous_interaction_id === 'string' && previous_interaction_id.trim() ?
            previous_interaction_id.trim() :
            null;
        
        const targetBrowserSessionId =
            typeof browser_session_id === 'string' && browser_session_id.trim() ?
            browser_session_id.trim() :
            null;
        
        const finalUserMessage =
            typeof user_message === 'string' && user_message.trim() ?
            user_message.trim() :
            typeof prompt === 'string' && prompt.trim() ?
            prompt.trim() :
            'The user completed the manual browser action.';
        
        if (!targetInteractionId || !targetBrowserSessionId) {
            return res.status(400).json({
                error: 'Resume requires interaction_id (or previous_interaction_id) and browser_session_id.'
            });
        }
        
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        if (res.flushHeaders) res.flushHeaders();
        
        safeSend({ type: 'status', status: 'preparing' });
        safeSend({ type: 'agent', agent: 'computer_use', resumed: true });
        
        const state = {
            interactionId: targetInteractionId,
            lastEventId: typeof last_event_id === 'string' && last_event_id.trim() ? last_event_id.trim() : null,
            browserSessionId: targetBrowserSessionId,
            completed: false,
            status: null,
            requiresAction: false
        };
        
        const result = await runComputerUse({
            prompt: finalUserMessage,
            startUrl: null,
            interactionId: targetInteractionId,
            lastEventId: state.lastEventId,
            browserSessionId: targetBrowserSessionId,
            safeSend,
            state,
            isRuntimeExpired,
            remainingTime,
            isResume: true,
            userMessage: finalUserMessage,
            userMemories
        });
        
        if (state.browserSessionId) {
            safeSend({ type: 'browser_session_id', id: state.browserSessionId });
        }
        if (state.interactionId) {
            safeSend({ type: 'interaction_id', id: state.interactionId });
        }
        
        RuntimeObservability.logSessionState(state.interactionId || 'unknown', 'AGENT_COMPLETED', {
            agent: 'computer_use',
            browserSessionId: state.browserSessionId,
            interactionId: state.interactionId,
            durationMs: Date.now() - requestStartTime
        });
        
        if (!result?.completed && (result?.timedOut || isRuntimeExpired())) {
            safeSend({
                type: 'stream_timeout',
                interaction_id: state.interactionId,
                browser_session_id: state.browserSessionId,
                last_event_id: state.lastEventId,
                agent: 'computer_use'
            });
        }
        
        safeSend({ type: 'end' });
        res.end();
    } catch (error) {
        console.error('[Cohana Agent Resume Error]', error);
        
        if (!res.writableEnded) {
            safeSend({
                type: 'error',
                error: { message: error?.message || 'Cohana Agent resume request failed.' }
            });
            safeSend({ type: 'end' });
            res.end();
        }
    }
}

async function handleAgentRequest(req, res) {
    const requestStartTime = Date.now();
    const safeSend = payload => {
        if (res.writableEnded) return;
        try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch {}
    };
    
    const MAX_RUNTIME_MS = RUNTIME_CONFIG.limits.vercelFunctionMaxMs;
    const TIMEOUT_GUARD_MS = RUNTIME_CONFIG.limits.timeoutGuardMs;
    const remainingTime = () => Math.max(
        1_000,
        MAX_RUNTIME_MS - (Date.now() - requestStartTime) - TIMEOUT_GUARD_MS
    );
    const isRuntimeExpired = () => Date.now() - requestStartTime >= MAX_RUNTIME_MS - TIMEOUT_GUARD_MS;
    
    try {
        const {
            prompt,
            userMemories,
            interaction_id,
            previous_interaction_id,
            last_event_id,
            environment_id,
            browser_session_id,
            resume_user_control,
            user_message,
            skills,
            repository,
            agent: requestedAgent,
            resume
        } = req.body || {};
        
        const isResume = Boolean(
            resume === true ||
            resume === 'true' ||
            resume_user_control === true ||
            resume_user_control === 'true'
        );
        
        if (isResume && (resume_user_control === true || resume_user_control === 'true')) {
            return handleResumeUserControl(req, res);
        }
        
        const finalPrompt = typeof prompt === 'string' && prompt.trim() ?
            prompt.trim() :
            'Hello';
        
        const suppliedInteractionId =
            typeof interaction_id === 'string' && interaction_id.trim() ?
            interaction_id.trim() :
            null;
        
        const suppliedPreviousInteractionId =
            typeof previous_interaction_id === 'string' && previous_interaction_id.trim() ?
            previous_interaction_id.trim() :
            null;
        
        const suppliedLastEventId =
            typeof last_event_id === 'string' && last_event_id.trim() ?
            last_event_id.trim() :
            null;
        
        const suppliedEnvironmentId =
            typeof environment_id === 'string' && environment_id.trim() ?
            environment_id.trim() :
            null;
        
        const suppliedBrowserSessionId =
            typeof browser_session_id === 'string' && browser_session_id.trim() ?
            browser_session_id.trim() :
            null;
        
        let activeRepository = null;
        if (repository) {
            try {
                activeRepository = typeof repository === 'string' ? JSON.parse(repository) : repository;
            } catch {
                activeRepository = null;
            }
        }
        
        let activeSkills = [];
        if (skills) {
            try {
                activeSkills = typeof skills === 'string' ? JSON.parse(skills) : skills;
            } catch {
                activeSkills = [];
            }
        }
        if (!Array.isArray(activeSkills) || activeSkills.length === 0) {
            activeSkills = resolveSkillsFromPlugins(finalPrompt);
        }
        
        const imageFiles = ['image', 'image_1', 'image_2', 'image_3', 'image_4']
            .map(key => req.files?.[key]?.[0])
            .filter(Boolean);
        
        const documentFiles = ['file', 'file_1', 'file_2', 'file_3', 'file_4']
            .map(key => req.files?.[key]?.[0])
            .filter(Boolean);
        
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        if (res.flushHeaders) res.flushHeaders();
        
        safeSend({ type: 'status', status: 'preparing' });
        
        let selectedAgent = null;
        let existingInteraction = null;
        
        // 1. Maintain agent choice if explicitly specified
        if (requestedAgent && ['antigravity', 'computer_use', 'deep_research'].includes(requestedAgent)) {
            selectedAgent = requestedAgent;
        }
        
        // 2. If resuming or chaining turns, detect agent identity
        const referenceId = isResume ? (suppliedInteractionId || suppliedPreviousInteractionId) : suppliedPreviousInteractionId;
        if (!selectedAgent && referenceId) {
            existingInteraction = await ensureExistingInteraction(referenceId).catch(() => null);
            if (existingInteraction) {
                selectedAgent = getAgentIdentity(existingInteraction);
            }
        }
        
        // 3. Fallback to orchestrator only on unrouted turn 1
        if (!selectedAgent) {
            const inputContext = [
                imageFiles.length ? `${imageFiles.length} image attachment(s)` : '',
                documentFiles.length ? `${documentFiles.length} document/file attachment(s)` : '',
                activeRepository?.url ? `Repository mounted: ${activeRepository.name || activeRepository.url}` : ''
            ].filter(Boolean).join(', ');
            
            const route = await getOrchestrationDecision(finalPrompt, userMemories, inputContext, Boolean(activeRepository?.url));
            selectedAgent = route.agent;
            safeSend({
                type: 'agent',
                agent: selectedAgent,
                reason: route.reason
            });
        } else {
            safeSend({ type: 'agent', agent: selectedAgent, resumed: isResume });
        }
        
        if (selectedAgent === 'computer_use' && (imageFiles.length || documentFiles.length)) {
            safeSend({
                type: 'attachment_warning',
                message: 'Computer Use operates exclusively on live browser viewport state.'
            });
        }
        
        const resolvedEnvironmentId = activeRepository ?
            (activeRepository.environmentId || null) :
            (suppliedEnvironmentId || existingInteraction?.environment_id || null);
        
        const state = {
            interactionId: isResume ? suppliedInteractionId : null,
            lastEventId: suppliedLastEventId,
            environmentId: resolvedEnvironmentId,
            browserSessionId: suppliedBrowserSessionId || (existingInteraction ? extractComputerState(existingInteraction) : null),
            completed: false,
            status: null,
            requiresAction: false
        };
        
        let result;
        
        if (selectedAgent === 'antigravity') {
            result = await runAntigravity({
                prompt: finalPrompt,
                userMemories,
                imageFiles,
                interactionId: suppliedInteractionId,
                previousInteractionId: suppliedPreviousInteractionId,
                lastEventId: suppliedLastEventId,
                environmentId: state.environmentId,
                skills: activeSkills,
                repository: activeRepository,
                safeSend,
                state,
                isRuntimeExpired,
                remainingTime,
                isResume
            });
        } else if (selectedAgent === 'deep_research') {
            result = await runDeepResearch({
                prompt: finalPrompt,
                userMemories,
                imageFiles,
                documentFiles,
                interactionId: suppliedInteractionId,
                previousInteractionId: suppliedPreviousInteractionId,
                lastEventId: suppliedLastEventId,
                safeSend,
                state,
                isRuntimeExpired,
                remainingTime,
                isResume
            });
        } else {
            result = await runComputerUse({
                prompt: finalPrompt,
                startUrl: null,
                interactionId: suppliedInteractionId,
                previousInteractionId: suppliedPreviousInteractionId,
                lastEventId: suppliedLastEventId,
                browserSessionId: state.browserSessionId,
                safeSend,
                state,
                isRuntimeExpired,
                remainingTime,
                isResume,
                userMemories
            });
        }
        
        if (state.environmentId) {
            safeSend({ type: 'environment_id', id: state.environmentId });
        }
        if (state.browserSessionId) {
            safeSend({ type: 'browser_session_id', id: state.browserSessionId });
        }
        
        // Publish files via new Files API upon task completion
        const isTaskFinished = result?.completed || state.completed || state.status === 'completed';
        if (state.interactionId && isTaskFinished && selectedAgent === 'antigravity' && !isRuntimeExpired()) {
            try {
                await publishAgentOutputs(state.environmentId, safeSend, isRuntimeExpired);
            } catch (fileError) {
                safeSend({ type: 'file_share_error', error: fileError.message });
            }
        }
        
        RuntimeObservability.logSessionState(state.interactionId || 'unknown', 'AGENT_COMPLETED', {
            agent: result?.agent || selectedAgent,
            environmentId: state.environmentId,
            browserSessionId: state.browserSessionId,
            interactionId: state.interactionId,
            lastEventId: state.lastEventId,
            status: state.status,
            durationMs: Date.now() - requestStartTime
        });
        
        if (state.status === 'incomplete') {
            safeSend({
                type: 'interaction_incomplete',
                interaction_id: state.interactionId,
                environment_id: state.environmentId,
                browser_session_id: state.browserSessionId,
                last_event_id: state.lastEventId,
                agent: result?.agent || selectedAgent,
                status: 'incomplete'
            });
        } else if (!isTaskFinished && (result?.timedOut || isRuntimeExpired())) {
            safeSend({
                type: 'stream_timeout',
                interaction_id: state.interactionId,
                environment_id: state.environmentId,
                browser_session_id: state.browserSessionId,
                last_event_id: state.lastEventId,
                agent: result?.agent || selectedAgent,
                status: state.status || 'in_progress'
            });
        }
        
        safeSend({ type: 'end' });
        res.end();
    } catch (error) {
        console.error('[Cohana Agent Error]', error);
        
        if (!res.writableEnded) {
            safeSend({
                type: 'error',
                error: { message: error?.message || 'Cohana Agent request failed.' }
            });
            safeSend({ type: 'end' });
            res.end();
        }
    }
}

async function runComputerUse({
    prompt,
    startUrl,
    interactionId,
    previousInteractionId,
    lastEventId,
    browserSessionId,
    safeSend,
    state,
    isRuntimeExpired,
    remainingTime,
    isResume = false,
    userMessage = null,
    userMemories = null
}) {
    let existing = (isResume ? interactionId : previousInteractionId)
        ? await ensureExistingInteraction(isResume ? interactionId : previousInteractionId).catch(() => null)
        : null;
        
    let sessionId = browserSessionId || extractComputerState(existing);
    let browser;
    let page;
    let session;
    let debugUrl;

    if (sessionId) {
        try {
            ({ session, browser, page, debugUrl } = await connectSteelBrowser(sessionId));
        } catch (connectErr) {
            if (isResume) {
                throw new Error(`Failed to reconnect to Steel browser session (${sessionId}): ${connectErr.message || 'Session expired or invalid.'}`);
            }
            sessionId = null;
        }
    }

    if (!sessionId) {
        if (isResume) {
            throw new Error('Browser session ID is required to resume human control.');
        }
        const created = await createSteelBrowser(startUrl || null);
        sessionId = created.session.id;
        session = created.session;
        browser = created.browser;
        page = created.page;
        debugUrl = created.debugUrl;
    } else if (startUrl && (!existing || !existing.steps?.length)) {
        await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
    }

    state.browserSessionId = sessionId;
    safeSend({ type: 'browser_session_id', id: sessionId });

    try {
        let active = isResume ? existing : null;

        if (isResume && userMessage) {
            safeSend({ type: 'status', status: 'resuming_user_control', agent: 'computer_use' });

            RuntimeObservability.logSessionState(interactionId, 'COMPUTER_USE_RESUMING', {
                agent: 'computer_use',
                browserSessionId: sessionId,
                interactionId
            });

            const freshScreenshot = await page.screenshot({ type: 'png' });
            if (freshScreenshot.length > RUNTIME_CONFIG.limits.screenshotMaxBytes) {
                throw new Error('Post-resume screenshot exceeds configured size limit.');
            }

            const continuationText = `The user has finished taking control of the browser.\n` +
                `Continue the original task from the current browser state.\n` +
                `The user reported:\n${userMessage || prompt}\n\n` +
                `The attached screenshot is the current browser state after the user's intervention.\n` +
                `Do not restart the browser or assume the previous state is unchanged.\n` +
                `Inspect the current screenshot and continue from the state shown.`;

            const pendingOnActive = active ? getPendingFunctionCalls(active) : [];
            const yieldCall = pendingOnActive.find(c => c.name === 'yield_to_user');

            let inputPayload;
            if (yieldCall) {
                inputPayload = [
                    {
                        type: 'function_result',
                        name: 'yield_to_user',
                        call_id: yieldCall.id,
                        result: [
                            {
                                type: 'text',
                                text: continuationText
                            },
                            {
                                type: 'image',
                                data: freshScreenshot.toString('base64'),
                                mime_type: 'image/png',
                                resolution: 'ultra_high'
                            }
                        ]
                    }
                ];
            } else {
                inputPayload = [
                    {
                        type: 'text',
                        text: continuationText
                    },
                    {
                        type: 'image',
                        data: freshScreenshot.toString('base64'),
                        mime_type: 'image/png',
                        resolution: 'ultra_high'
                    }
                ];
            }

            const responsePayload = {
                model: RUNTIME_CONFIG.models.computerUse,
                system_instruction: getComputerUseInstruction(userMemories),
                generation_config: { thinking_summaries: 'auto' },
                previous_interaction_id: active ? active.id : interactionId,
                input: inputPayload,
                tools: [
                    {
                        type: 'computer_use',
                        environment: 'browser',
                        enable_prompt_injection_detection: true
                    },
                    YIELD_TO_USER_TOOL
                ],
                stream: true,
                store: true
            };

            const resumeStream = await withTimeout(
                withRetry(() => client.interactions.create(responsePayload)),
                remainingTime()
            );

            const streamResult = await streamInteraction({
                stream: resumeStream,
                safeSend,
                agent: 'computer_use',
                state,
                isRuntimeExpired
            });

            if (streamResult.timedOut) {
                safeSend({
                    type: 'stream_timeout',
                    interaction_id: state.interactionId,
                    last_event_id: state.lastEventId,
                    browser_session_id: sessionId,
                    agent: 'computer_use'
                });
                return { ...streamResult, agent: 'computer_use', browserSessionId: sessionId };
            }

            active = await client.interactions.get(state.interactionId);

            RuntimeObservability.logSessionState(state.interactionId, 'COMPUTER_USE_RESUMED', {
                agent: 'computer_use',
                browserSessionId: sessionId,
                interactionId: state.interactionId
            });
        }

        let turnCount = 0;

        while (!isRuntimeExpired() && turnCount < RUNTIME_CONFIG.limits.maxComputerUseTurnsPerRequest) {
            const screen = {
                width: (page.viewport() || {}).width || 1280,
                height: (page.viewport() || {}).height || 800
            };

            let pending = active ? getPendingFunctionCalls(active) : [];

            if (active && ['in_progress', 'queued'].includes(active.status)) {
                state.interactionId = active.id;
                state.lastEventId = lastEventId || state.lastEventId || null;
                const stream = await withTimeout(
                    withRetry(() => client.interactions.get(active.id, {
                        stream: true,
                        ...(state.lastEventId ? { last_event_id: state.lastEventId } : {})
                    })),
                    remainingTime()
                );
                const streamResult = await streamInteraction({
                    stream,
                    safeSend,
                    agent: 'computer_use',
                    state,
                    isRuntimeExpired,
                    screen: getComputerViewport(page)
                });
                if (streamResult.timedOut) {
                    safeSend({
                        type: 'stream_timeout',
                        interaction_id: state.interactionId,
                        last_event_id: state.lastEventId,
                        browser_session_id: sessionId,
                        agent: 'computer_use'
                    });
                    return { ...streamResult, agent: 'computer_use', browserSessionId: sessionId };
                }
                active = await client.interactions.get(state.interactionId);
                pending = getPendingFunctionCalls(active);
            }

            if (!active || (!['in_progress', 'queued'].includes(active.status) && !pending.length)) {
                const initialScreenshot = await page.screenshot({ type: 'png' });
                if (initialScreenshot.length > RUNTIME_CONFIG.limits.screenshotMaxBytes) {
                    throw new Error('Initial Computer Use screenshot exceeds configured size limit.');
                }
                const input = [
                    {
                        type: 'text',
                        text: `GUI browser task:\n${prompt}\n\nCOHANA_BROWSER_SESSION=${sessionId}`
                    },
                    {
                        type: 'image',
                        data: initialScreenshot.toString('base64'),
                        mime_type: 'image/png',
                        resolution: 'ultra_high'
                    }
                ];

                const payload = {
                    model: RUNTIME_CONFIG.models.computerUse,
                    system_instruction: getComputerUseInstruction(userMemories),
                    generation_config: { thinking_summaries: 'auto' },
                    input,
                    tools: [
                        {
                            type: 'computer_use',
                            environment: 'browser',
                            enable_prompt_injection_detection: true
                        },
                        YIELD_TO_USER_TOOL
                    ],
                    stream: true,
                    store: true
                };
                
                const parentInteractionId = isResume ? active?.id : (previousInteractionId || active?.id);
                if (parentInteractionId) payload.previous_interaction_id = parentInteractionId;

                safeSend({ type: 'status', status: 'starting', agent: 'computer_use' });
                const stream = await withTimeout(
                    withRetry(() => client.interactions.create(payload)),
                    remainingTime()
                );

                const streamResult = await streamInteraction({
                    stream,
                    safeSend,
                    agent: 'computer_use',
                    state,
                    isRuntimeExpired,
                    screen: getComputerViewport(page)
                });

                if (streamResult.timedOut) {
                    safeSend({
                        type: 'stream_timeout',
                        interaction_id: state.interactionId,
                        last_event_id: state.lastEventId,
                        browser_session_id: sessionId,
                        agent: 'computer_use'
                    });
                    return { ...streamResult, agent: 'computer_use', browserSessionId: sessionId };
                }

                active = await client.interactions.get(state.interactionId);
                if (active.status === 'completed' && getPendingFunctionCalls(active).length === 0) {
                    safeSend({ type: 'status', status: 'completed', agent: 'computer_use' });
                    return { completed: true, timedOut: false, interaction: active, agent: 'computer_use', browserSessionId: sessionId };
                }

                pending = getPendingFunctionCalls(active);
            }

            if (!pending.length) {
                const finalInteraction = active || await client.interactions.get(state.interactionId);
                const finalText = getStepText(finalInteraction);
                if (finalText) safeSend({ type: 'text', content: finalText, agent: 'computer_use' });
                return { completed: true, timedOut: false, interaction: finalInteraction, agent: 'computer_use', browserSessionId: sessionId };
            }

            const yieldCall = pending.find(call => call.name === 'yield_to_user');
            if (yieldCall) {
                const reason = String(yieldCall.arguments?.reason || 'Human intervention required in live browser.').trim();

                safeSend({
                    type: 'tool_call',
                    agent: 'computer_use',
                    name: 'yield_to_user',
                    step_type: 'function_call',
                    native: false,
                    reason
                });

                safeSend({
                    type: 'yield_to_user',
                    agent: 'computer_use',
                    interaction_id: active.id,
                    browser_session_id: sessionId,
                    debug_url: debugUrl,
                    reason,
                    status: 'awaiting_user'
                });

                RuntimeObservability.logSessionState(active.id, 'COMPUTER_USE_YIELDED', {
                    agent: 'computer_use',
                    browserSessionId: sessionId,
                    interactionId: active.id,
                    reason
                });

                return {
                    completed: false,
                    timedOut: false,
                    interaction: active,
                    agent: 'computer_use',
                    browserSessionId: sessionId,
                    awaitingUser: true,
                    yieldReason: reason,
                    debugUrl
                };
            }

            const actions = [];
            let blockedForConfirmation = false;

            for (const call of pending) {
                const token = await resolveConfirmationForAction(call, active.id, sessionId);
                if (token) {
                    blockedForConfirmation = true;
                    const screenshot = await page.screenshot({ type: 'png' });
                    const clientAction = serializeComputerActionForClient(call, screen);

                    safeSend({
                        type: 'requires_confirmation',
                        confirmation_id: token,
                        screenshot: screenshot.toString('base64'),
                        mimeType: 'image/png',
                        what:
                            call.arguments?.safety_decision?.explanation ||
                            call.arguments?.intent ||
                            `Computer Use wants to perform ${call.name}.`,
                        command: clientAction,
                        agent: 'computer_use'
                    });
                    continue;
                }

                const clientAction = serializeComputerActionForClient(call, screen);
                safeSend({
                    type: 'tool_call_start',
                    agent: 'computer_use',
                    name: call.name,
                    id: call.id || null,
                    step_type: 'function_call',
                    native: true,
                    arguments: clientAction.arguments,
                    intent: clientAction.intent,
                    safety_decision: clientAction.safety_decision,
                    coordinates: clientAction.coordinates,
                    display: clientAction.display,
                    label: clientAction.display
                });

                let result;
                try {
                    result = await executeComputerAction(page, call, screen);
                } catch (error) {
                    result = {
                        ok: false,
                        error: error?.message || 'Computer Use action failed.',
                        url: page.url()
                    };
                }

                actions.push({
                    name: call.name,
                    callId: call.id,
                    result
                });

                safeSend({
                    type: 'tool_call_complete',
                    agent: 'computer_use',
                    name: call.name,
                    id: call.id || null,
                    step_type: 'function_call',
                    native: true,
                    result,
                    display: clientAction.display
                });
            }

            if (blockedForConfirmation) {
                return {
                    completed: false,
                    timedOut: false,
                    interaction: active,
                    agent: 'computer_use',
                    browserSessionId: sessionId,
                    awaitingConfirmation: true
                };
            }

            const functionResponses = await getComputerFunctionResults(page, actions);
            const responsePayload = {
                model: RUNTIME_CONFIG.models.computerUse,
                system_instruction: getComputerUseInstruction(userMemories),
                generation_config: { thinking_summaries: 'auto' },
                previous_interaction_id: active.id,
                input: functionResponses,
                tools: [
                    {
                        type: 'computer_use',
                        environment: 'browser',
                        enable_prompt_injection_detection: true
                    },
                    YIELD_TO_USER_TOOL
                ],
                stream: true,
                store: true
            };

            const nextStream = await withTimeout(
                withRetry(() => client.interactions.create(responsePayload)),
                remainingTime()
            );

            const nextResult = await streamInteraction({
                stream: nextStream,
                safeSend,
                agent: 'computer_use',
                state,
                isRuntimeExpired
            });

            if (nextResult.timedOut) {
                safeSend({
                    type: 'stream_timeout',
                    interaction_id: state.interactionId,
                    last_event_id: state.lastEventId,
                    browser_session_id: sessionId,
                    agent: 'computer_use'
                });
                return { ...nextResult, agent: 'computer_use', browserSessionId: sessionId };
            }

            active = await client.interactions.get(state.interactionId);
            turnCount++;

            if (active.status === 'completed' && getPendingFunctionCalls(active).length === 0) {
                const text = getStepText(active);
                if (text) safeSend({ type: 'text', content: text, agent: 'computer_use' });
                return { completed: true, timedOut: false, interaction: active, agent: 'computer_use', browserSessionId: sessionId };
            }
        }

        safeSend({
            type: 'stream_timeout',
            interaction_id: state.interactionId,
            last_event_id: state.lastEventId,
            browser_session_id: sessionId,
            agent: 'computer_use'
        });

        return {
            completed: false,
            timedOut: true,
            interaction: state.interactionId ? await client.interactions.get(state.interactionId).catch(() => null) : null,
            agent: 'computer_use',
            browserSessionId: sessionId
        };
    } finally {
        try { if (browser) await browser.disconnect(); } catch {}
    }
}
async function continueComputerUseConfirmation(req, res) {
    const { confirmation_id, approved } = req.body || {};
    if (!confirmation_id) {
        return res.status(400).json({ error: 'confirmation_id is required.' });
    }

    try {
        const payload = verifyConfirmation(confirmation_id);
        if (!approved) {
            return res.json({ ok: true, status: 'declined' });
        }

        const { browser, page } = await connectSteelBrowser(payload.browser_session_id);
        try {
            const interaction = await client.interactions.get(payload.interaction_id);
            const action = payload.action;
            const screen = {
                width: (page.viewport() || {}).width || 1280,
                height: (page.viewport() || {}).height || 800
            };
            const result = await executeComputerAction(page, action, screen);
            const functionResponses = await getComputerFunctionResults(page, [
                {
                    name: action.name,
                    callId: action.id,
                    result,
                    safetyAcknowledgement: true
                }
            ]);
            const next = await client.interactions.create({
                model: RUNTIME_CONFIG.models.computerUse,
                generation_config: { thinking_summaries: 'auto' },
                previous_interaction_id: interaction.id,
                input: functionResponses,
                tools: [
                    {
                        type: 'computer_use',
                        environment: 'browser',
                        enable_prompt_injection_detection: true
                    },
                    YIELD_TO_USER_TOOL
                ],
                stream: false,
                store: true
            });

            return res.json({
                ok: true,
                status: next.status,
                interaction_id: next.id,
                browser_session_id: payload.browser_session_id,
                output_text: next.output_text || getStepText(next)
            });
        } finally {
            // Disconnect Puppeteer WebSocket without terminating the remote Steel browser session
            try { if (browser) await browser.disconnect(); } catch {}
        }
    } catch (error) {
        return res.status(400).json({ error: error.message || 'Confirmation failed.' });
    }
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: RUNTIME_CONFIG.limits.fileUploadBytes }
});

app.post(
    '/api/agent',
    upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'image_1', maxCount: 1 },
        { name: 'image_2', maxCount: 1 },
        { name: 'image_3', maxCount: 1 },
        { name: 'image_4', maxCount: 1 },
        { name: 'file', maxCount: 1 },
        { name: 'file_1', maxCount: 1 },
        { name: 'file_2', maxCount: 1 },
        { name: 'file_3', maxCount: 1 },
        { name: 'file_4', maxCount: 1 }
    ]),
    handleAgentRequest
);

app.get('/api/agent/file', async (req, res) => {
    try {
        const environment = typeof req.query.environment === 'string' ? req.query.environment.trim() : null;
        const filePath = typeof req.query.path === 'string' ? req.query.path.trim() : null;
        
        if (!environment || !filePath) {
            return res.status(400).json({ error: 'environment and path parameters are required.' });
        }
        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on server.' });
        }
        
        let cleanPath = filePath.replace(/\\/g, '/').trim();
        while (cleanPath.startsWith('./')) cleanPath = cleanPath.slice(2);
        cleanPath = cleanPath.replace(/^\/+/, '');
        
        if (cleanPath.includes('..') || cleanPath.includes('\0')) {
            return res.status(400).json({ error: 'Invalid path parameter.' });
        }
        
        const filename = PathGuard.filename(cleanPath);
        const mimeType = getMimeTypeFromFilename(filename);
        
        let fileBuffer = null;
        
        // 1. Try downloading via SDK client.environments.files.download
        if (client.environments?.files?.download) {
            try {
                const bytes = await client.environments.files.download({
                    environment,
                    path: cleanPath
                });
                if (bytes) {
                    fileBuffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
                }
            } catch (_) {
                fileBuffer = null;
            }
        }
        
        // 2. Direct REST fallback to Environment Files API (?alt=media)
        if (!fileBuffer) {
            const encodedPath = cleanPath.split('/').map(encodeURIComponent).join('/');
            const downloadUrl = `https://generativelanguage.googleapis.com/v1beta/environments/${encodeURIComponent(environment)}/files/${encodedPath}?alt=media`;
            const response = await fetch(downloadUrl, {
                method: 'GET',
                headers: { 'x-goog-api-key': GEMINI_API_KEY }
            });
            
            if (!response.ok) {
                const detail = await response.text().catch(() => '');
                return res.status(response.status).json({
                    error: `Environment file download failed (${response.status}): ${detail.slice(0, 300)}`
                });
            }
            
            fileBuffer = Buffer.from(await response.arrayBuffer());
        }
        
        res.setHeader('Content-Type', mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader('Content-Length', fileBuffer.length);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.send(fileBuffer);
    } catch (error) {
        console.error('[Cohana Environment File Download Error]', error);
        return res.status(500).json({ error: error?.message || 'Failed to download environment file.' });
    }
});

app.post('/api/agent/skills', handleSkillsEndpoint);
app.get('/api/agent/skills', handleSkillsEndpoint);
app.post('/api/agent/confirm', continueComputerUseConfirmation);
app.post('/api/agent/resume', upload.none(), handleResumeUserControl);
export default app;
