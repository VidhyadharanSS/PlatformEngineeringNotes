# Platform Engineering Notes

A comprehensive, browser-based study guide for Platform Engineering and DevOps. Covers Linux, Networking, Shell scripting, Docker, Kubernetes, Git, Nginx, CI/CD, Python, GitOps with ArgoCD, and the Platform Engineer Essentials capstone (APIs, auth, observability, SLOs, databases, queues, cloud, DNS/TLS, incident response).

## Live Website

Read the notes online: <https://vidhyadharanss.github.io/PlatformEngineeringNotes/>

## What's Included

- **11 modules** covering the full Platform Engineering stack
- **185+ detailed notes** with runnable code, configs, and explanations
- **376+ Mermaid diagrams**, all machine-verified for syntax safety
- **Full-text search** across every note (`Ctrl+K`)
- **Interactive highlighting** — select text to colour-mark it, persisted in `localStorage`
- **Collapsible sidebar** — toggle on or off with `Ctrl+B` for distraction-free reading
- **Compact / comfortable density** modes for the navigation tree
- **8 built-in themes** — Dark, Light, Ghostty, Dracula, Solarized, Nord, Catppuccin, Cyberpunk
- **Auto-generated Table of Contents** for every note
- **Mobile responsive** — usable on phones and tablets
- **Offline capable** — once loaded, highlights and theme preferences live in browser storage

## Modules

| # | Module | Topics |
|---|--------|--------|
| 1 | Linux | Filesystem hierarchy, permissions, SSH, storage, systemd, packages, troubleshooting |
| 2 | Networking | OSI / TCP-IP, subnetting, DNS, firewalls, HTTP, load balancing |
| 3 | Shell Scripting | Bash fundamentals, arrays, error handling, regex, 20-task practice lab |
| 4 | Docker | Containers, images, networking, volumes, Compose |
| 5 | Kubernetes | Architecture, pods, services, ingress, RBAC, Helm, CKA exam prep (50 questions) |
| 6 | Git | Internals, branching, rebasing, hooks, recovery |
| 7 | Nginx | Reverse proxy, load balancing, SSL, rate limiting |
| 8 | CI/CD | Pipelines, GitHub Actions, security scanning, deployment strategies |
| 9 | Python | Subprocess, APIs, logging, testing, production patterns |
| 10 | GitOps and ArgoCD | GitOps principles, ArgoCD, sync policies, multi-cluster, 20-task practice lab |
| 11 | Platform Essentials | APIs and webhooks, auth (JWT / OAuth2 / mTLS), secrets, OWASP, observability, SLOs, databases, queues, cloud and IaC, DNS / TLS, data formats, incident response |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Focus the search box |
| `Ctrl+B` / `Cmd+B` | Toggle the sidebar on or off (desktop) |
| `Esc` | Close any open popup, dropdown, or fullscreen diagram |

## Highlighting

The notes ship with a built-in highlighter that mirrors how you'd mark up a paper textbook:

1. Select any text in a note.
2. Click the **Highlight** button that appears next to the selection.
3. Pick one of five colours — yellow, green, blue, purple, or pink.
4. The highlight is saved to `localStorage` and survives page reloads.
5. Highlights can be exported as JSON for backup or sharing.

## Local Development

Clone and serve as static files. No build step is required.

```bash
git clone https://github.com/VidhyadharanSS/PlatformEngineeringNotes.git
cd PlatformEngineeringNotes

# Serve with any static server
python3 -m http.server 8000
# or
npx serve .
```

Then open <http://localhost:8000>.

## Project Structure

```
.
├── index.html              # Main entry point
├── css/style.css           # All styles (themes + layout + components)
├── js/app.js               # Application logic (rendering, search, highlights)
├── notes.json              # Auto-generated index of all notes
├── scripts/
│   └── verify_diagrams.py  # CI tool — rebuilds notes.json + scans Mermaid blocks
├── 1-Linux/                # Module directories
│   ├── Module_1_Approach_Guide.md
│   └── Subchapter_1.1/
│       ├── 1.1.1_Kernel_OS_and_Distros.md
│       └── ...
├── 2-Networking/
└── ...                     # 11 module folders total
```

## Developer Tooling

A single CLI script handles index generation and diagram validation. Suitable for pre-commit hooks or CI:

```bash
# Scan all Mermaid diagrams for unsafe / unquoted labels
python3 scripts/verify_diagrams.py

# Rebuild notes.json from the folder tree, then scan
python3 scripts/verify_diagrams.py --rebuild-index

# Verbose, per-block status output
python3 scripts/verify_diagrams.py -v

# Machine-readable JSON output (for CI pipelines)
python3 scripts/verify_diagrams.py --json
```

Exit codes:

- `0` — success
- `1` — risky unquoted labels detected
- `2` — I/O or filesystem error

## Contributing

Contributions, corrections, and new content are all welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes — keep the writing voice friendly and example-driven.
4. Run `python3 scripts/verify_diagrams.py --rebuild-index` before committing.
5. Open a pull request.

## License

MIT — use these notes freely for your own learning, teaching, or team onboarding.
