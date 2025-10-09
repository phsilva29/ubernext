# Implementações Imediatas de Performance

## 1. Code Splitting e Lazy Loading

```typescript
// src/utils/lazyComponents.ts
import { lazy } from 'react';

export const Dashboard = lazy(() => import('../components/dashboard/Dashboard'));
export const Despesas = lazy(() => import('../components/Despesas'));
export const UberCalculator = lazy(() => import('../components/UberCalculator'));
```

## 2. Service Worker para Cache Offline

```typescript
// public/sw.js
const CACHE_NAME = 'ubernext-v1.0.0';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});
```

## 3. Database Indexes

```sql
-- Executar no Supabase SQL Editor
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_viagens_user_data 
  ON viagens(user_id, data DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_despesas_user_data 
  ON despesas(user_id, data DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email 
  ON profiles(email);

-- Index para queries de dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_viagens_user_mes 
  ON viagens(user_id, EXTRACT(YEAR FROM data), EXTRACT(MONTH FROM data));
```

## 4. Bundle Optimization

```typescript
// vite.config.ts optimization
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select'],
          charts: ['recharts'],
          utils: ['date-fns', 'clsx']
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
});
```

## 5. Image Optimization

```typescript
// src/components/ui/OptimizedImage.tsx
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src, alt, width, height, className
}) => {
  return (
    <picture>
      <source srcSet={`${src}.webp`} type="image/webp" />
      <img 
        src={src} 
        alt={alt} 
        width={width} 
        height={height}
        className={className}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
};
```

## 6. Virtual Scrolling para Listas Grandes

```typescript
// src/components/VirtualList.tsx
import { FixedSizeList as List } from 'react-window';

interface VirtualListProps {
  items: any[];
  itemHeight: number;
  renderItem: ({ index, style }: any) => React.ReactElement;
}

export const VirtualList: React.FC<VirtualListProps> = ({
  items, itemHeight, renderItem
}) => (
  <List
    height={400}
    itemCount={items.length}
    itemSize={itemHeight}
    width="100%"
  >
    {renderItem}
  </List>
);
```

## 7. Error Boundary com Retry

```typescript
// src/components/ErrorBoundary.tsx
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service
  }

  retry = () => {
    if (this.state.retryCount < 3) {
      this.setState({ 
        hasError: false, 
        error: undefined,
        retryCount: this.state.retryCount + 1 
      });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Algo deu errado</h2>
          <button onClick={this.retry}>Tentar Novamente</button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## 8. Progressive Web App (PWA)

```json
// public/manifest.json
{
  "name": "UberNext - Controle de Motorista",
  "short_name": "UberNext",
  "description": "Gerencie seus ganhos e gastos como motorista",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## 9. Performance Monitoring

```typescript
// src/utils/performance.ts
export const trackPageLoad = (pageName: string) => {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'navigation') {
        const navEntry = entry as PerformanceNavigationTiming;
        console.log(`Page ${pageName} loaded in ${navEntry.loadEventEnd - navEntry.loadEventStart}ms`);
      }
    }
  });
  
  observer.observe({ entryTypes: ['navigation'] });
};

export const trackLCP = () => {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.startTime);
  });
  
  observer.observe({ entryTypes: ['largest-contentful-paint'] });
};
```

## 10. Memory Leak Prevention

```typescript
// src/hooks/useCleanup.ts
export const useCleanup = (cleanupFn: () => void) => {
  React.useEffect(() => {
    return cleanupFn;
  }, [cleanupFn]);
};

// Usage
const MyComponent = () => {
  const [timer, setTimer] = React.useState<NodeJS.Timeout>();
  
  useCleanup(() => {
    if (timer) clearInterval(timer);
  });
  
  // Component logic...
};
```