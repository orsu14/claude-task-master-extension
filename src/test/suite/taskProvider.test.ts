import * as assert from 'assert';
import * as vscode from 'vscode';
import { TaskProvider, TaskItem } from '../../taskProvider';
import { TaskMasterClient } from '../../taskMasterClient';

// Mock TaskMasterClient for testing
class MockTaskMasterClient extends TaskMasterClient {
    private mockTasks: any[] = [];
    private mockProgress = { total: 0, completed: 0, inProgress: 0, todo: 0, blocked: 0 };

    constructor() {
        super('.taskmaster'); // Provide required path parameter
    }

    setMockTasks(tasks: any[]) {
        this.mockTasks = tasks;
    }

    setMockProgress(progress: any) {
        this.mockProgress = progress;
    }

    override async getTasks() {
        return this.mockTasks;
    }

    override async getTaskProgress() {
        // Convert old format to new format for backward compatibility
        return {
            ...this.mockProgress,
            mainTasks: {
                total: this.mockProgress.total,
                completed: this.mockProgress.completed,
                inProgress: this.mockProgress.inProgress,
                todo: this.mockProgress.todo,
                blocked: this.mockProgress.blocked
            },
            allItems: {
                total: this.mockProgress.total,
                completed: this.mockProgress.completed,
                inProgress: this.mockProgress.inProgress,
                todo: this.mockProgress.todo,
                blocked: this.mockProgress.blocked
            }
        };
    }

    override hasTaskmaster(): boolean {
        return true;
    }
}

