import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  ScrollRestoration,
} from '@tanstack/react-router';
import { MotionConfig } from 'motion/react';
import { TopBar } from '@/ui/hud/TopBar';
import { ContinueBar } from '@/ui/hud/ContinueBar';
import { CommandPalette } from '@/ui/hud/CommandPalette';
import { TooltipProvider } from '@/ui/components';
import { AtlasHome } from './routes/AtlasHome';
import { WorldPage } from './routes/WorldPage';
import { StagePage } from './routes/StagePage';
import { LevelPage } from './routes/LevelPage';
import { NotFound } from './routes/NotFound';

function Shell() {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <TopBar />
        <Outlet />
        <CommandPalette />
      </TooltipProvider>
    </MotionConfig>
  );
}

function AtlasLayout() {
  return (
    <>
      <div className="app-bg" aria-hidden />
      <main id="main" className="relative z-10 mx-auto max-w-[1280px] px-6 pb-40 pt-[150px]">
        <Outlet />
      </main>
      <ContinueBar />
      <ScrollRestoration />
    </>
  );
}

const root = createRootRoute({ component: Shell, notFoundComponent: NotFound });

// 3D world (lazy: three.js only loads here)
const world = createRoute({
  getParentRoute: () => root,
  id: '_world',
  component: lazyRouteComponent(() => import('@/world/WorldLayout'), 'WorldLayout'),
});
const worldMap = createRoute({
  getParentRoute: () => world,
  path: '/',
  component: lazyRouteComponent(() => import('@/world/views'), 'WorldMapView'),
});
const island = createRoute({
  getParentRoute: () => world,
  path: 'world/$worldId',
  component: lazyRouteComponent(() => import('@/world/views'), 'IslandView'),
});
const stage = createRoute({
  getParentRoute: () => world,
  path: 'world/$worldId/$stageId',
  validateSearch: (s: Record<string, unknown>): { level?: string } =>
    typeof s.level === 'string' ? { level: s.level } : {},
  component: lazyRouteComponent(() => import('@/world/views'), 'StageView'),
});

// 2D Atlas
const atlas = createRoute({ getParentRoute: () => root, id: '_atlas', component: AtlasLayout });
const atlasHome = createRoute({
  getParentRoute: () => atlas,
  path: 'atlas',
  validateSearch: (s: Record<string, unknown>): { notice?: 'webgl' } =>
    s.notice === 'webgl' ? { notice: 'webgl' } : {},
  component: AtlasHome,
});
const atlasWorld = createRoute({ getParentRoute: () => atlas, path: 'atlas/$worldId', component: WorldPage });
const atlasStage = createRoute({ getParentRoute: () => atlas, path: 'atlas/$worldId/$stageId', component: StagePage });
const atlasLevel = createRoute({
  getParentRoute: () => atlas,
  path: 'atlas/$worldId/$stageId/$levelId',
  component: LevelPage,
});
const gallery = createRoute({
  getParentRoute: () => atlas,
  path: 'gallery',
  component: lazyRouteComponent(() => import('./routes/Gallery'), 'Gallery'),
});

// Lesson chamber: study → level test → Level Clear (lazy: MDX, KaTeX CSS and simulations load here only)
const play = createRoute({ getParentRoute: () => root, id: '_play', component: () => <Outlet /> });
const playLevel = createRoute({
  getParentRoute: () => play,
  path: 'play/$levelId',
  component: lazyRouteComponent(() => import('@/play/LessonChamber'), 'LessonChamber'),
});

export const routeTree = root.addChildren([
  world.addChildren([worldMap, island, stage]),
  play.addChildren([playLevel]),
  atlas.addChildren([atlasHome, atlasWorld, atlasStage, atlasLevel, gallery]),
]);
export const router = createRouter({ routeTree, defaultPreload: 'intent', scrollRestoration: true });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
