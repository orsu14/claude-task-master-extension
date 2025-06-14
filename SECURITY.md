# Security Policy - Claude Task Master Extension

## Supported Versions

We actively support the latest major version of the Claude Task Master Extension with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ Yes            |
| < 1.0   | ❌ No             |

## Security Features

### API Key Protection
- **No hardcoded secrets**: All API keys are stored in environment variables
- **MCP configuration**: API keys are only accessible through VS Code's MCP configuration
- **Local storage only**: All sensitive data remains on your local machine
- **No telemetry**: Zero data transmission to external services

### Data Privacy
- **Local operation**: All task data remains on your local file system
- **No cloud storage**: Extension does not store or transmit personal data
- **Workspace isolation**: Each project's data is contained within its workspace
- **File system permissions**: Uses standard VS Code file access permissions

### Code Security
- **TypeScript implementation**: Strong typing reduces runtime errors
- **Input validation**: All user inputs are validated and sanitized
- **Error handling**: Comprehensive error handling prevents crashes
- **Memory management**: Proper cleanup prevents memory leaks

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please follow these steps:

### 1. **Do NOT** create a public GitHub issue

### 2. Report privately via one of these methods:
- **Email**: Send details to the project maintainer
- **GitHub Security**: Use GitHub's private vulnerability reporting feature
- **Direct message**: Contact maintainers through GitHub discussions

### 3. Include the following information:
- **Description**: Clear description of the vulnerability
- **Steps to reproduce**: Detailed reproduction steps
- **Impact assessment**: Potential security impact
- **Suggested fix**: If you have ideas for resolution
- **Discovery context**: How you discovered the issue

### 4. Response timeline:
- **Initial response**: Within 48 hours
- **Investigation**: Within 1 week
- **Fix deployment**: Critical issues within 2 weeks
- **Public disclosure**: After fix is released and tested

## Security Best Practices for Users

### API Key Management
```json
// .cursor/mcp.json - Correct way to store API keys
{
  "mcpServers": {
    "task-master-ai": {
      "env": {
        "ANTHROPIC_API_KEY": "your-actual-api-key-here",
        "PERPLEXITY_API_KEY": "your-actual-api-key-here"
      }
    }
  }
}
```

**Never:**
- ❌ Commit API keys to version control
- ❌ Share API keys in screenshots or documentation
- ❌ Store API keys in plain text files
- ❌ Use API keys in public repositories

**Always:**
- ✅ Use environment variables for API keys
- ✅ Keep API keys in `.cursor/mcp.json` or `.env` files
- ✅ Add `.env` to your `.gitignore` file
- ✅ Rotate API keys regularly
- ✅ Use minimal scope API keys when possible

### Workspace Security
- **Separate projects**: Use different workspaces for different projects
- **Access control**: Be mindful of who has access to your workspace
- **Backup strategy**: Regularly backup your task data
- **Clean workspace**: Remove old or unnecessary project files

### Network Security
- **MCP server**: Runs locally, no external network exposure
- **API calls**: Only to configured AI providers (Anthropic, OpenAI, etc.)
- **Firewall**: Standard VS Code network permissions apply
- **Proxy support**: Works with corporate proxy configurations

## Security Configuration

### Recommended VS Code Settings
```json
// settings.json
{
  "files.exclude": {
    "**/.env": true,
    "**/*.key": true,
    "**/*.pem": true
  },
  "files.watcherExclude": {
    "**/.taskmaster/cache/**": true
  }
}
```

### Environment File Security
```bash
# .env file permissions (Unix/macOS)
chmod 600 .env

# Windows equivalent
icacls .env /grant:r %USERNAME%:F /remove Everyone
```

### Git Security
```gitignore
# Add to .gitignore
.env
.env.local
.env.production
*.key
*.pem
secrets/
.cursor/mcp.json
```

## Vulnerability Assessment

### Extension Permissions
The extension requests minimal VS Code permissions:
- **File system access**: Read/write access to workspace files
- **Command execution**: Execute task-master-ai CLI commands
- **Tree view**: Display task hierarchy in VS Code sidebar
- **Configuration**: Access to VS Code settings and MCP config

### Third-Party Dependencies
- **Regular updates**: Dependencies are regularly updated for security patches
- **Vulnerability scanning**: Automated dependency vulnerability checks
- **Minimal dependencies**: Only essential packages are included
- **Trusted sources**: All dependencies from npm with active maintenance

### AI Provider Integration
- **Official APIs**: Only integrates with official AI provider APIs
- **HTTPS only**: All API communications use secure HTTPS
- **No data retention**: Extension doesn't store API responses
- **Rate limiting**: Respects API provider rate limits

## Incident Response

In case of a security incident:

1. **Immediate actions**:
   - Revoke affected API keys
   - Update to latest extension version
   - Check for unauthorized file access
   - Review git history for exposed secrets

2. **Investigation**:
   - Determine scope of impact
   - Identify affected data/systems
   - Document timeline of events
   - Collect evidence for analysis

3. **Recovery**:
   - Apply security patches
   - Restore from clean backups if needed
   - Implement additional safeguards
   - Monitor for further issues

4. **Prevention**:
   - Update security practices
   - Implement additional controls
   - Train team on new procedures
   - Regular security reviews

## Compliance

### Data Protection
- **GDPR compliance**: No personal data collection or processing
- **CCPA compliance**: No sale or sharing of personal information
- **Privacy by design**: Built with privacy as a core principle

### Industry Standards
- **OWASP guidelines**: Follows OWASP security best practices
- **Secure development**: Security considerations in development lifecycle
- **Regular audits**: Periodic security assessments

## Contact Information

For security-related questions or concerns:
- **Security issues**: Use GitHub's private vulnerability reporting
- **General questions**: Open a GitHub discussion
- **Urgent matters**: Contact project maintainers directly

## Security Updates

Security updates are distributed through:
- **VS Code Marketplace**: Automatic updates for marketplace installations
- **GitHub Releases**: Manual download for VSIX installations  
- **Security advisories**: Posted in GitHub security tab
- **Release notes**: Security fixes noted in CHANGELOG.md

---

**Last Updated**: June 2025  
**Version**: 1.0.0  
**Reviewed**: Initial release security assessment complete 