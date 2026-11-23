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
        <div className="app-bg" aria-hidden />
        <TopBar />
        <main id="main" className="relative z-10 mx-auto max-w-[1280px] px-6 pb-40 pt-[150px]">
          <Outlet />
        </main>
        <ContinueBar />
        <CommandPalette />
        <ScrollRestoration />
      </TooltipProvider>
    </MotionConfig>
  );
}

const root = createRootRoute({ component: Shell, notFoundComponent: NotFound });
const index = createRoute({ getParentRoute: () => root, path: '/', component: AtlasHome });
const atlas = createRoute({ getParentRoute: () => root, path: '/atlas', component: AtlasHome });
const world = createRoute({ getParentRoute: () => root, path: '/atlas/$worldId', component: WorldPage });
const stage = createRoute({ getParentRoute: () => root, path: '/atlas/$worldId/$stageId', component: StagePage });
const level = createRoute({
  getParentRoute: () => root,
  path: '/atlas/$worldId/$stageId/$levelId',
  component: LevelPage,
});
const gallery = createRoute({
  getParentRoute: () => root,
  path: '/gallery',
  component: lazyRouteComponent(() => import('./routes/Gallery'), 'Gallery'),
});

export const routeTree = root.addChildren([index, atlas, world, stage, level, gallery]);
export const router = createRouter({ routeTree, defaultPreload: 'intent', scrollRestoration: true });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
