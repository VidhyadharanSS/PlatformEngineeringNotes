# 📚 Platform Engineering Notes

Comprehensive study notes for Platform Engineering and DevOps — covering Linux, Networking, Docker, Kubernetes, CI/CD, and more.

## 🌐 Live Website

**[Read the notes online →](https://vidhyadharanss.github.io/PlatformEngineeringNotes/)**

## 📖 Features

- **11 Modules** covering all essential Platform Engineering topics
- **185+ detailed notes** with code examples and explanations
- **360+ Mermaid diagrams** for visual learning
- **Interactive highlighting** — select text to save it for later review
- **Full-text search** across all notes
- **8 built-in themes** — Dark, Light, Ghostty, Dracula, Solarized, Nord, Catppuccin, Cyberpunk
- **Compact / Comfortable sidebar density toggle**
- **Mobile responsive** — study on any device
- **Offline capable** — highlights saved in browser storage

## 📂 Modules

| Module | Topics |
|--------|--------|
| 🐧 **Linux** | FHS, Permissions, SSH, Storage, Systemd, Packages, Troubleshooting |
| 🌐 **Networking** | OSI/TCP-IP, Subnetting, DNS, Firewalls, HTTP, Load Balancing |
| 📜 **Shell Scripting** | Shell Basics, Arrays, Error Handling, Regex, **20-task Practice Lab** |
| 🐳 **Docker** | Containers, Images, Networking, Volumes, Compose |
| ☸️ **Kubernetes** | Architecture, Pods, Services, Ingress, RBAC, Helm, **CKA Exam Prep (50 Qs)** |
| 📦 **Git** | Objects, Branching, Rebasing, Hooks, Recovery |
| ⚡ **Nginx** | Reverse Proxy, Load Balancing, SSL, Rate Limiting |
| 🔄 **CI/CD** | Pipelines, GitHub Actions, Security Scanning, Deployment Strategies |
| 🐍 **Python** | Subprocess, APIs, Logging, Testing, Production Patterns |
| 🎯 **GitOps & ArgoCD** | GitOps Principles, ArgoCD, Sync Policies, Multi-Cluster |
| 🧰 **Platform Essentials** | APIs, Auth (JWT/OAuth2/mTLS), Webhooks, Secrets, OWASP, Observability, SLOs, Databases, Queues, Cloud/IaC, DNS/TLS, Data Formats, Incident Response |

## 💡 Highlighting Feature

The website includes a built-in highlighting system:

1. **Select any text** in the notes
2. Click the **📌 Highlight** button that appears
3. Your highlight is saved to **browser localStorage**
4. Access all highlights via the **📝 My Highlights** panel
5. Export highlights as JSON for backup

## 🚀 Local Development

To run locally:

```bash
# Clone the repo
git clone https://github.com/VidhyadharanSS/PlatformEngineeringNotes.git
cd PlatformEngineeringNotes

# Serve with any static server
python3 -m http.server 8000
# or
npx serve .
```

Then open [http://localhost:8000](http://localhost:8000)

## 🛠️ Dev Tooling

A one-shot CLI is included for CI / pre-commit checks. It rebuilds `notes.json` from the folder tree and scans every Mermaid diagram for lexical-error patterns:

```bash
# Scan only
python3 scripts/verify_diagrams.py

# Rebuild notes.json AND scan
python3 scripts/verify_diagrams.py --rebuild-index

# Verbose per-block status
python3 scripts/verify_diagrams.py -v

# Machine-readable JSON (for CI)
python3 scripts/verify_diagrams.py --json
```

Exit codes: `0` on success, `1` if risky unquoted labels remain, `2` on I/O error. Safe to drop into a GitHub Action.

## 📝 Structure

```
.
├── index.html              # Main entry point
├── css/style.css           # Styles
├── js/app.js               # Application logic
├── notes.json              # Notes index (auto-generated)
├── 1-Linux/                # Module directories
│   ├── Module_1_Approach_Guide.md
│   └── Subchapter_1.1/
│       ├── 1.1.1_Kernel_OS_and_Distros.md
│       └── ...
├── 2-Networking/
└── ...
```

## 🤝 Contributing

Contributions are welcome! If you find errors or want to add content:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License — feel free to use these notes for your learning journey!

---

Made with ❤️ for Platform Engineers
