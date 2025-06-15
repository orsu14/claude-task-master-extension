import * as assert from 'assert';
import { TagClass, TagUtils } from '../tagManager';
import { Tag, TagMetadata } from '../types';

suite('TagManager Tests', () => {
    suite('TagClass', () => {
        test('should create a tag with all properties', () => {
            const creationDate = new Date('2024-01-01');
            const metadata: TagMetadata = {
                totalTasks: 5,
                completedTasks: 2,
                pendingTasks: 3
            };

            const tag = new TagClass('test-id', 'Test Tag', {
                description: 'A test tag',
                isMaster: false,
                color: '#FF0000',
                metadata,
                creationDate
            });

            assert.strictEqual(tag.id, 'test-id');
            assert.strictEqual(tag.name, 'Test Tag');
            assert.strictEqual(tag.description, 'A test tag');
            assert.strictEqual(tag.isMaster, false);
            assert.strictEqual(tag.color, '#FF0000');
            assert.strictEqual(tag.creationDate, creationDate);
            assert.deepStrictEqual(tag.metadata, metadata);
            assert.strictEqual(tag.taskCount, 5);
        });

        test('should create a tag with default values', () => {
            const tag = new TagClass('test-id', 'Test Tag');

            assert.strictEqual(tag.id, 'test-id');
            assert.strictEqual(tag.name, 'Test Tag');
            assert.strictEqual(tag.description, undefined);
            assert.strictEqual(tag.isMaster, false);
            assert.ok(tag.color); // Should have a generated color
            assert.ok(tag.creationDate instanceof Date);
            assert.deepStrictEqual(tag.metadata, {});
            assert.strictEqual(tag.taskCount, 0);
        });

        test('should generate consistent default colors', () => {
            const tag1 = new TagClass('id1', 'Same Name');
            const tag2 = new TagClass('id2', 'Same Name');
            
            // Same name should generate same color
            assert.strictEqual(tag1.color, tag2.color);
        });

        test('should serialize to JSON format', () => {
            const creationDate = new Date('2024-01-01');
            const tag = new TagClass('test-id', 'Test Tag', {
                description: 'A test tag',
                isMaster: true,
                color: '#FF0000',
                creationDate
            });

            const json = tag.toJSON();

            assert.deepStrictEqual(json, {
                id: 'test-id',
                name: 'Test Tag',
                description: 'A test tag',
                creationDate: '2024-01-01T00:00:00.000Z',
                isMaster: true,
                color: '#FF0000',
                metadata: {}
            });
        });

        test('should deserialize from JSON', () => {
            const jsonData = {
                id: 'test-id',
                name: 'Test Tag',
                description: 'A test tag',
                creationDate: '2024-01-01T00:00:00.000Z',
                isMaster: true,
                color: '#FF0000',
                metadata: { totalTasks: 5 }
            };

            const tag = TagClass.fromJSON(jsonData);

            assert.strictEqual(tag.id, 'test-id');
            assert.strictEqual(tag.name, 'Test Tag');
            assert.strictEqual(tag.description, 'A test tag');
            assert.strictEqual(tag.isMaster, true);
            assert.strictEqual(tag.color, '#FF0000');
            assert.strictEqual(tag.creationDate.toISOString(), '2024-01-01T00:00:00.000Z');
            assert.deepStrictEqual(tag.metadata, { totalTasks: 5 });
        });

        test('should throw error for invalid JSON data', () => {
            assert.throws(() => TagClass.fromJSON(null), /Invalid tag data/);
            assert.throws(() => TagClass.fromJSON('string'), /Invalid tag data/);
            assert.throws(() => TagClass.fromJSON({}), /Invalid tag data/);
        });

        test('should validate required fields', () => {
            // Valid tag
            const validTag = new TagClass('valid-id', 'Valid Name');
            const validResult = validTag.validate();
            assert.strictEqual(validResult.isValid, true);
            assert.strictEqual(validResult.errors.length, 0);

            // Invalid ID
            const invalidIdTag = new TagClass('', 'Valid Name');
            const invalidIdResult = invalidIdTag.validate();
            assert.strictEqual(invalidIdResult.isValid, false);
            assert.ok(invalidIdResult.errors.some(e => e.includes('Tag ID is required')));

            // Invalid name
            const invalidNameTag = new TagClass('valid-id', '');
            const invalidNameResult = invalidNameTag.validate();
            assert.strictEqual(invalidNameResult.isValid, false);
            assert.ok(invalidNameResult.errors.some(e => e.includes('Tag name is required')));
        });

        test('should validate ID format', () => {
            const invalidCharsTag = new TagClass('invalid@id', 'Valid Name');
            const result = invalidCharsTag.validate();
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.some(e => e.includes('alphanumeric characters')));
        });

        test('should validate reserved names', () => {
            const reservedNameTag = new TagClass('test-id', 'master', { isMaster: false });
            const result = reservedNameTag.validate();
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.some(e => e.includes('reserved')));

            // Should be valid if it's actually a master tag
            const masterTag = new TagClass('test-id', 'master', { isMaster: true });
            const masterResult = masterTag.validate();
            assert.strictEqual(masterResult.isValid, true);
        });

        test('should validate field lengths', () => {
            const longName = 'a'.repeat(51);
            const longDescription = 'a'.repeat(501);
            
            const tag = new TagClass('test-id', longName, { description: longDescription });
            const result = tag.validate();
            
            assert.ok(result.warnings.some(w => w.includes('name is longer than 50')));
            assert.ok(result.warnings.some(w => w.includes('description is longer than 500')));
        });

        test('should validate color format', () => {
            const invalidColorTag = new TagClass('test-id', 'Test', { color: 'invalid-color' });
            const result = invalidColorTag.validate();
            assert.ok(result.warnings.some(w => w.includes('valid hex color')));

            const validColorTag = new TagClass('test-id', 'Test', { color: '#FF0000' });
            const validResult = validColorTag.validate();
            assert.ok(!validResult.warnings.some(w => w.includes('valid hex color')));
        });

        test('should clone with updates', () => {
            const original = new TagClass('original-id', 'Original Name', {
                description: 'Original description',
                color: '#FF0000'
            });

            const cloned = original.clone({
                name: 'Updated Name',
                description: 'Updated description'
            });

            assert.strictEqual(cloned.id, 'original-id'); // Unchanged
            assert.strictEqual(cloned.name, 'Updated Name'); // Updated
            assert.strictEqual(cloned.description, 'Updated description'); // Updated
            assert.strictEqual(cloned.color, '#FF0000'); // Unchanged
        });

        test('should update metadata', () => {
            const tag = new TagClass('test-id', 'Test Tag');
            
            tag.updateMetadata({ totalTasks: 10 });
            
            assert.strictEqual(tag.metadata?.totalTasks, 10);
            assert.ok(tag.metadata?.lastModified instanceof Date);
        });

        test('should update task count', () => {
            const tag = new TagClass('test-id', 'Test Tag');
            
            tag.updateTaskCount(15, 8, 7);
            
            assert.strictEqual(tag.metadata?.totalTasks, 15);
            assert.strictEqual(tag.metadata?.completedTasks, 8);
            assert.strictEqual(tag.metadata?.pendingTasks, 7);
            assert.strictEqual(tag.taskCount, 15);
        });

        test('should check equality', () => {
            const tag1 = new TagClass('same-id', 'Same Name');
            const tag2 = new TagClass('same-id', 'Same Name');
            const tag3 = new TagClass('different-id', 'Same Name');
            const tag4 = new TagClass('same-id', 'Different Name');

            assert.strictEqual(tag1.equals(tag2), true);
            assert.strictEqual(tag1.equals(tag3), false);
            assert.strictEqual(tag1.equals(tag4), false);
        });

        test('should generate string representation', () => {
            const emptyTag = new TagClass('test-id', 'Test Tag');
            assert.strictEqual(emptyTag.toString(), 'Test Tag');

            const tagWithTasks = new TagClass('test-id', 'Test Tag');
            tagWithTasks.updateTaskCount(5);
            assert.strictEqual(tagWithTasks.toString(), 'Test Tag (5 tasks)');

            const masterTag = new TagClass('master', 'Master', { isMaster: true });
            masterTag.updateTaskCount(10);
            assert.strictEqual(masterTag.toString(), 'Master (10 tasks) [Master]');
        });
    });

    suite('TagUtils', () => {
        test('should generate unique tag IDs', () => {
            const id1 = TagUtils.generateTagId('Test Tag Name');
            const id2 = TagUtils.generateTagId('Test Tag Name');
            
            assert.notStrictEqual(id1, id2); // Should be unique
            assert.ok(id1.startsWith('test-tag-name-'));
            assert.ok(id2.startsWith('test-tag-name-'));
            
            // Should have timestamp and random components
            const parts1 = id1.split('-');
            const parts2 = id2.split('-');
            assert.ok(parts1.length >= 5); // base-name + timestamp + random
            assert.ok(parts2.length >= 5);
        });

        test('should handle special characters in tag ID generation', () => {
            const id = TagUtils.generateTagId('Test@Tag#Name!');
            assert.ok(id.startsWith('testtagname-'));
            assert.ok(/^[a-z0-9-]+$/.test(id)); // Only lowercase, numbers, and hyphens
        });

        test('should create master tag', () => {
            const masterTag = TagUtils.createMasterTag();
            
            assert.strictEqual(masterTag.id, 'master');
            assert.strictEqual(masterTag.name, 'Master');
            assert.strictEqual(masterTag.isMaster, true);
            assert.strictEqual(masterTag.color, '#007ACC');
            assert.ok(masterTag.description);
        });

        test('should validate tag collection', () => {
            const validTags: Tag[] = [
                new TagClass('master', 'Master', { isMaster: true }),
                new TagClass('feature-1', 'Feature 1'),
                new TagClass('feature-2', 'Feature 2')
            ];

            const result = TagUtils.validateTagCollection(validTags);
            assert.strictEqual(result.isValid, true);
            assert.strictEqual(result.errors.length, 0);
        });

        test('should detect duplicate IDs in collection', () => {
            const duplicateIdTags: Tag[] = [
                new TagClass('duplicate', 'Tag 1'),
                new TagClass('duplicate', 'Tag 2')
            ];

            const result = TagUtils.validateTagCollection(duplicateIdTags);
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.some(e => e.includes('Duplicate tag ID')));
        });

        test('should detect duplicate names in collection', () => {
            const duplicateNameTags: Tag[] = [
                new TagClass('id1', 'Same Name'),
                new TagClass('id2', 'same name') // Case insensitive
            ];

            const result = TagUtils.validateTagCollection(duplicateNameTags);
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.some(e => e.includes('Duplicate tag name')));
        });

        test('should detect multiple master tags', () => {
            const multipleMasterTags: Tag[] = [
                new TagClass('master1', 'Master 1', { isMaster: true }),
                new TagClass('master2', 'Master 2', { isMaster: true })
            ];

            const result = TagUtils.validateTagCollection(multipleMasterTags);
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.some(e => e.includes('Multiple master tags')));
        });

        test('should warn about missing master tag', () => {
            const noMasterTags: Tag[] = [
                new TagClass('feature-1', 'Feature 1'),
                new TagClass('feature-2', 'Feature 2')
            ];

            const result = TagUtils.validateTagCollection(noMasterTags);
            assert.strictEqual(result.isValid, true); // Valid but with warning
            assert.ok(result.warnings.some(w => w.includes('No master tag found')));
        });

        test('should sort tags correctly', () => {
            const unsortedTags: Tag[] = [
                new TagClass('z-tag', 'Z Tag'),
                new TagClass('master', 'Master', { isMaster: true }),
                new TagClass('a-tag', 'A Tag'),
                new TagClass('m-tag', 'M Tag')
            ];

            const sorted = TagUtils.sortTags(unsortedTags);
            
            // Ensure we have the expected number of tags
            assert.strictEqual(sorted.length, 4);
            
            // Master should be first
            assert.strictEqual(sorted[0]!.isMaster, true);
            
            // Rest should be alphabetical
            assert.strictEqual(sorted[1]!.name, 'A Tag');
            assert.strictEqual(sorted[2]!.name, 'M Tag');
            assert.strictEqual(sorted[3]!.name, 'Z Tag');
        });
    });
}); 