import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { TagStatusBarItem } from '../statusBar';
import { TaskMasterClient } from '../taskMasterClient';

suite('TagStatusBarItem Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockContext: vscode.ExtensionContext;
    let mockTaskMasterClient: sinon.SinonStubbedInstance<TaskMasterClient>;
    let statusBarItem: TagStatusBarItem;

    setup(() => {
        sandbox = sinon.createSandbox();
        
        // Mock extension context
        mockContext = {
            subscriptions: [],
            workspaceState: {} as any,
            globalState: {} as any,
            extensionUri: {} as any,
            extensionPath: '',
            asAbsolutePath: sandbox.stub(),
            storageUri: {} as any,
            storagePath: '',
            globalStorageUri: {} as any,
            globalStoragePath: '',
            logUri: {} as any,
            logPath: '',
            extensionMode: vscode.ExtensionMode.Test,
            secrets: {} as any,
            environmentVariableCollection: {} as any,
            extension: {} as any,
            languageModelAccessInformation: {} as any
        };

        // Mock TaskMasterClient
        mockTaskMasterClient = sandbox.createStubInstance(TaskMasterClient);
        
        // Mock vscode.window.createStatusBarItem
        const mockStatusBarItem = {
            text: '',
            tooltip: '',
            command: '',
            show: sandbox.stub(),
            hide: sandbox.stub(),
            dispose: sandbox.stub()
        };
        sandbox.stub(vscode.window, 'createStatusBarItem').returns(mockStatusBarItem as any);
    });

    teardown(() => {
        if (statusBarItem) {
            statusBarItem.dispose();
        }
        sandbox.restore();
    });

    test('Should initialize status bar item correctly', () => {
        // Setup mock tag context
        mockTaskMasterClient.getTagContext.returns({
            currentTag: 'master',
            availableTags: ['master'],
            isTaggedFormat: false
        });

        statusBarItem = new TagStatusBarItem(mockContext, mockTaskMasterClient as any);

        // Verify status bar item was created
        assert.ok((vscode.window.createStatusBarItem as sinon.SinonStub).calledOnce);
        assert.ok(mockContext.subscriptions.length > 0);
    });

    test('Should show status bar for tagged format projects', async () => {
        // Setup mock tag context for tagged format
        mockTaskMasterClient.getTagContext.returns({
            currentTag: 'feature-branch',
            availableTags: ['master', 'feature-branch', 'sprint-2'],
            isTaggedFormat: true
        });

        statusBarItem = new TagStatusBarItem(mockContext, mockTaskMasterClient as any);
        await statusBarItem.update();

        // Verify status bar shows the current tag
        const createCall = (vscode.window.createStatusBarItem as sinon.SinonStub).getCall(0);
        const mockStatusBar = createCall.returnValue;
        
        assert.strictEqual(mockStatusBar.text, '$(tag) feature-branch');
        assert.ok(mockStatusBar.tooltip.includes('Current Tag: feature-branch'));
        assert.ok(mockStatusBar.tooltip.includes('Available Tags (3)'));
        assert.ok(mockStatusBar.show.called);
    });

    test('Should hide status bar for non-tagged format projects', async () => {
        // Setup mock tag context for non-tagged format
        mockTaskMasterClient.getTagContext.returns({
            currentTag: 'master',
            availableTags: ['master'],
            isTaggedFormat: false
        });

        statusBarItem = new TagStatusBarItem(mockContext, mockTaskMasterClient as any);
        await statusBarItem.update();

        // Verify status bar is hidden
        const createCall = (vscode.window.createStatusBarItem as sinon.SinonStub).getCall(0);
        const mockStatusBar = createCall.returnValue;
        
        assert.ok(mockStatusBar.hide.called);
    });

    test('Should handle single tag projects correctly', async () => {
        // Setup mock tag context with single tag
        mockTaskMasterClient.getTagContext.returns({
            currentTag: 'master',
            availableTags: ['master'],
            isTaggedFormat: true
        });

        statusBarItem = new TagStatusBarItem(mockContext, mockTaskMasterClient as any);
        await statusBarItem.update();

        // Verify status bar shows appropriate tooltip for single tag
        const createCall = (vscode.window.createStatusBarItem as sinon.SinonStub).getCall(0);
        const mockStatusBar = createCall.returnValue;
        
        assert.strictEqual(mockStatusBar.text, '$(tag) master');
        assert.ok(mockStatusBar.tooltip.includes('Current Tag: master'));
        assert.ok(mockStatusBar.tooltip.includes('Click to manage tags'));
        assert.ok(!mockStatusBar.tooltip.includes('Available Tags'));
    });

    test('Should handle errors gracefully', async () => {
        // Setup mock to throw error
        mockTaskMasterClient.getTagContext.throws(new Error('Test error'));

        statusBarItem = new TagStatusBarItem(mockContext, mockTaskMasterClient as any);
        await statusBarItem.update();

        // Verify error state is shown
        const createCall = (vscode.window.createStatusBarItem as sinon.SinonStub).getCall(0);
        const mockStatusBar = createCall.returnValue;
        
        assert.strictEqual(mockStatusBar.text, '$(tag) Error');
        assert.ok(mockStatusBar.tooltip.includes('Error loading tag information'));
        assert.ok(mockStatusBar.show.called);
    });

    test('Should set correct command for tag switching', () => {
        mockTaskMasterClient.getTagContext.returns({
            currentTag: 'master',
            availableTags: ['master'],
            isTaggedFormat: false
        });

        statusBarItem = new TagStatusBarItem(mockContext, mockTaskMasterClient as any);

        // Verify command is set correctly
        const createCall = (vscode.window.createStatusBarItem as sinon.SinonStub).getCall(0);
        const mockStatusBar = createCall.returnValue;
        
        assert.strictEqual(mockStatusBar.command, 'claudeTaskMaster.switchTag');
    });

    test('Should dispose properly', () => {
        mockTaskMasterClient.getTagContext.returns({
            currentTag: 'master',
            availableTags: ['master'],
            isTaggedFormat: false
        });

        statusBarItem = new TagStatusBarItem(mockContext, mockTaskMasterClient as any);
        statusBarItem.dispose();

        // Verify dispose was called on the status bar item
        const createCall = (vscode.window.createStatusBarItem as sinon.SinonStub).getCall(0);
        const mockStatusBar = createCall.returnValue;
        
        assert.ok(mockStatusBar.dispose.called);
    });
}); 