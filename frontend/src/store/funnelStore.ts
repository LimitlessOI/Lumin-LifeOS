```typescript
import create from 'zustand';

type FunnelState = {
  components: any[];
  addComponent: (component: any) => void;
};

export const useFunnelStore = create<FunnelState>((set) => ({
  components: [],
  addComponent: (component) => set((state) => ({ components: [...state.components, component] })),
}));