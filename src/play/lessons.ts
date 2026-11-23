import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import lessonsJson from '@/generated/lessons.json';
import type { LessonMeta } from '@/engine/lesson/schema';

/** Validated lesson metadata from the content build, keyed by level id. */
export const lessons = lessonsJson as unknown as Record<string, LessonMeta>;
export const hasLesson = (levelId: string) => Object.hasOwn(lessons, levelId);

type MdxModule = { default: ComponentType<{ components?: Record<string, unknown> }> };
const loaders = import.meta.glob<MdxModule>('/content/worlds/*/*/levels/*/lesson.mdx');

/** Lazy-loads a lesson's compiled MDX (each lesson is its own chunk). */
export function loadLesson(meta: LessonMeta): Promise<MdxModule> {
  const load = loaders[meta.path];
  if (!load) return Promise.reject(new Error(`Lesson file not bundled: ${meta.path}`));
  return load();
}

type LessonComponent = LazyExoticComponent<MdxModule['default']>;
const components = new Map<string, LessonComponent>();

/** One stable lazy component per lesson, so re-renders never remount the lesson. */
export function lessonComponent(meta: LessonMeta): LessonComponent {
  let c = components.get(meta.levelId);
  if (!c) components.set(meta.levelId, (c = lazy(() => loadLesson(meta))));
  return c;
}
