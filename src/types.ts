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