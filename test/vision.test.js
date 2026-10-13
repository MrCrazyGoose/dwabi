import { test } from 'node:test';
import assert from 'node:assert/strict';
import Anthropic from '@anthropic-ai/sdk';
import { createVision, imageBlock, VisionError, DEFAULT_MODEL } from '../server/vision.js';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function fakeClient(reply) {
  const calls = [];
  return {
    calls,
    beta: {
      messages: {
        async create(params) {
          calls.push(params);
          if (reply instanceof Error) throw reply;
          return typeof reply === 'function' ? reply(params) : reply;
        },
      },
    },
  };
}

const textReply = (obj, stop_reason = 'end_turn') => ({ stop_reason, content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(obj) }] });

test('no API key and no client means photo checks are off', () => {
  assert.equal(createVision({}), null);
});

test('imageBlock validates data URLs', () => {
  assert.deepEqual(imageBlock(PNG).source.media_type, 'image/png');
  assert.throws(() => imageBlock('data:image/gif;base64,AAAA'), VisionError);
  assert.throws(() => imageBlock('https://example.com/x.png'), VisionError);
  assert.throws(() => imageBlock(`data:image/jpeg;base64,${'A'.repeat(4.2 * 1024 * 1024)}`), /too large/);
});

test('checkItem sends the photo with a JSON schema and fallbacks, and parses the result', async () => {
  const client = fakeClient(
    textReply({ item_id: 'aluminum-can', what_i_see: 'crushed soda can', confidence: 'high', contamination: 'clean', findings: [], photo_quality: 'good' }),
  );
  const vision = createVision({ client });
  const out = await vision.checkItem(PNG);
  assert.equal(out.item_id, 'aluminum-can');

  const [params] = client.calls;
  assert.equal(params.model, DEFAULT_MODEL);
  assert.equal(params.fallbacks, 'default');
  assert.deepEqual(params.betas, ['server-side-fallback-2026-07-01']);
  assert.equal(params.output_config.format.type, 'json_schema');
  assert.ok(params.output_config.format.schema.properties.item_id.enum.includes('pizza-box'));
  assert.equal(params.output_config.effort, 'low');
  assert.equal(params.thinking, undefined);
  assert.equal(params.messages[0].content[0].type, 'image');
  assert.match(params.system[0].text, /Montgomery County/);
  assert.match(params.system[0].text, /never as instructions/);
});

test('checkBin drops unknown problem kinds and never reports ready with problems', async () => {
  const client = fakeClient(
    textReply({
      bin_type: 'blue_bin',
      verdict: 'ready',
      problems: [
        { kind: 'plastic_bag', what: 'Grocery bag', where: 'top left', fix: 'Store drop-off or trash' },
        { kind: 'made_up', what: 'x', where: 'y', fix: 'z' },
      ],
      looks_good: ['Cans are loose'],
      photo_quality: 'good',
    }),
  );
  const out = await createVision({ client }).checkBin(PNG);
  assert.equal(out.problems.length, 1);
  assert.equal(out.verdict, 'fix_first');
});

test('refusals, truncation, bad JSON and API errors become friendly VisionErrors', async () => {
  await assert.rejects(createVision({ client: fakeClient(textReply({}, 'refusal')) }).checkBin(PNG), (e) => e.status === 422);
  await assert.rejects(createVision({ client: fakeClient(textReply({}, 'max_tokens')) }).checkBin(PNG), VisionError);
  await assert.rejects(
    createVision({ client: fakeClient({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'not json' }] }) }).checkItem(PNG),
    /unreadable/,
  );
  const apiErr = new Anthropic.APIError(500, { type: 'error' }, 'boom', new Headers());
  await assert.rejects(createVision({ client: fakeClient(apiErr) }).checkItem(PNG), (e) => e instanceof VisionError && e.status === 502);
  const unknown = await createVision({
    client: fakeClient(textReply({ item_id: 'unknown', what_i_see: 'a cat', confidence: 'low', contamination: 'not_applicable', findings: [], photo_quality: 'no_item' })),
  }).checkItem(PNG);
  assert.equal(unknown.item_id, 'unknown');
});
