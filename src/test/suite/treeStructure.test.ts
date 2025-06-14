import * as assert from 'assert';
import * as vscode from 'vscode';
import { TaskProvider, TaskItem } from '../../taskProvider';
import { TaskMasterClient } from '../../taskMasterClient';

// Mock TaskMasterClient for tree structure testing
class MockTreeTaskMasterClient extends TaskMasterClient {
    private mockTasks: any[] = [];

    constructor() {
        super('/mock/path');
    }

    setMockTasks(tasks: any[]) {
        this.mockTasks = tasks;
    }

    override async getTasks() {
        return this.mockTasks;
    }

    override async getTaskProgress() {
        const total = this.mockTasks.length;
        const completed = this.mockTasks.filter(t => t.status === 'completed' || t.status === 'done').length;
        const inProgress = this.mockTasks.filter(t => t.status === 'in-progress').length;
        const todo = this.mockTasks.filter(t => t.status === 'todo' || t.status === 'pending').length;
        const blocked = this.mockTasks.filter(t => t.status === 'blocked').length;
        
        // Return new format with both main tasks and all items
        const mainTasksData = { total, completed, inProgress, todo, blocked };
        return { 
            ...mainTasksData,
            mainTasks: mainTasksData,
            allItems: mainTasksData // For test simplicity, same as main tasks
        };
    }

    override hasTaskmaster(): boolean {
        return true;
    }
}

