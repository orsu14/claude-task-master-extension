# Environment Setup Guide - Claude Task Master Extension

## Overview
This guide provides step-by-step instructions for setting up your environment to use the Claude Task Master Visual Interface extension effectively.

## Prerequisites

### Required Software
- **VS Code**: Version 1.74.0 or higher
- **Node.js**: Version 16.x or higher (for CLI fallback)
- **Git**: For version control (recommended)

### System Requirements
- **Windows**: Windows 10/11
- **macOS**: macOS 10.15 or higher  
- **Linux**: Ubuntu 18.04+ or equivalent

## Installation Methods

### Method 1: VS Code Marketplace (Recommended)
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search "Claude Task Master"
4. Click "Install"

### Method 2: VSIX Package
1. Download the `.vsix` file from GitHub releases
2. Open VS Code Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
3. Type "Extensions: Install from VSIX"
4. Select the downloaded `.vsix` file

## AI Provider Setup

### Required API Keys
The extension supports multiple AI providers. You need at least one API key:

- **Anthropic Claude** (Recommended): `ANTHROPIC_API_KEY`
- **OpenAI**: `OPENAI_API_KEY`
- **Perplexity AI**: `PERPLEXITY_API_KEY`
- **Google Gemini**: `GOOGLE_API_KEY`
- **Mistral AI**: `MISTRAL_API_KEY`
- **xAI Grok**: `XAI_API_KEY`
- **OpenRouter**: `OPENROUTER_API_KEY`

### Getting API Keys

#### Anthropic Claude (Recommended)
1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Sign up/login to your account
3. Navigate to "API Keys"
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

