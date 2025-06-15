import { log } from './logger';
import { Task, TaskStatus } from './types';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * MCP Client for integrating with task-master-ai MCP tools
 * Supports the new tagged format introduced in v0.17.0
 */
export class MCPClient {
    private projectRoot: string;
    private currentTag: string = 'master';
    private client: Client | null = null;
    private transport: StdioClientTransport | null = null;
    private isConnected: boolean = false;

    constructor(projectRoot: string) {
        this.projectRoot = projectRoot;
        log(`MCPClient initialized for project: ${projectRoot}`);
    }

    /**
     * Get the current active tag from state.json or default to 'master'
     */
    private async getCurrentTag(): Promise<string> {
        try {
            const stateFile = path.join(this.projectRoot, '.taskmaster', 'state.json');
            if (fs.existsSync(stateFile)) {
                const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
                return state.currentTag || 'master';
            }
            return this.currentTag;
        } catch (error) {
            log(`Error getting current tag, defaulting to 'master': ${error}`);
            return 'master';
        }
    }

    /**
     * Initialize MCP client connection
     */
    private async initializeConnection(): Promise<void> {
        if (this.isConnected && this.client) {
            return;
        }

        try {
            // Create MCP client
            this.client = new Client({
                name: 'task-master-extension',
                version: '1.0.0'
            });

            // Create stdio transport for task-master-ai CLI
            this.transport = new StdioClientTransport({
                command: 'task-master-ai',
                args: ['--mcp'],
                env: {
                    ...process.env,
                    TASKMASTER_PROJECT_ROOT: this.projectRoot
                }
            });

            // Connect to the MCP server
            await this.client.connect(this.transport);
            this.isConnected = true;
            log('MCP client connected successfully');
        } catch (error) {
            log(`Failed to initialize MCP connection: ${error}`);
            this.isConnected = false;
            throw error;
        }
    }