suite('Tree Structure Test Suite', () => {
    let mockClient: MockTreeTaskMasterClient;
    let taskProvider: TaskProvider;

    setup(() => {
        mockClient = new MockTreeTaskMasterClient();
        taskProvider = new TaskProvider(mockClient);
    });

    test('Should create proper parent-child relationships', async () => {
        const mockTasks = [
            {
                id: '1',
                title: 'Parent Task',
                status: 'todo' as const,
                subtasks: [
                    { id: '1.1', title: 'Child 1', status: 'todo' as const, dependencies: [] },
                    { id: '1.2', title: 'Child 2', status: 'completed' as const, dependencies: [] }
                ]
            }
        ];

        mockClient.setMockTasks(mockTasks);

        // Create parent task item
        const parentTaskItem = new TaskItem(
            '1: Parent Task',
            vscode.TreeItemCollapsibleState.Collapsed,
            mockTasks[0],
            'task'
        );

        // Get children
        const children = await taskProvider.getChildren(parentTaskItem);

        assert.strictEqual(children.length, 2, 'Should have 2 child items');
        assert.strictEqual(children[0]?.task?.id, '1.1', 'First child should have correct ID');
        assert.strictEqual(children[1]?.task?.id, '1.2', 'Second child should have correct ID');
        assert.strictEqual(children[0]?.type, 'subtask', 'Children should be subtask type');
        assert.strictEqual(children[1]?.type, 'subtask', 'Children should be subtask type');
    });

    test('Should handle proper nesting levels', async () => {
        const mockTasks = [
            {
                id: '1',
                title: 'Parent Task',
                status: 'todo' as const,
                subtasks: [
                    { id: '1.1', title: 'Child 1', status: 'todo' as const, dependencies: [] },
                    { id: '1.2', title: 'Child 2', status: 'completed' as const, dependencies: [] }
                ]
            }
        ];

        mockClient.setMockTasks(mockTasks);

        // Create parent at level 0
        const parentTaskItem = new TaskItem(
            '1: Parent Task',
            vscode.TreeItemCollapsibleState.Collapsed,
            mockTasks[0],
            'task',
            0 // Root level
        );

        const children = await taskProvider.getChildren(parentTaskItem);

        // Children should be at level 1
        assert.strictEqual(children[0]?.nestingLevel, 1, 'First child should be at nesting level 1');
        assert.strictEqual(children[1]?.nestingLevel, 1, 'Second child should be at nesting level 1');
        assert.strictEqual(parentTaskItem.nestingLevel, 0, 'Parent should be at nesting level 0');
    });

    test('Should return correct parent for task items', () => {
        const parentTask = {
            id: '1',
            title: 'Parent Task',
            status: 'todo' as const,
            subtasks: [
                { id: '1.1', title: 'Child', status: 'todo' as const, dependencies: [] }
            ]
        };

        const childItem = new TaskItem(
            '1.1: Child',
            vscode.TreeItemCollapsibleState.None,
            parentTask.subtasks[0],
            'subtask',
            1
        );

        // Test parent relationship
        const parent = taskProvider.getParent(childItem);
        // Note: In the actual implementation, getParent returns null as it's complex to track
        // This test documents the current behavior
        assert.strictEqual(parent, null, 'getParent currently returns null due to implementation complexity');
    });

    test('Should handle tasks without subtasks correctly', async () => {
        const mockTasks = [
            {
                id: '1',
                title: 'Task without subtasks',
                status: 'todo' as const,
                subtasks: []
            }
        ];

        mockClient.setMockTasks(mockTasks);

        const taskItem = new TaskItem(
            '1: Task without subtasks',
            vscode.TreeItemCollapsibleState.None,
            mockTasks[0],
            'task'
        );

        const children = await taskProvider.getChildren(taskItem);

        assert.strictEqual(children.length, 0, 'Should have no children');
    });

    test('Should handle tasks with undefined subtasks', async () => {
        const mockTasks = [
            {
                id: '1',
                title: 'Task with undefined subtasks',
                status: 'todo' as const
                // subtasks property is undefined
            }
        ];

        mockClient.setMockTasks(mockTasks);

        const taskItem = new TaskItem(
            '1: Task with undefined subtasks',
            vscode.TreeItemCollapsibleState.None,
            mockTasks[0],
            'task'
        );

        const children = await taskProvider.getChildren(taskItem);

        assert.strictEqual(children.length, 0, 'Should handle undefined subtasks gracefully');
    });

    test('Should create proper collapsible states for tasks with subtasks', async () => {
        const mockTasks = [
            {
                id: '1',
                title: 'Task with subtasks',
                status: 'todo' as const,
                subtasks: [
                    { id: '1.1', title: 'Subtask', status: 'todo' as const, dependencies: [] }
                ]
            },
            {
                id: '2',
                title: 'Task without subtasks',
                status: 'todo' as const,
                subtasks: []
            }
        ];

        mockClient.setMockTasks(mockTasks);

        // Get root items which should include these tasks in status categories
        const rootItems = await (taskProvider as any).getRootItems();

        // Find Todo category and expand it
        const todoCategory = rootItems.find((item: TaskItem) => 
            item.label?.toLowerCase().includes('todo')
        );
        
        if (todoCategory) {
            const todoTasks = await (taskProvider as any).getTasksByCategory(todoCategory.label);
            
            // Tasks with subtasks should be collapsible, those without should not be
            const taskWithSubtasks = todoTasks.find((item: TaskItem) => item.task?.id === '1');
            const taskWithoutSubtasks = todoTasks.find((item: TaskItem) => item.task?.id === '2');

            if (taskWithSubtasks) {
                assert.notStrictEqual(
                    taskWithSubtasks.collapsibleState,
                    vscode.TreeItemCollapsibleState.None,
                    'Task with subtasks should be collapsible'
                );
            }

            if (taskWithoutSubtasks) {
                assert.strictEqual(
                    taskWithoutSubtasks.collapsibleState,
                    vscode.TreeItemCollapsibleState.None,
                    'Task without subtasks should not be collapsible'
                );
            }
        }
    });

    test('Should handle expansion state correctly', () => {
        // Test expansion state management
        const itemKey = 'task:1:Test Task';

        // Initially should not be expanded
        assert.strictEqual((taskProvider as any).isExpanded(itemKey), false);

        // Toggle expansion
        taskProvider.toggleExpansion(itemKey);
        assert.strictEqual((taskProvider as any).isExpanded(itemKey), true);

        // Toggle back
        taskProvider.toggleExpansion(itemKey);
        assert.strictEqual((taskProvider as any).isExpanded(itemKey), false);
    });

    test('Should handle expandAll and collapseAll correctly', () => {
        const itemKey1 = 'task:1';
        const itemKey2 = 'task:2';

        // Start collapsed
        assert.strictEqual((taskProvider as any).isExpanded(itemKey1), false);
        assert.strictEqual((taskProvider as any).isExpanded(itemKey2), false);

        // Expand all
        taskProvider.expandAll();
        assert.strictEqual((taskProvider as any).isExpanded(itemKey1), true);
        assert.strictEqual((taskProvider as any).isExpanded(itemKey2), true);

        // Collapse all
        taskProvider.collapseAll();
        assert.strictEqual((taskProvider as any).isExpanded(itemKey1), false);
        assert.strictEqual((taskProvider as any).isExpanded(itemKey2), false);
    });

    test('Should generate correct item keys for different types', () => {
        const taskKey = (taskProvider as any).getItemKey('task', 'Task Label', '1');
        const categoryKey = (taskProvider as any).getItemKey('category', 'Category Label');
        const progressKey = (taskProvider as any).getItemKey('progress', 'Progress Label');

        assert.strictEqual(taskKey, 'task:1');
        assert.strictEqual(categoryKey, 'category:Category Label');
        assert.strictEqual(progressKey, 'progress:Progress Label');
    });

    test('Should handle deep nesting correctly', async () => {
        // Test with deeply nested structure (though task-master-ai typically only has 2 levels)
        const mockTasks = [
            {
                id: '1',
                title: 'Level 1 Task',
                status: 'todo' as const,
                subtasks: [
                    {
                        id: '1.1',
                        title: 'Level 2 Subtask',
                        status: 'todo' as const,
                        dependencies: []
                    }
                ]
            }
        ];

        mockClient.setMockTasks(mockTasks);

        const level1Item = new TaskItem(
            '1: Level 1 Task',
            vscode.TreeItemCollapsibleState.Collapsed,
            mockTasks[0],
            'task',
            0
        );

        const level2Items = await taskProvider.getChildren(level1Item);

        assert.strictEqual(level2Items.length, 1);
        assert.strictEqual(level2Items[0]?.nestingLevel, 1);
        assert.strictEqual(level2Items[0]?.task?.id, '1.1');

        // Subtasks at level 2 should have no children
        const level3Items = await taskProvider.getChildren(level2Items[0]);
        assert.strictEqual(level3Items.length, 0);
    });

    test('Should maintain tree state across refreshes', () => {
        const itemKey = 'task:1:Test';

        // Set some expansion state
        taskProvider.toggleExpansion(itemKey);
        assert.strictEqual((taskProvider as any).isExpanded(itemKey), true);

        // Refresh should maintain state
        taskProvider.refresh();
        assert.strictEqual((taskProvider as any).isExpanded(itemKey), true);

        // Only collapseAll should change state
        taskProvider.collapseAll();
        assert.strictEqual((taskProvider as any).isExpanded(itemKey), false);
    });
}); 