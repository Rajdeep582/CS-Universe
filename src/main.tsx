import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { router } from '@/app/router';
import { useLearner } from '@/engine/progress/learner';
import { openEventStore } from '@/engine/progress/storage';
import '@/ui/tokens.css';
import '@/ui/kit.css';

// Load and replay the saved event log before the first paint, so progress never flashes from empty.
void openEventStore()
  .then((store) => useLearner.getState().init(store))
  .finally(() =>
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    ),
  );
