import { useEffect } from 'react';
import { Command } from 'cmdk';
import { Search } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { curriculum, levelsOfStage, stageById, stageCode, worldById } from '@/engine/content';
import { useUi } from '@/app/uiStore';
import { useProgress } from '@/app/useProgress';
import { Kbd, LevelMedallion, Modal } from '../components';

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useUi();
  const navigate = useNavigate();
  const { medal } = useProgress();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(!useUi.getState().paletteOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaletteOpen]);

  const go = (fn: () => void) => {
    setPaletteOpen(false);
    fn();
  };

  return (
    <Modal
      open={paletteOpen}
      onOpenChange={setPaletteOpen}
      title="Search the Atlas"
      hideTitle
      className="top-[10vh] p-3"
    >
      <Command label="Search the Atlas" loop>
        <div className="flex items-center gap-3 border-b border-line px-3 pb-3 pt-1">
          <Search size={20} className="text-muted" aria-hidden />
          <Command.Input placeholder="Search worlds, stages and levels…" />
          <Kbd>Esc</Kbd>
        </div>
        <Command.List className="max-h-[56vh] overflow-y-auto p-1">
          <Command.Empty>No match. Try another word.</Command.Empty>
          <Command.Group heading="Worlds">
            {curriculum.worlds.map((w) => (
              <Command.Item
                key={w.id}
                value={`world ${w.title} ${w.biome}`}
                onSelect={() => go(() => navigate({ to: '/atlas/$worldId', params: { worldId: w.id } }))}
              >
                <span
                  className="swatch size-8 flex-none"
                  style={{ background: `linear-gradient(160deg, #fff, ${w.color})` }}
                  aria-hidden
                />
                <span className="font-semibold">{w.biome}</span>
                <span className="text-sm text-muted">
                  World {w.order} · {w.title}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Stages">
            {curriculum.stages.map((s) => (
              <Command.Item
                key={s.id}
                value={`stage ${s.title} ${worldById.get(s.worldId)!.title}`}
                onSelect={() =>
                  go(() => navigate({ to: '/atlas/$worldId/$stageId', params: { worldId: s.worldId, stageId: s.id } }))
                }
              >
                <span className="tile tile-sky size-8 flex-none text-xs font-extrabold">{stageCode(s)}</span>
                <span className="font-semibold">{s.title}</span>
                <span className="text-sm text-muted">{levelsOfStage(s.id).length} levels</span>
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Levels">
            {curriculum.levels.map((l) => {
              const s = stageById.get(l.stageId)!;
              return (
                <Command.Item
                  key={l.id}
                  value={`level ${l.title} ${l.id} ${s.title}`}
                  onSelect={() =>
                    go(() =>
                      navigate({
                        to: '/atlas/$worldId/$stageId/$levelId',
                        params: { worldId: l.worldId, stageId: l.stageId, levelId: l.id },
                      }),
                    )
                  }
                >
                  <LevelMedallion state={medal(l)} number={l.number} size={32} />
                  <span className="font-semibold">{l.title}</span>
                  <span className="ml-auto text-sm text-muted">{s.title}</span>
                </Command.Item>
              );
            })}
          </Command.Group>
        </Command.List>
      </Command>
    </Modal>
  );
}
