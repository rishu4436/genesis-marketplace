import type { CategoryId } from "./categories";

export type HireTally = {
  registered: number;
  endpointAlive: number;
  hireable: number;
  genesis: number;
  liveThirdParty: number;
  unhireableRegistered: number;
  aliveNotHireable: number;
  byCategory: Record<CategoryId, number>;
  asOf: string | null;
};
