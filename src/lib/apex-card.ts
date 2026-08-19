/**
 * Public A2A agent card for Genesis specialists.
 * This is the Genesis-hosted live seller surface (not the expired BNB Studio trial).
 */

import { getGenesisAgent } from "./genesis-agents";
import { identityFromGenesis } from "./seller-identity";

export type GenesisAgentCard = {
  name: string;
  description: string;
  url: string;
  documentationUrl: string;
  version: string;
  protocolVersion: string;
  provider: { organization: string; url: string };
  capabilities: { streaming: false; pushNotifications: false };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: { id: string; name: string; description: string; tags: string[] }[];
  extra: {
    genesisSlug: string;
    categoryId: string;
    chainId: number;
    tokenId: string | null;
    identityHash: string;
    mandate: { custody: false; mayMoveFunds: false; output: "structured-plan" };
    healthUrl: string;
    negotiateUrl: string;
    runtime: "genesis-apex";
  };
};

export function genesisAgentCard(
  slug: string,
  origin: string,
): GenesisAgentCard | null {
  const agent = getGenesisAgent(slug);
  if (!agent) return null;
  const identity = identityFromGenesis(agent, origin);
  const base = origin.replace(/\/$/, "");
  const service = `${base}/api/apex/${agent.slug}`;
  return {
    name: agent.name,
    description: agent.description,
    url: service,
    documentationUrl: `${base}/genesis/${agent.slug}`,
    version: identity.version,
    protocolVersion: "0.2.9",
    provider: {
      organization: "Genesis Marketplace",
      url: base,
    },
    capabilities: { streaming: false, pushNotifications: false },
    defaultInputModes: ["text"],
    defaultOutputModes: ["text", "application/json"],
    skills: agent.skills.map((s, i) => ({
      id: `${agent.slug}-skill-${i + 1}`,
      name: s,
      description: agent.tagline,
      tags: [agent.categoryId, "erc-8004", "plan-only"],
    })),
    extra: {
      genesisSlug: agent.slug,
      categoryId: agent.categoryId,
      chainId: identity.chainId,
      tokenId: identity.tokenId,
      identityHash: identity.identityHash,
      mandate: {
        custody: false,
        mayMoveFunds: false,
        output: "structured-plan",
      },
      healthUrl: `${service}/health`,
      negotiateUrl: `${service}/negotiate`,
      runtime: "genesis-apex",
    },
  };
}
