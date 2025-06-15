import { Tag, TagMetadata, TagValidationResult } from './types';
import * as fs from 'fs';
import * as path from 'path';
import { log } from './logger';

/**
 * Core Tag class implementation for multi-context task management
 * Supports serialization, validation, and metadata management
 */
export class TagClass implements Tag {
    public id: string;
    public name: string;
    public description?: string | undefined;
    public creationDate: Date;
    public isMaster: boolean;
    public color?: string | undefined;
    public metadata?: TagMetadata | undefined;

    constructor(
        id: string,
        name: string,
        options: {
            description?: string | undefined;
            isMaster?: boolean;
            color?: string | undefined;
            metadata?: TagMetadata | undefined;
            creationDate?: Date;
        } = {}
    ) {
        this.id = id;
        this.name = name;
        this.description = options.description;
        this.creationDate = options.creationDate || new Date();
        this.isMaster = options.isMaster || false;
        this.color = options.color || this.generateDefaultColor();
        this.metadata = options.metadata || {};
    }

    /**
     * Computed property for task count
     */
    get taskCount(): number {
        return this.metadata?.totalTasks || 0;
    }

    /**
     * Generate a default color for the tag based on its name
     */
    private generateDefaultColor(): string {
        const colors = [
            '#007ACC', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'
        ];
        
        // Simple hash function to consistently assign colors
        let hash = 0;
        for (let i = 0; i < this.name.length; i++) {
            hash = ((hash << 5) - hash + this.name.charCodeAt(i)) & 0xffffffff;
        }
        const colorIndex = Math.abs(hash) % colors.length;
        return colors[colorIndex] || '#007ACC'; // Fallback to default color
    }

    /**
     * Validate the tag data
     */
    public validate(): TagValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Required field validation
        if (!this.id || this.id.trim() === '') {
            errors.push('Tag ID is required');
        }

        if (!this.name || this.name.trim() === '') {
            errors.push('Tag name is required');
        }

        // ID format validation (alphanumeric, hyphens, underscores only)
        if (this.id && !/^[a-zA-Z0-9_-]+$/.test(this.id)) {
            errors.push('Tag ID must contain only alphanumeric characters, hyphens, and underscores');
        }

        // Reserved name validation
        const reservedNames = ['master', 'main', 'default'];
        if (this.name && reservedNames.includes(this.name.toLowerCase()) && !this.isMaster) {
            errors.push(`Tag name '${this.name}' is reserved for master tags`);
        }

        // Name length validation
        if (this.name && this.name.length > 50) {
            warnings.push('Tag name is longer than 50 characters');
        }

        // Description length validation
        if (this.description && this.description.length > 500) {
            warnings.push('Tag description is longer than 500 characters');
        }

        // Color format validation
        if (this.color && !/^#[0-9A-Fa-f]{6}$/.test(this.color)) {
            warnings.push('Tag color should be a valid hex color code');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Serialize the tag to JSON format
     */
    public toJSON(): any {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            creationDate: this.creationDate.toISOString(),
            isMaster: this.isMaster,
            color: this.color,
            metadata: this.metadata
        };
    }

    /**
     * Deserialize a tag from JSON format
     */
    public static fromJSON(data: any): TagClass {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid tag data: must be an object');
        }

        if (!data.id || !data.name) {
            throw new Error('Invalid tag data: id and name are required');
        }

        const tag = new TagClass(
            data.id,
            data.name,
            {
                description: data.description,
                isMaster: data.isMaster,
                color: data.color,
                metadata: data.metadata,
                creationDate: data.creationDate ? new Date(data.creationDate) : new Date()
            }
        );

        // Validate the deserialized tag
        const validation = tag.validate();
        if (!validation.isValid) {
            throw new Error(`Invalid tag data: ${validation.errors.join(', ')}`);
        }

