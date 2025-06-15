import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let logStream: fs.WriteStream | undefined;
let outputChannel: vscode.OutputChannel | undefined;

function getLogFilePath(): string | undefined {
    const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (projectRoot) {
        const logDir = path.join(projectRoot, 'logs');
        if (!fs.existsSync(logDir)){
            fs.mkdirSync(logDir, { recursive: true });
        }
        return path.join(logDir, 'extension.log');
    }
    return undefined;
}

function isFileLoggingEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('claudeTaskMaster');
    return config.get<boolean>('enableFileLogging', false);
}

function isDevelopmentMode(): boolean {
    const config = vscode.workspace.getConfiguration('claudeTaskMaster');
    return config.get<boolean>('developmentMode', false);
}

function isLoggingEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('claudeTaskMaster');
    return config.get<boolean>('enableLogging', false);
}

export function initializeLogger() {
    // Create VS Code output channel for better developer experience
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('Claude Task Master');
    }

    // Only initialize file logging if explicitly enabled
    if (isFileLoggingEnabled()) {
    const logFilePath = getLogFilePath();
    if (!logFilePath) {
            console.log('[TaskMaster] Could not initialize file logger, no workspace folder found.');
        return;
    }
    
    // Clear old log file on activation
    if (fs.existsSync(logFilePath)) {
        fs.unlinkSync(logFilePath);
    }
    logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
        log('File logger initialized.');
    }
}

export function log(message: string) {
        const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}`;
    
    // Always log to console in development mode or when logging is enabled
    if (isDevelopmentMode() || isLoggingEnabled()) {
        console.log(`[TaskMaster] ${message}`);
    }
    
    // Log to VS Code output channel if available (for developers)
    if (outputChannel && (isDevelopmentMode() || isLoggingEnabled())) {
        outputChannel.appendLine(formattedMessage);
    }
    
    // Only log to file if file logging is explicitly enabled
    if (isFileLoggingEnabled() && logStream) {
        logStream.write(`${formattedMessage}\n`);
    }
}

export function disposeLogger() {
    if (logStream) {
        log('Disposing file logger.');
        logStream.end();
        logStream = undefined;
    }
    
    if (outputChannel) {
        outputChannel.dispose();
        outputChannel = undefined;
    }
} 