    /**
     * Check if MCP server is available
     */
    async isAvailable(): Promise<boolean> {
        try {
            await this.initializeConnection();
            if (!this.client) {
                return false;
            }

            // Try to ping the server
            await this.client.ping();
            return true;
        } catch (error) {
            log(`MCP server not available: ${error}`);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Generic method to call MCP tools
     */
    private async callMCPTool(toolName: string, parameters: any): Promise<any> {
        try {
            await this.initializeConnection();
            if (!this.client) {
                throw new Error('MCP client not initialized');
            }

            log(`Calling MCP tool: ${toolName} with parameters: ${JSON.stringify(parameters)}`);
            
            const result = await this.client.callTool({
                name: toolName,
                arguments: parameters
            });

            // Extract text content from the result
            if (result.content && Array.isArray(result.content)) {
                const textContent = result.content
                    .filter(item => item.type === 'text')
                    .map(item => item.text)
                    .join('\n');
                
                // Try to parse as JSON if possible
                try {
                    return JSON.parse(textContent);
                } catch {
                    return textContent;
                }
            }

            return result;
        } catch (error) {
            log(`MCP tool call failed: ${toolName} - ${error}`);
            throw error;
        }
    }

    /**
     * Get all tasks with tag support
     */
    async getTasks(tag?: string): Promise<Task[]> {
        const currentTag = tag || await this.getCurrentTag();
        
        const result = await this.callMCPTool('get_tasks', {
            projectRoot: this.projectRoot,
            tag: currentTag,
            withSubtasks: true
        });

        // Handle the tagged format response
        if (result && result.tagInfo && result.tagInfo.tasks) {
            return result.tagInfo.tasks;
        }
        
        // Fallback for direct tasks array
        return Array.isArray(result) ? result : [];
    }

    /**
     * Get a specific task with tag support
     */
    async getTask(taskId: string, tag?: string): Promise<Task | null> {
        const currentTag = tag || await this.getCurrentTag();
        
        const result = await this.callMCPTool('get_task', {
            projectRoot: this.projectRoot,
            id: taskId,
            tag: currentTag
        });

        return result || null;
    }

    /**
     * Get the next task to work on with tag support
     */
    async getNextTask(tag?: string): Promise<Task | null> {
        const currentTag = tag || await this.getCurrentTag();
        
        const result = await this.callMCPTool('next_task', {
            projectRoot: this.projectRoot,
            tag: currentTag
        });

        return result || null;
    }

    /**
     * Set task status with tag support
     */
    async setTaskStatus(taskId: string, status: TaskStatus, tag?: string): Promise<void> {
        const currentTag = tag || await this.getCurrentTag();
        
        await this.callMCPTool('set_task_status', {
            projectRoot: this.projectRoot,
            id: taskId,
            status: this.mapStatusToTaskMaster(status),
            tag: currentTag
        });
    }

    /**
     * Add a new task with tag support
     */
    async addTask(task: Omit<Task, 'id'>, tag?: string): Promise<void> {
        const currentTag = tag || await this.getCurrentTag();
        
        await this.callMCPTool('add_task', {
            projectRoot: this.projectRoot,
            prompt: `Title: ${task.title}\nDescription: ${task.description}\nDetails: ${task.details || ''}`,
            priority: task.priority || 'medium',
            dependencies: task.dependencies?.join(',') || '',
            tag: currentTag
        });
    }

    /**
     * Add a subtask with tag support
     */
    async addSubtask(parentTaskId: string, subtask: Omit<Task, 'id'>, tag?: string): Promise<void> {
        const currentTag = tag || await this.getCurrentTag();
        
        await this.callMCPTool('add_subtask', {
            projectRoot: this.projectRoot,
            id: parentTaskId,
            title: subtask.title,
            description: subtask.description || '',
            details: subtask.details || '',
            dependencies: subtask.dependencies?.join(',') || '',
            status: this.mapStatusToTaskMaster(subtask.status || 'pending'),
            tag: currentTag
        });
    }

    /**
     * Expand a task into subtasks with tag support
     */
    async expandTask(taskId: string, force: boolean = false, tag?: string): Promise<void> {
        const currentTag = tag || await this.getCurrentTag();
        
        await this.callMCPTool('expand_task', {
            projectRoot: this.projectRoot,
            id: taskId,
            force: force,
            tag: currentTag
        });
    }

    /**
     * Update a task with tag support
     */
    async updateTask(taskId: string, prompt: string, tag?: string): Promise<void> {
        const currentTag = tag || await this.getCurrentTag();
        
        await this.callMCPTool('update_task', {
            projectRoot: this.projectRoot,
            id: taskId,
            prompt: prompt,
            tag: currentTag
        });
    }

    /**
     * Update a subtask with tag support
     */
    async updateSubtask(subtaskId: string, prompt: string, tag?: string): Promise<void> {
        const currentTag = tag || await this.getCurrentTag();
        
        await this.callMCPTool('update_subtask', {
            projectRoot: this.projectRoot,
            id: subtaskId,
            prompt: prompt,
            tag: currentTag
        });
    }

    /**
     * Get available tags
     */
    async getTags(): Promise<string[]> {
        try {
            const result = await this.callMCPTool('get_tags', {
                projectRoot: this.projectRoot
            });
            return Array.isArray(result) ? result : ['master'];
        } catch (error) {
            log(`Error getting tags: ${error}`);
            return ['master'];
        }
    }

    /**
     * Switch to a different tag
     */
    async switchTag(tagName: string): Promise<void> {
        try {
            await this.callMCPTool('use_tag', {
                projectRoot: this.projectRoot,
                tag: tagName
            });
            this.currentTag = tagName;
            log(`Switched to tag: ${tagName}`);
        } catch (error) {
            log(`Error switching to tag ${tagName}: ${error}`);
            throw error;
        }
    }

    /**
     * Map extension status values to Task Master status values
     */
    private mapStatusToTaskMaster(status: TaskStatus): string {
        const statusMap: Record<TaskStatus, string> = {
            'todo': 'pending',
            'pending': 'pending',
            'in-progress': 'in-progress', 
            'completed': 'done',
            'done': 'done',
            'blocked': 'blocked',
            'deferred': 'deferred',
            'cancelled': 'cancelled',
            'review': 'review'
        };
        return statusMap[status] || 'pending';
    }

    /**
     * Get tag information including current tag and available tags
     */
    async getTagInfo(): Promise<{ currentTag: string; availableTags: string[] }> {
        try {
            const currentTag = await this.getCurrentTag();
            const availableTags = await this.getTags();
            return { currentTag, availableTags };
        } catch (error) {
            log(`Error getting tag info: ${error}`);
            return { currentTag: 'master', availableTags: ['master'] };
        }
    }

    /**
     * Clean up resources
     */
    async dispose(): Promise<void> {
        try {
            if (this.client && this.isConnected) {
                await this.client.close();
            }
            this.isConnected = false;
            this.client = null;
            this.transport = null;
            log('MCP client disposed');
        } catch (error) {
            log(`Error disposing MCP client: ${error}`);
        }
    }
} 