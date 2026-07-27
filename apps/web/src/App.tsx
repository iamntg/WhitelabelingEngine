import { useCallback, useEffect, useState } from 'react';
import { BrandListPage } from './features/brands/BrandListPage.jsx';
import { EditorPage } from './features/editor/EditorPage.jsx';

/**
 * Routing.
 *
 * Two destinations and no nested layouts, so the History API directly is
 * simpler than adding a router — and it keeps the back button, deep links and
 * refresh working, which is all the app needs today. Worth replacing the moment
 * a third route or a nested layout appears.
 */

type Route = { name: 'brands' } | { name: 'editor'; tenantId: string };

function parse(pathname: string): Route {
  const match = /^\/brands\/([^/]+)\/theme\/?$/.exec(pathname);
  return match?.[1] ? { name: 'editor', tenantId: match[1] } : { name: 'brands' };
}

export function App() {
  const [route, setRoute] = useState<Route>(() => parse(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setRoute(parse(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setRoute(parse(path));
  }, []);

  if (route.name === 'editor') {
    return (
      <EditorPage tenantId={route.tenantId} onBack={() => navigate('/')} />
    );
  }

  return <BrandListPage onOpen={(tenantId) => navigate(`/brands/${tenantId}/theme`)} />;
}
