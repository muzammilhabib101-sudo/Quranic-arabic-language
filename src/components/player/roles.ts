import type { RoleT } from "@/content/schema";

/** Grammar role colours, used the same way on chips, diagrams and tags. */
export const roleChip: Record<RoleT, string> = {
  noun: "border-noun/50 bg-noun/10 text-noun",
  verb: "border-verb/50 bg-verb/10 text-verb",
  particle: "border-particle/50 bg-particle/10 text-particle",
};

export const roleTag: Record<RoleT, string> = {
  noun: "bg-noun/15 text-noun",
  verb: "bg-verb/15 text-verb",
  particle: "bg-particle/15 text-particle",
};