        return tag;
    }

    /**
     * Create a copy of the tag with updated properties
     */
    public clone(updates: Partial<Tag> = {}): TagClass {
        const newDescription = updates.description !== undefined ? updates.description : this.description;
        const newColor = updates.color !== undefined ? updates.color : this.color;
        const newMetadata = updates.metadata !== undefined ? updates.metadata : this.metadata;
        
        return new TagClass(
            updates.id || this.id,
            updates.name || this.name,
            {
                description: newDescription,
                isMaster: updates.isMaster !== undefined ? updates.isMaster : this.isMaster,
                color: newColor,
                metadata: newMetadata,
                creationDate: this.creationDate
            }
        );
    }

    /**
     * Update the tag's metadata
     */
    public updateMetadata(updates: Partial<TagMetadata>): void {
        this.metadata = {
            ...this.metadata,
            ...updates,
            lastModified: new Date()
        };
    }

    /**
     * Update the task count in metadata
     */
    public updateTaskCount(totalTasks: number, completedTasks: number = 0, pendingTasks: number = 0): void {
        this.updateMetadata({
            totalTasks,
            completedTasks,
            pendingTasks
        });
    }

    /**
     * Check if this tag equals another tag
     */
    public equals(other: Tag): boolean {
        return this.id === other.id && this.name === other.name;
    }

    /**
     * Get a display-friendly representation of the tag
     */
    public toString(): string {
        const taskInfo = this.taskCount > 0 ? ` (${this.taskCount} tasks)` : '';
        const masterIndicator = this.isMaster ? ' [Master]' : '';
        return `${this.name}${taskInfo}${masterIndicator}`;
    }
}

/**
 * Utility functions for tag operations
 */
export class TagUtils {
    /**
     * Generate a unique tag ID based on the name
     */
    public static generateTagId(name: string): string {
        // Convert to lowercase, replace spaces with hyphens, remove special characters
        const baseId = name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-_]/g, '')
            .substring(0, 30); // Limit length

        // Add timestamp and random suffix to ensure uniqueness
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `${baseId}-${timestamp}-${random}`;
    }

    /**
     * Create a master tag
     */
    public static createMasterTag(): TagClass {
        return new TagClass('master', 'Master', {
            description: 'Default tag for all tasks',
            isMaster: true,
            color: '#007ACC'
        });
    }

    /**
     * Validate a collection of tags
     */
    public static validateTagCollection(tags: Tag[]): TagValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        const seenIds = new Set<string>();
        const seenNames = new Set<string>();
        let masterCount = 0;

        for (const tag of tags) {
            // Individual tag validation
            const tagValidation = new TagClass(tag.id, tag.name, tag).validate();
            errors.push(...tagValidation.errors);
            warnings.push(...tagValidation.warnings);

            // Duplicate ID check
            if (seenIds.has(tag.id)) {
                errors.push(`Duplicate tag ID: ${tag.id}`);
            }
            seenIds.add(tag.id);

            // Duplicate name check
            if (seenNames.has(tag.name.toLowerCase())) {
                errors.push(`Duplicate tag name: ${tag.name}`);
            }
            seenNames.add(tag.name.toLowerCase());

            // Master tag count
            if (tag.isMaster) {
                masterCount++;
            }
        }

        // Master tag validation
        if (masterCount === 0) {
            warnings.push('No master tag found - one will be created automatically');
        } else if (masterCount > 1) {
            errors.push('Multiple master tags found - only one master tag is allowed');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Sort tags with master tag first, then alphabetically
     */
    public static sortTags(tags: Tag[]): Tag[] {
        return [...tags].sort((a, b) => {
            // Master tag always comes first
            if (a.isMaster && !b.isMaster) {
                return -1;
            }
            if (!a.isMaster && b.isMaster) {
                return 1;
            }
            
            // Then sort alphabetically by name
            return a.name.localeCompare(b.name);
        });
    }
}

export interface TagInfo {
    name: string;
    description?: string;
    creationDate: Date;
    isMaster: boolean;
    taskCount: number;
    color?: string;
}

export interface TagState {
    currentTag: string;
    migrationCompleted: boolean;
    lastMigrationDate?: Date;
}

/**
 * Tag Manager for handling tag operations and state management
 * Supports the new tagged format introduced in v0.17.0
 */
export class TagManager {
    private projectRoot: string;
    private stateFilePath: string;
    private currentState: TagState;

