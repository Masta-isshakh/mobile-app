import { permissionKey } from '../constants/policyCatalog';
import type { Policy, RolePolicy } from '../types';

export function buildPermissionSet(
  roleIds: string[],
  policies: Policy[],
  rolePolicies: RolePolicy[],
): Set<string> {
  const roleIdSet = new Set(roleIds);
  const policyById = new Map(policies.map((policy) => [policy.id, policy]));
  const allowed = new Set<string>();

  for (const rp of rolePolicies) {
    if (!roleIdSet.has(rp.roleId)) {
      continue;
    }

    const policy = policyById.get(rp.policyId);
    if (!policy) {
      continue;
    }

    const key = permissionKey(policy.resource, policy.action);
    if ((rp.effect ?? 'ALLOW') === 'ALLOW') {
      allowed.add(key);
    } else {
      allowed.delete(key);
    }
  }

  return allowed;
}
