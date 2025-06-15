import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as sinon from 'sinon';
import { MCPClient } from '../mcpClient';
import { TagManager } from '../tagManager';
import { TaskMasterClient } from '../taskMasterClient';

suite('MCP Integration with Tag Support', () => {
    let tempDir: string;
    let mcpClient: MCPClient;
    let tagManager: TagManager;
    let taskMasterClient: TaskMasterClient;

    setup(() => {
        // Create a temporary directory for testing
        tempDir = path.join(__dirname, '..', '..', 'test-temp', 'mcp-integration');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Create test .taskmaster structure
        const taskmasterDir = path.join(tempDir, '.taskmaster');
        const tasksDir = path.join(taskmasterDir, 'tasks');
        
        if (!fs.existsSync(tasksDir)) {
            fs.mkdirSync(tasksDir, { recursive: true });
        }

        // Create test tasks.json with tagged format
        const testTasksData = {
            "master": {
                "tasks": [
                    {
                        "id": 1,
                        "title": "Test Task 1",
                        "description": "A test task",
                        "status": "pending",
                        "priority": "medium",
                        "dependencies": [],
                        "subtasks": []
                    },
                    {
                        "id": 2,
                        "title": "Test Task 2",
                        "description": "Another test task",
                        "status": "done",
                        "priority": "high",
                        "dependencies": [1],
                        "subtasks": []
                    }
                ],
                "metadata": {
                    "created": "2025-01-15T01:47:32.567Z",
                    "updated": "2025-01-15T02:24:21.338Z",
                    "description": "Tasks for master context"
                }
            }
        };

        fs.writeFileSync(
            path.join(tasksDir, 'tasks.json'),
            JSON.stringify(testTasksData, null, 2)
        );

        // Create test state.json
        const testStateData = {
            "currentTag": "master",
            "migrationCompleted": true,
            "lastMigrationDate": "2025-01-15T01:47:32.567Z"
        };

        fs.writeFileSync(
            path.join(taskmasterDir, 'state.json'),
            JSON.stringify(testStateData, null, 2)
        );

        // Initialize components
        mcpClient = new MCPClient(taskmasterDir);
        tagManager = new TagManager(taskmasterDir);
        taskMasterClient = new TaskMasterClient(taskmasterDir);
    });

    teardown(() => {
        // Clean up temporary files
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    test('MCPClient should be initialized correctly', () => {
        assert.ok(mcpClient);
        assert.strictEqual(typeof mcpClient.isAvailable, 'function');
        assert.strictEqual(typeof mcpClient.getTasks, 'function');
        assert.strictEqual(typeof mcpClient.setTaskStatus, 'function');
    });

    test('TagManager should detect tagged format', () => {
        assert.strictEqual(tagManager.isTaggedFormat(), true);
        assert.strictEqual(tagManager.getCurrentTag(), 'master');
        
        const availableTags = tagManager.getAvailableTags();
        assert.ok(availableTags.includes('master'));
    });

    test('TagManager should provide tag information', () => {
        const tagInfo = tagManager.getTagInfo('master');
        assert.ok(tagInfo);
        assert.strictEqual(tagInfo.name, 'master');
        assert.strictEqual(tagInfo.isMaster, true);
        assert.strictEqual(tagInfo.taskCount, 2);
        
        // Verify tag properties
        assert.ok(tagInfo.creationDate);
        assert.ok(tagInfo.description);
        assert.strictEqual(tagInfo.description, 'Tasks for master context');
        
        // Verify tag color is assigned
        assert.ok(tagInfo.color);
        assert.ok(tagInfo.color.startsWith('#'));
    });

    test('TaskMasterClient should integrate with TagManager', () => {
        assert.strictEqual(taskMasterClient.getCurrentTag(), 'master');
        assert.strictEqual(taskMasterClient.isTaggedFormat(), true);
        
        const tagContext = taskMasterClient.getTagContext();
        assert.strictEqual(tagContext.currentTag, 'master');
        assert.strictEqual(tagContext.isTaggedFormat, true);
        assert.ok(tagContext.availableTags.includes('master'));
    });

    test('TaskMasterClient should read tasks from tagged format', async () => {
        // Mock MCP client to avoid timeout and use file system instead
        const sandbox = sinon.createSandbox();
        sandbox.stub(taskMasterClient, 'isMCPServerAvailable').resolves(false);
        
        try {
            const tasks = await taskMasterClient.getTasks();
            assert.strictEqual(tasks.length, 2);
            assert.strictEqual(tasks[0]?.title, 'Test Task 1');
            assert.strictEqual(tasks[1]?.title, 'Test Task 2');
            
            // Verify tagged format properties
            assert.strictEqual(taskMasterClient.isTaggedFormat(), true);
            assert.strictEqual(taskMasterClient.getCurrentTag(), 'master');
            
            // Verify task structure is preserved
            assert.strictEqual(tasks[0]?.id, '1');
            assert.strictEqual(tasks[0]?.status, 'todo'); // normalized from 'pending'
            assert.strictEqual(tasks[1]?.id, '2');
            assert.strictEqual(tasks[1]?.status, 'completed'); // normalized from 'done'
        } finally {
            sandbox.restore();
        }
    });

    test('TagManager should validate tag names correctly', () => {
        // Valid tag names
        const validTags = ['master', 'feature-1', 'test_tag', 'v1-0-0'];
        validTags.forEach(tag => {
            assert.doesNotThrow(() => {
                tagManager.setCurrentTag(tag);
            });
        });

        // Invalid tag names should throw
        const invalidTags = ['', 'tag with spaces', 'tag@special', 'tag.with.dots'];
        invalidTags.forEach(tag => {
            assert.throws(() => {
                tagManager.setCurrentTag(tag);
            });
        });
    });

    test('TagManager should provide default colors for tags', () => {
        const tagInfo = tagManager.getTagInfo('master');
        assert.ok(tagInfo);
        assert.ok(tagInfo.color);
        assert.ok(tagInfo.color.startsWith('#'));
        assert.strictEqual(tagInfo.color.length, 7); // #RRGGBB format
    });

    test('TaskMasterClient should handle tag switching', async () => {
        // Mock MCP client to avoid timeout
        const sandbox = sinon.createSandbox();
        sandbox.stub(taskMasterClient, 'isMCPServerAvailable').resolves(false);
        
        try {
            // Initially on master
            assert.strictEqual(taskMasterClient.getCurrentTag(), 'master');

            // Switch to a different tag (this will fail since the tag doesn't exist, but we test the logic)
            try {
                await taskMasterClient.switchTag('feature-1');
            } catch (error) {
                // Expected to fail since tag doesn't exist
                assert.ok(error);
                assert.ok(error instanceof Error);
            }
        } finally {
            sandbox.restore();
        }
    });

    test('MCP client methods should have correct signatures', () => {
        // Test that all expected methods exist with correct signatures
        assert.strictEqual(typeof mcpClient.getTasks, 'function');
        assert.strictEqual(typeof mcpClient.getTask, 'function');
        assert.strictEqual(typeof mcpClient.getNextTask, 'function');
        assert.strictEqual(typeof mcpClient.setTaskStatus, 'function');
        assert.strictEqual(typeof mcpClient.addTask, 'function');
        assert.strictEqual(typeof mcpClient.addSubtask, 'function');
        assert.strictEqual(typeof mcpClient.expandTask, 'function');
        assert.strictEqual(typeof mcpClient.updateTask, 'function');
        assert.strictEqual(typeof mcpClient.updateSubtask, 'function');
        assert.strictEqual(typeof mcpClient.getTags, 'function');
        assert.strictEqual(typeof mcpClient.switchTag, 'function');
        assert.strictEqual(typeof mcpClient.getTagInfo, 'function');
    });

    test('Tag context should be consistent across components', () => {
        const tagManagerContext = tagManager.getTagContext();
        const clientContext = taskMasterClient.getTagContext();

        assert.strictEqual(tagManagerContext.currentTag, clientContext.currentTag);
        assert.strictEqual(tagManagerContext.isTaggedFormat, clientContext.isTaggedFormat);
        assert.deepStrictEqual(tagManagerContext.availableTags, clientContext.availableTags);
        
        // Verify both contexts indicate tagged format
        assert.strictEqual(tagManagerContext.isTaggedFormat, true);
        assert.strictEqual(clientContext.isTaggedFormat, true);
        
        // Verify current tag is 'master'
        assert.strictEqual(tagManagerContext.currentTag, 'master');
        assert.strictEqual(clientContext.currentTag, 'master');
        
        // Verify available tags include master
        assert.ok(tagManagerContext.availableTags.includes('master'));
        assert.ok(clientContext.availableTags.includes('master'));
    });
}); 