import { useState } from 'react';
import { PRODUCTS } from './products/index';
import type { Product } from './data/products';
import { Sidebar, ProductViewer } from './components';

export default function App() {
  const [selected,    setSelected]    = useState<Product>(PRODUCTS[0]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        products={PRODUCTS}
        selected={selected}
        onSelect={setSelected}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />
      <main className="flex-1 overflow-hidden flex flex-col p-3 gap-0">
        <ProductViewer key={selected.id} product={selected} />
      </main>
    </div>
  );
}
