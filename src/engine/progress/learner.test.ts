import { beforeEach, describe, expect, it } from 'vitest';
import { useLearner } from './learner';
import { memoryStore } from './storage';
import { usePrefs } from './settings';

const L = 'what-is-computer';

describe('learner store (event log → derived state)', () => {
  beforeEach(async () => {
    await useLearner.getState().init(memoryStore());
    await useLearner.getState().reset();
  });
  it('records events, derives XP/stars and queues rewards', () => {
    const s = useLearner.getState();
    expect(s.record({ t: 'step', level: L, step: 'hook' })).toBe(5);
    expect(s.record({ t: 'test', level: L, correct: 10, total: 10, ms: 1000, proveIt: false })).toBe(175 + 60); // test + "Clear a new level" daily goal
    const st = useLearner.getState();
    expect(st.stars.get(L)).toBe(2);
    expect(st.events).toHaveLength(2);
    expect(st.rewards.length).toBe(2);
    st.consumeReward(st.rewards[0]!.id);
    expect(useLearner.getState().rewards).toHaveLength(1);
  });
  it('export → reset → import restores the exact state', async () => {
    const s = useLearner.getState();
    s.record({ t: 'step', level: L, step: 'hook' });
    s.record({ t: 'test', level: L, correct: 8, total: 10, ms: 1000, proveIt: false });
    const save = JSON.parse(JSON.stringify(useLearner.getState().exportSave()));
    const xp = useLearner.getState().xp;
    await useLearner.getState().reset();
    expect(useLearner.getState().xp).toBe(0);
    expect(await useLearner.getState().importSave(save)).toEqual({ ok: true, count: 2 });
    expect(useLearner.getState().xp).toBe(xp);
    expect(useLearner.getState().stars.get(L)).toBe(1);
  });
  it('rejects foreign files', async () => {
    expect(await useLearner.getState().importSave({ hello: 1 })).toMatchObject({ ok: false });
  });
  it('persists through the store and replays on init', async () => {
    const store = memoryStore();
    await useLearner.getState().init(store);
    useLearner.getState().record({ t: 'sim', level: L, sim: 'tiny-machine' });
    await Promise.resolve();
    await useLearner.getState().init(store);
    expect(useLearner.getState().xp).toBe(20);
  });
  it('replays when daily goals are switched', async () => {
    usePrefs.getState().set({ dailyGoals: true });
    useLearner.getState().record({ t: 'test', level: L, correct: 7, total: 10, ms: 1000, proveIt: true });
    const withGoals = useLearner.getState().xp;
    usePrefs.getState().set({ dailyGoals: false });
    expect(useLearner.getState().xp).toBe(withGoals - 60);
    usePrefs.getState().set({ dailyGoals: true });
  });
});