    constructor(projectRoot: string) {
        this.projectRoot = projectRoot;
        this.stateFilePath = path.join(projectRoot, 'state.json');
        this.currentState = this.loadState();
        log(`TagManager initialized for project: ${projectRoot}`);
    }

    /**
     * Load tag state from state.json
     */
    private loadState(): TagState {
        try {
            if (fs.existsSync(this.stateFilePath)) {
                const stateData = fs.readFileSync(this.stateFilePath, 'utf8');
                const state = JSON.parse(stateData);
                log(`Loaded tag state: currentTag=${state.currentTag}, migrationCompleted=${state.migrationCompleted}`);
                const result: TagState = {
                    currentTag: state.currentTag || 'master',
                    migrationCompleted: state.migrationCompleted || false
                };
                if (state.lastMigrationDate) {
                    result.lastMigrationDate = new Date(state.lastMigrationDate);
                }
                return result;
            }
        } catch (error) {
            log(`Error loading tag state: ${error}`);
        }

        // Default state
        const defaultState: TagState = {
            currentTag: 'master',
            migrationCompleted: false
        };
        this.saveState(defaultState);
        return defaultState;
    }

    /**
     * Save tag state to state.json
     */
    private saveState(state: TagState): void {
        try {
            fs.writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2), 'utf8');
            this.currentState = state;
            log(`Saved tag state: currentTag=${state.currentTag}`);
        } catch (error) {
            log(`Error saving tag state: ${error}`);
            throw error;
        }
    }

    /**
     * Get the current active tag
     */
    getCurrentTag(): string {
        return this.currentState.currentTag;
    }

    /**
     * Set the current active tag
     */
    setCurrentTag(tagName: string): void {
        if (!this.validateTagName(tagName)) {
            throw new Error(`Invalid tag name: ${tagName}`);
        }

        this.currentState.currentTag = tagName;
        this.saveState(this.currentState);
        log(`Current tag changed to: ${tagName}`);
    }

    /**
     * Check if migration has been completed
     */
    isMigrationCompleted(): boolean {
        return this.currentState.migrationCompleted;
    }

    /**
     * Mark migration as completed
     */
    markMigrationCompleted(): void {
        this.currentState.migrationCompleted = true;
        this.currentState.lastMigrationDate = new Date();
        this.saveState(this.currentState);
        log('Migration marked as completed');
    }

    /**
     * Get available tags from the tasks.json file
     */
    getAvailableTags(): string[] {
        try {
            const tasksJsonPath = path.join(this.projectRoot, 'tasks', 'tasks.json');
            if (!fs.existsSync(tasksJsonPath)) {
                return ['master'];
            }

            const tasksData = fs.readFileSync(tasksJsonPath, 'utf8');
            const parsed = JSON.parse(tasksData);

            // Check for tagged format
            if (parsed.master || parsed.tags) {
                // Direct tag format: { master: {...}, tag1: {...}, ... }
                if (parsed.master && !parsed.tags) {
                    return Object.keys(parsed);
                }
                // Nested tag format: { tags: { master: {...}, tag1: {...}, ... } }
                if (parsed.tags) {
                    return Object.keys(parsed.tags);
                }
            }

            // Legacy format or unknown format
            return ['master'];
        } catch (error) {
            log(`Error getting available tags: ${error}`);
            return ['master'];
        }
    }

    /**
     * Get tag information including task counts
     */
    getTagInfo(tagName: string): TagInfo | null {
        try {
            const availableTags = this.getAvailableTags();
            if (!availableTags.includes(tagName)) {
                return null;
            }

            const tasksJsonPath = path.join(this.projectRoot, 'tasks', 'tasks.json');
            if (!fs.existsSync(tasksJsonPath)) {
                return null;
            }

            const tasksData = fs.readFileSync(tasksJsonPath, 'utf8');
            const parsed = JSON.parse(tasksData);

            let tagData: any = null;
            let taskCount = 0;

            // Get tag data based on format
            if (parsed.master && !parsed.tags) {
                // Direct tag format
                tagData = parsed[tagName];
            } else if (parsed.tags) {
                // Nested tag format
                tagData = parsed.tags[tagName];
            }

            if (tagData && tagData.tasks && Array.isArray(tagData.tasks)) {
                taskCount = tagData.tasks.length;
            }

            return {
                name: tagName,
                description: tagData?.metadata?.description || (tagName === 'master' ? 'Default task context' : ''),
                creationDate: tagData?.metadata?.created ? new Date(tagData.metadata.created) : new Date(),
                isMaster: tagName === 'master',
                taskCount: taskCount,
                color: tagData?.metadata?.color || this.getDefaultTagColor(tagName)
            };
        } catch (error) {
            log(`Error getting tag info for ${tagName}: ${error}`);
            return null;
        }
    }

    /**
     * Get all tag information
     */
    getAllTagInfo(): TagInfo[] {
        const availableTags = this.getAvailableTags();
        return availableTags
            .map(tagName => this.getTagInfo(tagName))
            .filter((tagInfo): tagInfo is TagInfo => tagInfo !== null);
    }

    /**
     * Validate tag name
     */
    private validateTagName(tagName: string): boolean {
        // Tag names should be alphanumeric with hyphens and underscores
        const tagPattern = /^[a-zA-Z0-9_-]+$/;
        return tagPattern.test(tagName) && tagName.length > 0 && tagName.length <= 50;
    }

    /**
     * Get default color for a tag
     */
    private getDefaultTagColor(tagName: string): string {
        const colors: string[] = [
            '#007ACC', // VS Code Blue
            '#68217A', // VS Code Purple
            '#0E639C', // VS Code Dark Blue
            '#B5200D', // VS Code Red
            '#0F7B0F', // VS Code Green
            '#795E26', // VS Code Yellow
            '#A31515', // VS Code Dark Red
            '#0000FF', // Blue
            '#008000', // Green
            '#800080'  // Purple
        ];

        // Use tag name to consistently assign colors
        let hash = 0;
        for (let i = 0; i < tagName.length; i++) {
            hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colorIndex = Math.abs(hash) % colors.length;
        return colors[colorIndex]!; // Use non-null assertion since we know the array has elements
    }

    /**
     * Check if the current tasks.json uses the new tagged format
     */
    isTaggedFormat(): boolean {
        try {
            const tasksJsonPath = path.join(this.projectRoot, 'tasks', 'tasks.json');
            if (!fs.existsSync(tasksJsonPath)) {
                return false;
            }

            const tasksData = fs.readFileSync(tasksJsonPath, 'utf8');
            const parsed = JSON.parse(tasksData);

            // Check for tagged format indicators
            return !!(parsed.master || parsed.tags);
        } catch (error) {
            log(`Error checking tagged format: ${error}`);
            return false;
        }
    }

    /**
     * Get tag context information for display
     */
    getTagContext(): { currentTag: string; availableTags: string[]; isTaggedFormat: boolean } {
        return {
            currentTag: this.getCurrentTag(),
            availableTags: this.getAvailableTags(),
            isTaggedFormat: this.isTaggedFormat()
        };
    }

    /**
     * Create a new tag (placeholder for future implementation)
     */
    async createTag(tagName: string, description?: string): Promise<void> {
        if (!this.validateTagName(tagName)) {
            throw new Error(`Invalid tag name: ${tagName}`);
        }

        const availableTags = this.getAvailableTags();
        if (availableTags.includes(tagName)) {
            throw new Error(`Tag already exists: ${tagName}`);
        }

        // This would be implemented to create a new tag in the tasks.json
        // For now, just log the intent
        log(`Creating new tag: ${tagName} with description: ${description || 'none'}`);
        throw new Error('Tag creation not yet implemented');
    }

    /**
     * Delete a tag (placeholder for future implementation)
     */
    async deleteTag(tagName: string): Promise<void> {
        if (tagName === 'master') {
            throw new Error('Cannot delete the master tag');
        }

        const availableTags = this.getAvailableTags();
        if (!availableTags.includes(tagName)) {
            throw new Error(`Tag does not exist: ${tagName}`);
        }

        if (this.getCurrentTag() === tagName) {
            throw new Error('Cannot delete the currently active tag');
        }

        // This would be implemented to delete a tag from the tasks.json
        // For now, just log the intent
        log(`Deleting tag: ${tagName}`);
        throw new Error('Tag deletion not yet implemented');
    }
} 