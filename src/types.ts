// Type definitions for Claude Task Master Extension

export interface Task {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority?: TaskPriority;
    dependencies?: string[];
    subtasks?: Task[];
    tags?: string[];
    created?: string;
    updated?: string;
    dueDate?: string;
    assignee?: string;
    category?: string;
    estimatedTime?: string;
    actualTime?: string;
    parentId?: string;
    details?: string;
    testStrategy?: string;
}

export type TaskStatus = 'todo' | 'in-progress' | 'completed' | 'blocked' | 'pending' | 'done' | 'deferred' | 'cancelled' | 'review';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TaskProgress {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    blocked: number;
    mainTasks: TaskProgressStats;
    allItems: TaskProgressStats;
}

export interface TaskProgressStats {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    blocked: number;
}

export interface SubtaskStats {
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
}

export interface TaskFormData {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dependencies?: string[];
    category?: string;
    estimatedTime?: string;
    dueDate?: string;
    assignee?: string;
    tags?: string[];
    tagContext?: string; // The tag context to create the task in (e.g., 'master', 'feature-branch')
}

export interface SubtaskFormData {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dependencies?: string[];
}

export interface TaskUpdateData {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dependencies?: string[];
    category?: string;
    estimatedTime?: string;
    actualTime?: string;
    dueDate?: string;
    assignee?: string;
    tags?: string[];
    details?: string;
    testStrategy?: string;
    updated?: string;
}

export interface CommandInfo {
    command: string;
    startTime: number;
    timestamp: string;
}

export interface UserInteractionDetails {
    taskId?: string;
    parentTaskId?: string;
    taskTitle?: string;
    taskStatus?: TaskStatus;
    source?: string;
    [key: string]: unknown;
}

export interface CommandResult {
    success: boolean;
    taskId?: string;
    parentTaskId?: string;
    action?: string;
    message?: string;
    error?: string;
}

export interface TaskDisplayInfo {
    taskId: string;
    taskType: 'Main Task' | 'Subtask';
    parentInfo: string;
    fullHierarchy: string;
}

export interface ExpandItemResult {
    expanded: number;
    skipped: number;
}

export interface TaskMasterConfig {
    models?: {
        main?: ModelConfig;
        research?: ModelConfig;
        fallback?: ModelConfig;
    };
    global?: {
        logLevel?: string;
        debug?: boolean;
        defaultSubtasks?: number;
        defaultPriority?: TaskPriority;
        projectName?: string;
        ollamaBaseURL?: string;
        bedrockBaseURL?: string;
        azureOpenaiBaseURL?: string;
        userId?: string;
    };
}

export interface ModelConfig {
    provider: string;
    modelId: string;
    maxTokens: number;
    temperature: number;
}

export interface TaskValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export interface TaskSearchResult {
    task: Task;
    matchType: 'title' | 'description' | 'id' | 'tag';
    matchText: string;
}

// Raw task types (from JSON files before normalization)
export interface RawTask {
    id: string | number;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    dependencies?: (string | number)[];
    subtasks?: RawTask[];
    tags?: string[];
    created?: string;
    updated?: string;
    dueDate?: string;
    assignee?: string;
    category?: string;
    estimatedTime?: string;
    actualTime?: string;
    parentId?: string | number;
    details?: string;
    testStrategy?: string;
    [key: string]: unknown; // Allow additional properties in raw data
} 

// Tag-related types for v0.17.0 multi-context functionality
export interface Tag {
    id: string;
    name: string;
    description?: string | undefined;
    creationDate: Date;
    isMaster: boolean;
    taskCount: number;
    color?: string | undefined;
    metadata?: TagMetadata | undefined;
}

export interface TagMetadata {
    lastModified?: Date;
    totalTasks?: number;
    completedTasks?: number;
    pendingTasks?: number;
    [key: string]: unknown;
}

export interface TaggedTasksFormat {
    [tagName: string]: {
        metadata?: TagMetadata;
        tasks: Task[];
    };
}

export interface TagStorage {
    tags: Tag[];
    activeTagId: string;
    version: string;
}

export interface TagValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export interface TagOperationResult {
    success: boolean;
    tagId?: string;
    action?: string;
    message?: string;
    error?: string;
}

// Legacy format detection types
export interface FormatDetectionResult {
    isLegacyFormat: boolean;
    version?: string;
    taskCount: number;
    needsMigration: boolean;
    complexity: 'low' | 'medium' | 'high';
}

export interface MigrationProgress {
    stage: string;
    percentage: number;
    currentOperation: string;
    estimatedTimeRemaining?: number;
    tasksProcessed: number;
    totalTasks: number;
}

export interface MigrationResult {
    success: boolean;
    backupPath?: string;
    migratedTasks: number;
    errors: string[];
    warnings: string[];
    rollbackAvailable: boolean;
}

// Extension-specific tag interfaces for UI and command operations
export interface TagContextInfo {
    currentTag: string;
    availableTags: string[];
    isTaggedFormat: boolean;
}

export interface TagSelectionOptions {
    label: string;
    detail: string;
    picked?: boolean;
    tagName: string;
}

export interface TagUIOptions {
    showCurrentTag?: boolean;
    allowMultipleSelection?: boolean;
    placeholder?: string;
    title?: string;
}

export interface ExtensionTagValidationResult {
    isValid: boolean;
    error?: string;
    warning?: string;
}

export interface TagAwareCommandOptions {
    taskId?: string;
    tagContext?: string;
    preserveCurrentTag?: boolean;
    showTagInUI?: boolean;
} 