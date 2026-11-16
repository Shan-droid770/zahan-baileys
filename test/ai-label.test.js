import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AI_LABEL_NODE_ATTRS, AI_LABEL_NODE_TAG, aiLabelDecision, applyAiLabelSupportPayload, assertAiLabelSupported, hasAiLabelNode, isAiLabelRequested, makeAiLabelNode, shouldApplyAiLabel, supportsAiLabel, withAiLabel } from '../src/Utils/messages.js';
import { BIZ_BOT_SUPPORT_PAYLOAD } from '../src/Defaults/index.js';
import { prepareModernMessageContent } from '../src/Utils/modern-messages.js';

const pn = '94770000000@s.whatsapp.net';
const lid = '123456789012345@lid';

test('the AI label request is read from content or send options', () => {
    assert.equal(isAiLabelRequested({ aiLabel: true }), true);
    assert.equal(isAiLabelRequested({ ai: true }), true);
    assert.equal(isAiLabelRequested({ aiLabel: false }), false);
    assert.equal(isAiLabelRequested({ ai: false, aiLabel: true }), true);
    assert.equal(isAiLabelRequested({ ai: true, aiLabel: false }), false);
    assert.equal(isAiLabelRequested({ text: 'hello' }), false);
    assert.equal(isAiLabelRequested(undefined), false);
    assert.equal(isAiLabelRequested('ai'), false);
});

test('the AI label is limited to private chats', () => {
    assert.equal(supportsAiLabel(pn), true);
    assert.equal(supportsAiLabel(lid), true);
    assert.equal(supportsAiLabel('123456789-987654@g.us'), false);
    assert.equal(supportsAiLabel('status@broadcast'), false);
    assert.equal(supportsAiLabel('120363000000000000@newsletter'), false);
});

test('the stanza node is the bot/biz_bot marker the clients render as an AI label', () => {
    assert.equal(AI_LABEL_NODE_TAG, 'bot');
    assert.equal(AI_LABEL_NODE_ATTRS.biz_bot, '1');
    assert.ok(Object.isFrozen(AI_LABEL_NODE_ATTRS));
    assert.deepEqual(makeAiLabelNode(), { tag: 'bot', attrs: { biz_bot: '1' }, content: undefined });
    assert.notEqual(makeAiLabelNode().attrs, makeAiLabelNode().attrs);
});

test('the support payload is attached only when a context info already exists', () => {
    const message = { messageContextInfo: { deviceListMetadata: {} } };
    assert.equal(applyAiLabelSupportPayload(message), message);
    assert.equal(message.messageContextInfo.supportPayload, BIZ_BOT_SUPPORT_PAYLOAD);
    assert.match(BIZ_BOT_SUPPORT_PAYLOAD, /"is_ai_message":true/);

    const bare = { extendedTextMessage: { text: 'hi' } };
    assert.equal(applyAiLabelSupportPayload(bare), bare);
    assert.deepEqual(bare, { extendedTextMessage: { text: 'hi' } });
});

test('withAiLabel appends a node without mutating the caller array', () => {
    const existing = [{ tag: 'meta', attrs: {} }];
    const message = { messageContextInfo: {} };
    const nodes = withAiLabel(pn, message, existing);
    assert.equal(existing.length, 1);
    assert.equal(nodes.length, 2);
    assert.equal(nodes[0], existing[0]);
    assert.deepEqual(nodes[1], makeAiLabelNode());
    assert.ok(message.messageContextInfo.supportPayload);

    assert.deepEqual(withAiLabel('123456789-987654@g.us', {}, []), [], 'groups skip the label instead of throwing');
    assert.deepEqual(withAiLabel('status@broadcast', {}, []), []);
    assert.deepEqual(withAiLabel('120363000000000000@newsletter', {}, []), []);
    assert.throws(() => assertAiLabelSupported('123456789-987654@g.us'), (error) => {
        assert.equal(error.output?.statusCode, 400);
        assert.match(error.message, /private chats/);
        return true;
    });
    assert.equal(assertAiLabelSupported(pn), true);
});

test('the modern content preparation keeps the AI label flag', () => {
    const prepared = prepareModernMessageContent({ text: 'hello', aiLabel: true });
    assert.equal(prepared.aiLabel, true);
    assert.equal(prepared.text, 'hello');
    const legacy = prepareModernMessageContent({ text: 'hello', ai: true });
    assert.equal(legacy.ai, true);
});

test('the AI label is on by default for private chats and can be opted out', () => {
    assert.equal(aiLabelDecision({}), undefined);
    assert.equal(aiLabelDecision({ aiLabel: false }), false);
    assert.equal(aiLabelDecision({ ai: true }), true);
    assert.equal(aiLabelDecision(undefined), undefined);

    assert.equal(shouldApplyAiLabel(pn, {}), true, 'default config labels private chats');
    assert.equal(shouldApplyAiLabel(lid, {}), true);
    assert.equal(shouldApplyAiLabel(pn, { aiLabel: false }), false, 'the socket can disable it');
    assert.equal(shouldApplyAiLabel(pn, {}, { aiLabel: false }), false, 'a message can opt out');
    assert.equal(shouldApplyAiLabel(pn, { aiLabel: false }, { aiLabel: true }), true, 'an explicit message wins');
    assert.equal(shouldApplyAiLabel('123456789-987654@g.us', {}), false, 'groups never get it by default');
    assert.equal(shouldApplyAiLabel('123456789-987654@g.us', {}, { aiLabel: true }), true, 'an explicit request still throws later');
    assert.equal(shouldApplyAiLabel('status@broadcast', {}), false);
    assert.equal(shouldApplyAiLabel('120363000000000000@newsletter', {}), false);
});

test('the label node is never duplicated', () => {
    const message = { messageContextInfo: {} };
    const once = withAiLabel(pn, message, [{ tag: 'bot', attrs: { biz_bot: '1' } }]);
    assert.equal(once.length, 1);
    assert.equal(hasAiLabelNode(once), true);
    const twice = withAiLabel(pn, message, once);
    assert.equal(twice.length, 1);
    assert.equal(hasAiLabelNode([{ tag: 'bot', attrs: { biz_bot: '0' } }]), false);
});