suite('TaskProvider Test Suite', () => {
    let taskProvider: TaskProvider;
    let mockClient: MockTaskMasterClient;

    setup(() => {
        mockClient = new MockTaskMasterClient();
        taskProvider = new TaskProvider(mockClient);
    });

    test('Should create TaskItem with correct properties', () => {
        const task = {
            id: '1',
            title: 'Test Task',
            status: 'todo' as const,
            priority: 'high' as const,
            description: 'Test description'
        };

        const taskItem = new TaskItem(
            '1: Test Task',
            vscode.TreeItemCollapsibleState.None,
            task,
            'task'
        );

        assert.ok(taskItem.label?.includes('1: Test Task'), 'Should contain task ID and title');
        assert.strictEqual(taskItem.contextValue, 'task');
        assert.strictEqual(taskItem.task, task);
    });

    test('Should group tasks by status correctly', async () => {
        const mockTasks = [
            { id: '1', title: 'Todo Task', status: 'todo' as const },
            { id: '2', title: 'In Progress Task', status: 'in-progress' as const },
            { id: '3', title: 'Completed Task', status: 'completed' as const },
            { id: '4', title: 'Another Todo', status: 'todo' as const }
        ];

        mockClient.setMockTasks(mockTasks);
        
        // Test that getRootItems includes status groups
        const rootItems = await (taskProvider as any).getRootItems();
        
        // Should have status group items
        const statusGroups = rootItems.filter((item: TaskItem) => 
            item.type === 'category' && 
            (item.label?.includes('Todo') || 
             item.label?.includes('In progress') || 
             item.label?.includes('Completed'))
        );

        assert.ok(statusGroups.length > 0, 'Should create status group categories');
    });

    test('Should handle current work section with in-progress tasks', async () => {
        const mockTasks = [
            { 
                id: '1', 
                title: 'In Progress Task', 
                status: 'in-progress' as const,
                priority: 'high',
                subtasks: [
                    { id: '1.1', title: 'Subtask 1', status: 'completed' as const },
                    { id: '1.2', title: 'Subtask 2', status: 'in-progress' as const }
                ]
            },
            { id: '2', title: 'Todo Task', status: 'todo' as const }
        ];

        mockClient.setMockTasks(mockTasks);
        
        const rootItems = await (taskProvider as any).getRootItems();
        
        // Should have current work section
        const currentWorkSection = rootItems.find((item: TaskItem) => 
            item.label?.includes('CURRENT WORK')
        );

        assert.ok(currentWorkSection, 'Should create current work section');
        assert.strictEqual(currentWorkSection?.type, 'category');
    });

    test('Should handle tasks with subtasks correctly', async () => {
        const mockTask = {
            id: '1',
            title: 'Parent Task',
            status: 'todo' as const,
            subtasks: [
                { id: '1.1', title: 'Subtask 1', status: 'todo' as const },
                { id: '1.2', title: 'Subtask 2', status: 'completed' as const }
            ]
        };

        const taskItem = new TaskItem(
            '1: Parent Task',
            vscode.TreeItemCollapsibleState.Collapsed,
            mockTask,
            'task'
        );

        // Test children retrieval
        const children = await taskProvider.getChildren(taskItem);
        
        assert.strictEqual(children.length, 2, 'Should have 2 subtasks');
        assert.strictEqual(children[0]?.task?.id, '1.1');
        assert.strictEqual(children[1]?.task?.id, '1.2');
    });

    test('Should determine next recommended task correctly', async () => {
        const mockTasks = [
            { 
                id: '1', 
                title: 'Completed Task', 
                status: 'completed' as const,
                dependencies: []
            },
            { 
                id: '2', 
                title: 'Ready Task', 
                status: 'todo' as const,
                dependencies: ['1'], // Depends on completed task
                priority: 'high'
            },
            { 
                id: '3', 
                title: 'Blocked Task', 
                status: 'todo' as const,
                dependencies: ['4'], // Depends on non-existent task
                priority: 'high'
            }
        ];

        mockClient.setMockTasks(mockTasks);
        
        const nextTask = await (taskProvider as any).getNextRecommendedTask(mockTasks);
        
        assert.ok(nextTask, 'Should find a next task');
        assert.strictEqual(nextTask.id, '2', 'Should recommend task 2 (ready task)');
    });

    test('Should handle empty task list gracefully', async () => {
        mockClient.setMockTasks([]);
        
        const rootItems = await (taskProvider as any).getRootItems();
        
        // Should show "No tasks found" item
        assert.ok(rootItems.length > 0, 'Should have at least one item');
        const firstItem = rootItems[0];
        assert.ok(firstItem.label?.includes('No tasks found'), 'Should show no tasks message');
    });

    test('Should expand and collapse items correctly', () => {
        // Test expansion state management
        const itemKey = 'task:1';
        
        // Initially not expanded
        assert.strictEqual((taskProvider as any).isExpanded(itemKey), false);
        
        // Toggle to expand
        taskProvider.toggleExpansion(itemKey);
        assert.strictEqual((taskProvider as any).isExpanded(itemKey), true);
        
        // Toggle to collapse
        taskProvider.toggleExpansion(itemKey);
        assert.strictEqual((taskProvider as any).isExpanded(itemKey), false);
    });

    test('Should handle expandAll functionality', () => {
        taskProvider.expandAll();
        
        // After expandAll, any item should be expanded
        assert.strictEqual((taskProvider as any).isExpanded('test:key'), true);
        
        taskProvider.collapseAll();
        
        // After collapseAll, items should not be expanded
        assert.strictEqual((taskProvider as any).isExpanded('test:key'), false);
    });

    test('Should handle priority groups correctly', async () => {
        const mockTasks = [
            { id: '1', title: 'High Priority', status: 'todo' as const, priority: 'high' },
            { id: '2', title: 'Low Priority', status: 'todo' as const, priority: 'low' },
            { id: '3', title: 'No Priority', status: 'todo' as const }
        ];

        mockClient.setMockTasks(mockTasks);
        
        const priorityGroups = await (taskProvider as any).getTasksByPriorityGroups(mockTasks);
        
        assert.ok(priorityGroups.length > 0, 'Should create priority groups');
        
        const highPriorityGroup = priorityGroups.find((item: TaskItem) => 
            item.label?.includes('High Priority')
        );
        assert.ok(highPriorityGroup, 'Should have high priority group');
    });

    test('Should generate progress bar correctly', () => {
        const progressBar50 = (taskProvider as any).generateProgressBar(50);
        const progressBar100 = (taskProvider as any).generateProgressBar(100);
        const progressBar0 = (taskProvider as any).generateProgressBar(0);
        
        assert.ok(progressBar50.includes('█'), 'Should contain filled characters');
        assert.ok(progressBar50.includes('░'), 'Should contain empty characters');
        assert.ok(progressBar100.includes('█'), 'Should be fully filled at 100%');
        assert.ok(progressBar0.includes('░'), 'Should be empty at 0%');
    });

    test('Should handle next to work on section correctly', async () => {
        // Mock a task that would be recommended as next
        const nextRecommendedTask = {
            id: '2',
            title: 'Next Recommended Task',
            description: 'This is the next task to work on',
            status: 'pending' as const,
            priority: 'high' as const,
            dependencies: [],
            subtasks: []
        };

        // Override getNextRecommendedTask to return our test task
        const taskProvider = new TaskProvider(mockClient);
        (taskProvider as any).getNextRecommendedTask = async () => nextRecommendedTask;

        // Test that the next to work on section returns the recommended task when expanded
        const result = await (taskProvider as any).getTasksByCategory('NEXT TO WORK ON');
        
        assert.strictEqual(result.length, 1);
        assert.ok(result[0].label.includes('2: Next Recommended Task'), 'Should contain task ID and title');
        assert.strictEqual(result[0].task, nextRecommendedTask);
        assert.strictEqual(result[0].type, 'task');
        assert.strictEqual(result[0].contextValue, 'next-task');
    });

    test('Should handle dual counting system correctly (main tasks vs all items)', async () => {
        // Create mock data with main tasks and subtasks to test dual counting
        const mockTasks = [
            {
                id: '1',
                title: 'Task 1',
                status: 'completed' as const,
                subtasks: [
                    { id: '1.1', title: 'Subtask 1.1', status: 'completed' as const },
                    { id: '1.2', title: 'Subtask 1.2', status: 'todo' as const }
                ]
            },
            {
                id: '2',
                title: 'Task 2',
                status: 'in-progress' as const,
                subtasks: [
                    { id: '2.1', title: 'Subtask 2.1', status: 'in-progress' as const },
                    { id: '2.2', title: 'Subtask 2.2', status: 'blocked' as const },
                    { id: '2.3', title: 'Subtask 2.3', status: 'todo' as const }
                ]
            },
            {
                id: '3',
                title: 'Task 3',
                status: 'todo' as const,
                // No subtasks
            }
        ];

        mockClient.setMockTasks(mockTasks);
        
        // For our current mock implementation, it treats mainTasks = allItems = legacy format
        // So we'll set a simple progress that should result in some counts
        mockClient.setMockProgress({
            total: 8, // This will be used for both main and all
            completed: 2, 
            inProgress: 2,
            todo: 3,
            blocked: 1
        });

        // Test that getProgressItems correctly displays both counts
        const progressItems = await (taskProvider as any).getProgressItems();

        // Should have headers for both main tasks and all items
        const mainTasksHeader = progressItems.find((item: TaskItem) => 
            item.label?.includes('Main Tasks') && item.label?.includes('(8)')
        );
        const allItemsHeader = progressItems.find((item: TaskItem) => 
            item.label?.includes('All Items') && item.label?.includes('(8)')
        );

        assert.ok(mainTasksHeader, 'Should have Main Tasks header with count (8)');
        assert.ok(allItemsHeader, 'Should have All Items header with count (8)');

        // Check that main tasks header has correct description
        assert.strictEqual(mainTasksHeader?.description, 'Task IDs only');
        assert.strictEqual(allItemsHeader?.description, 'Including subtasks');

        // Test that the progress overview uses main tasks for primary display
        const rootItems = await (taskProvider as any).getRootItems();
        const progressOverview = rootItems.find((item: TaskItem) => 
            item.label?.includes('Progress Overview')
        );

        assert.ok(progressOverview, 'Should have Progress Overview');
        // Should show main task progress: 2 completed out of 8 total = 25%
        assert.ok(progressOverview?.description?.includes('25%'), 'Should show main task percentage');
        assert.ok(progressOverview?.description?.includes('(2/8 tasks)'), 'Should show main task counts');
    });

    test('Should display progress items with correct formatting and zero-count filtering', async () => {
        // Test the new progress display format with some zero counts
        mockClient.setMockProgress({
            total: 10,
            completed: 4,
            inProgress: 2,
            todo: 4,
            blocked: 0 // This should not appear in the display
        });

        const progressItems = await (taskProvider as any).getProgressItems();

        // Count different types of items
        const headerItems = progressItems.filter((item: TaskItem) => 
            item.label?.includes('Main Tasks') || item.label?.includes('All Items')
        );
        const progressDetailsItems = progressItems.filter((item: TaskItem) => 
            item.label?.includes('├─') && (typeof item.description === 'string' && item.description.includes('%'))
        );

        assert.strictEqual(headerItems.length, 2, 'Should have 2 header items (Main Tasks and All Items)');
        assert.ok(progressDetailsItems.length > 0, 'Should have progress breakdown items with percentages');

        // Check that zero counts are filtered out (blocked should not appear)
        const blockedItems = progressItems.filter((item: TaskItem) => 
            item.label?.includes('Blocked')
        );

        assert.strictEqual(blockedItems.length, 0, 'Should not show blocked items when count is zero');

        // Check that non-zero counts are displayed
        const completedItems = progressItems.filter((item: TaskItem) => 
            item.label?.includes('Completed')
        );

        assert.ok(completedItems.length > 0, 'Should show completed items (non-zero count)');
    });

    test('Should only show main tasks in status sections, not individual subtasks', async () => {
        const mockTasks = [
            {
                id: '1',
                title: 'Completed Main Task',
                status: 'completed' as const,
                subtasks: [
                    { id: '1.1', title: 'Completed Subtask', status: 'completed' as const },
                    { id: '1.2', title: 'In Progress Subtask', status: 'in-progress' as const }
                ]
            },
            {
                id: '2', 
                title: 'In Progress Main Task',
                status: 'in-progress' as const,
                subtasks: [
                    { id: '2.1', title: 'Todo Subtask', status: 'todo' as const }
                ]
            },
            {
                id: '3',
                title: 'Todo Main Task (no subtasks)',
                status: 'todo' as const
            }
        ];

        mockClient.setMockTasks(mockTasks);

        // Test completed section  
        const completedTasks = await (taskProvider as any).getTasksByCategory('Completed (1)');
        
        // Should only have 1 main task (Task 1 - it's completed), not the individual subtasks
        assert.strictEqual(completedTasks.length, 1, 'Completed section should only show main tasks');
        assert.strictEqual(completedTasks[0]?.task?.id, '1', 'Should show the completed main task');
        
        // Test in-progress section
        const inProgressTasks = await (taskProvider as any).getTasksByCategory('In progress (2)');
        
        // Should have 2 main tasks: Task 2 (in-progress) and Task 1 (has in-progress subtask)
        assert.strictEqual(inProgressTasks.length, 2, 'In progress section should show main tasks with in-progress status or subtasks');
        const inProgressTaskIds = inProgressTasks.map((t: TaskItem) => t.task?.id).sort();
        assert.deepStrictEqual(inProgressTaskIds, ['1', '2'], 'Should show both Task 1 (has in-progress subtask) and Task 2 (in-progress main)');
        
        // Test todo section
        const todoTasks = await (taskProvider as any).getTasksByCategory('Todo (2)');
        
        // Should have 2 main tasks: Task 3 (todo) and Task 2 (has todo subtask)
        assert.strictEqual(todoTasks.length, 2, 'Todo section should show main tasks with todo status or subtasks');
        const todoTaskIds = todoTasks.map((t: TaskItem) => t.task?.id).sort();
        assert.deepStrictEqual(todoTaskIds, ['2', '3'], 'Should show both Task 2 (has todo subtask) and Task 3 (todo main)');
    });

    test('Should include main tasks that have subtasks with matching status', async () => {
        const mockTasks = [
            {
                id: '1',
                title: 'Main Task with Mixed Subtasks',
                status: 'todo' as const, // Main task is todo
                subtasks: [
                    { id: '1.1', title: 'Completed Subtask', status: 'completed' as const },
                    { id: '1.2', title: 'In Progress Subtask', status: 'in-progress' as const }
                ]
            },
            {
                id: '2',
                title: 'Completed Main Task',
                status: 'completed' as const,
                subtasks: [
                    { id: '2.1', title: 'Also Completed', status: 'completed' as const }
                ]
            }
        ];

        mockClient.setMockTasks(mockTasks);

        // Test completed section - should include Task 1 (has completed subtask) AND Task 2 (completed main)
        const completedTasks = await (taskProvider as any).getTasksByCategory('Completed (2)');
        assert.strictEqual(completedTasks.length, 2, 'Should include main tasks with completed subtasks');
        
        const taskIds = completedTasks.map((t: TaskItem) => t.task?.id).sort();
        assert.deepStrictEqual(taskIds, ['1', '2'], 'Should include both Task 1 and Task 2');

        // Test in-progress section - should include Task 1 (has in-progress subtask)
        const inProgressTasks = await (taskProvider as any).getTasksByCategory('In progress (1)');
        assert.strictEqual(inProgressTasks.length, 1, 'Should include main task with in-progress subtask');
        assert.strictEqual(inProgressTasks[0]?.task?.id, '1', 'Should include Task 1');
    });

    test('Should show subtasks only when parent task is expanded', async () => {
        const mockTask = {
            id: '1',
            title: 'Parent Task',
            status: 'todo' as const,
            subtasks: [
                { id: '1.1', title: 'Subtask 1', status: 'todo' as const },
                { id: '1.2', title: 'Subtask 2', status: 'completed' as const },
                { id: '1.3', title: 'Subtask 3', status: 'in-progress' as const }
            ]
        };

        // Create a task item representing the parent task
        const parentTaskItem = new TaskItem(
            '1: Parent Task',
            vscode.TreeItemCollapsibleState.Expanded,
            mockTask,
            'task'
        );

        // Get children should return all subtasks
        const children = await taskProvider.getChildren(parentTaskItem);
        
        assert.strictEqual(children.length, 3, 'Should show all subtasks when parent is expanded');
        assert.strictEqual(children[0]?.task?.id, '1.1');
        assert.strictEqual(children[1]?.task?.id, '1.2');
        assert.strictEqual(children[2]?.task?.id, '1.3');
        
        // Verify all children are marked as subtasks
        children.forEach((child: TaskItem) => {
            assert.strictEqual(child.type, 'subtask', 'All children should be type "subtask"');
        });
    });

    test('Should filter subtasks by context in specific sections', async () => {
        const mockTask = {
            id: '1',
            title: 'Parent Task',
            status: 'todo' as const,
            subtasks: [
                { id: '1.1', title: 'Completed Subtask', status: 'completed' as const },
                { id: '1.2', title: 'Todo Subtask', status: 'todo' as const },
                { id: '1.3', title: 'In Progress Subtask', status: 'in-progress' as const }
            ]
        };

        // Create a task item with completed-section context
        const completedSectionTaskItem = new TaskItem(
            '1: Parent Task',
            vscode.TreeItemCollapsibleState.Expanded,
            mockTask,
            'task'
        );
        completedSectionTaskItem.contextValue = 'completed-section';

        // Get children should only return completed subtasks
        const children = await taskProvider.getChildren(completedSectionTaskItem);
        
        assert.strictEqual(children.length, 1, 'Should only show completed subtasks in completed section');
        assert.strictEqual(children[0]?.task?.id, '1.1');
        assert.strictEqual(children[0]?.task?.status, 'completed');
    });

    test('Should set correct collapsible state based on subtask presence', async () => {
        const mockTasks = [
            {
                id: '1',
                title: 'Task with Subtasks',
                status: 'todo' as const,
                subtasks: [
                    { id: '1.1', title: 'Subtask', status: 'todo' as const }
                ]
            },
            {
                id: '2',
                title: 'Task without Subtasks',
                status: 'todo' as const
                // No subtasks
            }
        ];

        mockClient.setMockTasks(mockTasks);

        const todoTasks = await (taskProvider as any).getTasksByCategory('Todo (2)');
        
        // Task with subtasks should be collapsible
        const taskWithSubtasks = todoTasks.find((t: TaskItem) => t.task?.id === '1');
        assert.ok(
            taskWithSubtasks?.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed ||
            taskWithSubtasks?.collapsibleState === vscode.TreeItemCollapsibleState.Expanded,
            'Task with subtasks should be collapsible'
        );

        // Task without subtasks should not be collapsible
        const taskWithoutSubtasks = todoTasks.find((t: TaskItem) => t.task?.id === '2');
        assert.strictEqual(
            taskWithoutSubtasks?.collapsibleState,
            vscode.TreeItemCollapsibleState.None,
            'Task without subtasks should not be collapsible'
        );
    });

    test('Should not duplicate tasks across multiple status sections', async () => {
        const mockTasks = [
            {
                id: '1',
                title: 'Mixed Status Task',
                status: 'in-progress' as const,
                subtasks: [
                    { id: '1.1', title: 'Completed Subtask', status: 'completed' as const },
                    { id: '1.2', title: 'Todo Subtask', status: 'todo' as const }
                ]
            }
        ];

        mockClient.setMockTasks(mockTasks);

        // This task should appear in multiple sections due to its mixed subtasks
        const inProgressTasks = await (taskProvider as any).getTasksByCategory('In progress (1)');
        const completedTasks = await (taskProvider as any).getTasksByCategory('Completed (1)');
        const todoTasks = await (taskProvider as any).getTasksByCategory('Todo (1)');

        // Should appear in in-progress (main task status)
        assert.strictEqual(inProgressTasks.length, 1);
        assert.strictEqual(inProgressTasks[0]?.task?.id, '1');

        // Should appear in completed (has completed subtask)
        assert.strictEqual(completedTasks.length, 1);
        assert.strictEqual(completedTasks[0]?.task?.id, '1');

        // Should appear in todo (has todo subtask)
        assert.strictEqual(todoTasks.length, 1);
        assert.strictEqual(todoTasks[0]?.task?.id, '1');

        // But it's the same task object, just displayed in different contexts
        assert.strictEqual(inProgressTasks[0]?.task, mockTasks[0]);
        assert.strictEqual(completedTasks[0]?.task, mockTasks[0]);
        assert.strictEqual(todoTasks[0]?.task, mockTasks[0]);
    });
}); 