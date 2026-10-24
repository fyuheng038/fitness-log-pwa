import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialData } from '../src/initialData.ts';

test('public installs contain no personal history and independent templates', () => {
  const first = createInitialData();
  assert.deepEqual(first.trainings, []);
  assert.deepEqual(first.library, []);
  first.templates[0].exercises.push('test');
  assert.ok(!createInitialData().templates[0].exercises.includes('test'));
});
