import * as vscode from 'vscode';
import { TaskMasterClient } from './taskMasterClient';
import { log } from './logger';

export class TagStatusBarItem {
    private statusBarItem: vscode.StatusBarItem;
    private taskMasterClient: TaskMasterClient;
    private updateInterval: NodeJS.Timeout | undefined;

    constructor(context: vscode.ExtensionContext, taskMasterClient: TaskMasterClient) {
        this.taskMasterClient = taskMasterClient;
        
        // Create status bar item with high priority (left side, visible)
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left, 
            100
        );
        
        // Set command to switch tags when clicked
        this.statusBarItem.command = 'claudeTaskMaster.switchTag';
        
        // Add to context subscriptions for proper cleanup
        context.subscriptions.push(this.statusBarItem);
        
        // Initial update
        this.update();
        
        // Set up periodic updates every 30 seconds to catch external changes
        this.updateInterval = setInterval(() => {
            this.update();
        }, 30000);
        
        // Clean up interval on disposal
        context.subscriptions.push({
            dispose: () => {
                if (this.updateInterval) {
                    clearInterval(this.updateInterval);
                }
            }
        });
        
        log('TagStatusBarItem initialized');
    }

    /**
     * Update the status bar item with current tag information
     */
    public async update(): Promise<void> {
        try {
            const tagContext = this.taskMasterClient.getTagContext();
            
            if (tagContext.isTaggedFormat) {
                const currentTag = tagContext.currentTag || 'master';
                const tagCount = tagContext.availableTags?.length || 1;
                
                // Show current tag with tag icon
                this.statusBarItem.text = `$(tag) ${currentTag}`;
                
                // Detailed tooltip with available tags
                if (tagCount > 1) {
                    const availableTagsList = tagContext.availableTags?.join(', ') || '';
                    this.statusBarItem.tooltip = `Current Tag: ${currentTag}\nAvailable Tags (${tagCount}): ${availableTagsList}\nClick to switch tags`;
                } else {
                    this.statusBarItem.tooltip = `Current Tag: ${currentTag}\nClick to manage tags`;
                }
                
                // Show the status bar item
                this.statusBarItem.show();
                
                log(`Status bar updated: tag=${currentTag}, available=${tagCount}`);
            } else {
                // Hide status bar for non-tagged projects
                this.statusBarItem.hide();
                log('Status bar hidden: project not using tagged format');
            }
        } catch (error) {
            log(`Error updating status bar: ${error}`);
            
            // Show error state
            this.statusBarItem.text = `$(tag) Error`;
            this.statusBarItem.tooltip = `Error loading tag information: ${error instanceof Error ? error.message : String(error)}`;
            this.statusBarItem.show();
        }
    }

    /**
     * Force an immediate update of the status bar
     */
    public forceUpdate(): void {
        this.update();
    }

    /**
     * Show the status bar item
     */
    public show(): void {
        this.statusBarItem.show();
    }

    /**
     * Hide the status bar item
     */
    public hide(): void {
        this.statusBarItem.hide();
    }

    /**
     * Dispose of the status bar item
     */
    public dispose(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.statusBarItem.dispose();
        log('TagStatusBarItem disposed');
    }
} 