import { Link } from '@tanstack/react-router';
import { Compass } from 'lucide-react';
import { GlassPanel } from '@/ui/components';

export function NotFound() {
  return (
    <GlassPanel className="mx-auto max-w-[560px] rounded-[28px] p-8 text-center">
      <span className="tile tile-sky mx-auto size-16">
        <Compass size={30} />
      </span>
      <h1 className="mt-4 font-display text-3xl font-extrabold">Uncharted waters</h1>
      <p className="mt-2 font-medium text-ink-2">This place is not on the map.</p>
      <Link to="/" className="gem gem-sky gem-md mt-5">
        Back to the World Map
      </Link>
    </GlassPanel>
  );
}