#### OpenAI
1. Visit [platform.openai.com](https://platform.openai.com)
2. Sign up/login to your account
3. Go to "API Keys" section
4. Create a new secret key
5. Copy the key (starts with `sk-`)

#### Perplexity AI
1. Visit [perplexity.ai](https://perplexity.ai)
2. Sign up/login to your account
3. Navigate to API settings
4. Generate an API key
5. Copy the key

#### Other Providers
- **Google Gemini**: [ai.google.dev](https://ai.google.dev)
- **Mistral AI**: [console.mistral.ai](https://console.mistral.ai)
- **xAI Grok**: [console.x.ai](https://console.x.ai)
- **OpenRouter**: [openrouter.ai](https://openrouter.ai)

## Configuration Setup

### MCP Configuration (Primary Method)
Create or edit `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "task-master-ai": {
      "command": "npx",
      "args": [
        "-y",
        "--package=task-master-ai",
        "task-master-ai"
      ],
      "env": {
        "ANTHROPIC_API_KEY": "your-anthropic-api-key-here",
        "PERPLEXITY_API_KEY": "your-perplexity-api-key-here",
        "OPENAI_API_KEY": "your-openai-api-key-here",
        "GOOGLE_API_KEY": "your-google-api-key-here",
        "XAI_API_KEY": "your-xai-api-key-here",
        "OPENROUTER_API_KEY": "your-openrouter-api-key-here",
        "MISTRAL_API_KEY": "your-mistral-api-key-here"
      }
    }
  }
}
```

### Environment File (CLI Fallback)
Create `.env` in your project root for CLI fallback:

```env
# Primary providers (choose one or more)
ANTHROPIC_API_KEY=your-anthropic-api-key-here
PERPLEXITY_API_KEY=your-perplexity-api-key-here
OPENAI_API_KEY=your-openai-api-key-here

# Additional providers (optional)
GOOGLE_API_KEY=your-google-api-key-here
XAI_API_KEY=your-xai-api-key-here
OPENROUTER_API_KEY=your-openrouter-api-key-here
MISTRAL_API_KEY=your-mistral-api-key-here

# Custom endpoints (optional)
AZURE_OPENAI_ENDPOINT=your-azure-endpoint-here
OLLAMA_BASE_URL=http://localhost:11434/api
```

## Project Initialization

### Step 1: Install Task Master AI CLI (Optional)
```bash
# Global installation (recommended)
npm install -g task-master-ai

# Or use npx (no installation required)
npx task-master-ai --help
```

### Step 2: Initialize Project
```bash
# Navigate to your project directory
cd your-project-directory

# Initialize Task Master
npx task-master-ai init

# Or if globally installed
task-master init
```

### Step 3: Create Initial Tasks
Create a Product Requirements Document (PRD):
```bash
# Create PRD file
echo "Project: My Awesome App
Goal: Build a task management application
Features: User authentication, task CRUD, real-time updates" > scripts/prd.txt

# Generate tasks from PRD
npx task-master-ai parse-prd scripts/prd.txt
```

## VS Code Configuration

### Recommended Settings
Add to your VS Code `settings.json`:

```json
{
  "claude-task-master.autoRefresh": true,
  "claude-task-master.defaultStatus": "pending",
  "claude-task-master.showProgress": true,
  "claude-task-master.enableLogging": false,
  "claude-task-master.enableFileLogging": false,
  "files.exclude": {
    "**/.env": true,
    "**/*.key": true
  }
}
```

### Workspace Settings
Create `.vscode/settings.json` in your project:

```json
{
  "claude-task-master.tasksPath": ".taskmaster/tasks",
  "claude-task-master.configPath": ".taskmaster/config.json",
  "files.watcherExclude": {
    "**/.taskmaster/cache/**": true,
    "**/node_modules/**": true
  }
}
```

## Security Setup

### File Permissions
```bash
# Secure your environment files (Unix/macOS)
chmod 600 .env
chmod 600 .cursor/mcp.json

# Windows (PowerShell)
icacls .env /grant:r $env:USERNAME:F /remove Everyone
```

### Git Configuration
Add to `.gitignore`:
```gitignore
# API Keys and secrets
.env
.env.local
.env.production
*.key
*.pem
secrets/

# Task Master cache
.taskmaster/cache/
.taskmaster/logs/

# OS files
.DS_Store
Thumbs.db
```

## Troubleshooting Setup

### Common Issues

#### 1. Extension Not Loading
**Symptoms**: Extension doesn't appear in sidebar
**Solutions**:
- Restart VS Code
- Check VS Code version (requires 1.74.0+)
- Verify extension installation in Extensions panel

#### 2. MCP Server Connection Failed
**Symptoms**: "MCP server unavailable" messages
**Solutions**:
- Check `.cursor/mcp.json` syntax
- Verify Node.js installation: `node --version`
- Install task-master-ai: `npm install -g task-master-ai`
- Restart VS Code

#### 3. API Key Issues
**Symptoms**: AI operations fail
**Solutions**:
- Verify API key format and validity
- Check API key has sufficient credits/quota
- Ensure correct environment variable names
- Test API key with curl:
```bash
curl -H "Authorization: Bearer your-api-key" \
     -H "Content-Type: application/json" \
     https://api.anthropic.com/v1/messages
```

#### 4. Task Files Not Found
**Symptoms**: "No tasks found" in tree view
**Solutions**:
- Run `npx task-master-ai init` in project root
- Check `.taskmaster/tasks/` directory exists
- Verify `tasks.json` file is present and valid JSON
- Check file permissions

#### 5. CLI Fallback Issues
**Symptoms**: Commands fail even with CLI
**Solutions**:
- Install task-master-ai globally: `npm install -g task-master-ai`
- Verify PATH includes npm global bin directory
- Check Node.js version: `node --version` (needs 16+)

### Performance Issues

#### Slow Tree Loading
- Reduce number of tasks in large projects
- Use task status filtering
- Close unused VS Code windows
- Check available system memory

#### High Memory Usage
- Restart VS Code periodically
- Close unnecessary workspace folders
- Clear `.taskmaster/cache/` directory

## Advanced Configuration

### Custom AI Models
Configure custom models in `.taskmaster/config.json`:
```json
{
  "models": {
    "main": "claude-3-sonnet-20241022",
    "research": "claude-3-opus-20240229",
    "fallback": "gpt-4"
  },
  "parameters": {
    "maxTokens": 4000,
    "temperature": 0.1
  }
}
```

### Proxy Configuration
For corporate environments:
```json
// settings.json
{
  "http.proxy": "http://proxy.company.com:8080",
  "http.proxyStrictSSL": false
}
```

### Logging Configuration
Enable debugging (logging is off by default):
```json
// settings.json
{
  "claude-task-master.enableLogging": true,        // Console & output channel logging
  "claude-task-master.enableFileLogging": false,   // File logging (creates logs/ folder)
  "claude-task-master.developmentMode": false      // Development mode logging
}
```

**Note**: File logging creates a `logs/` directory in your project. Most users should use `enableLogging` for console output instead.

## Environment Validation

### Quick Test Script
Create `test-setup.js`:
```javascript
const fs = require('fs');
const path = require('path');

// Check required files
const requiredFiles = [
  '.cursor/mcp.json',
  '.taskmaster/config.json',
  '.taskmaster/tasks/tasks.json'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// Check API keys
try {
  const mcp = JSON.parse(fs.readFileSync('.cursor/mcp.json', 'utf8'));
  const env = mcp.mcpServers['task-master-ai'].env;
  
  Object.keys(env).forEach(key => {
    if (env[key] && env[key] !== `${key}_HERE`) {
      console.log(`✅ ${key} configured`);
    } else {
      console.log(`❌ ${key} not configured`);
    }
  });
} catch (error) {
  console.log('❌ MCP configuration invalid');
}
```

Run: `node test-setup.js`

## Getting Help

### Resources
- **Documentation**: Check README.md and other `.md` files
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

### Support Channels
1. **GitHub Issues**: Bug reports and feature requests
2. **GitHub Discussions**: Questions and community help
3. **VS Code Marketplace**: Extension reviews and ratings

### Collecting Debug Information
```bash
# System information
code --version
node --version
npm --version

# Extension information
code --list-extensions | grep claude-task-master

# Test MCP server
npx task-master-ai --version

# Check logs
ls -la .taskmaster/logs/
```

---

**Last Updated**: June 2025  
**Version**: 1.0.0  
**Compatibility**: VS Code 1.74.0+ | Node.js 16.x+ 