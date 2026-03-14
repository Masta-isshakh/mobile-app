import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { DropdownSelect } from '../../components/DropdownSelect';
import { POLICY_CATALOG } from '../../constants/policyCatalog';
import { client } from '../../lib/amplifyClient';
import type { Department, PermissionCheck, Policy, Role, RolePolicy } from '../../types';

type Props = {
  can: PermissionCheck;
};

export function RolePolicyScreen({ can }: Props) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [rolePolicies, setRolePolicies] = useState<RolePolicy[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDepartmentId, setNewRoleDepartmentId] = useState('');
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyResource, setNewPolicyResource] = useState('');
  const [newPolicyAction, setNewPolicyAction] = useState('');
  const [message, setMessage] = useState('');

  const policyByResourceAction = useMemo(() => {
    const map = new Map<string, Policy>();
    for (const policy of policies) {
      map.set(`${policy.resource}:${policy.action}`, policy);
    }
    return map;
  }, [policies]);

  const rolePolicyByPolicyId = useMemo(() => {
    const map = new Map<string, RolePolicy>();
    for (const rp of rolePolicies) {
      if (rp.roleId === selectedRoleId) {
        map.set(rp.policyId, rp);
      }
    }
    return map;
  }, [rolePolicies, selectedRoleId]);

  const groupedCatalog = useMemo(() => {
    const map = new Map<string, typeof POLICY_CATALOG>();
    for (const policy of POLICY_CATALOG) {
      const list = map.get(policy.page) ?? [];
      list.push(policy);
      map.set(policy.page, list);
    }
    return Array.from(map.entries());
  }, []);

  const departmentNameById = useMemo(() => {
    return new Map(departments.map((department) => [department.id, department.name]));
  }, [departments]);

  const departmentOptions = useMemo(() => {
    return departments.map((department) => ({ label: department.name, value: department.id }));
  }, [departments]);

  const loadData = useCallback(async () => {
    const [rolesResponse, departmentsResponse, policiesResponse, rolePoliciesResponse] = await Promise.all([
      client.models.Role.list(),
      client.models.Department.list(),
      client.models.Policy.list(),
      client.models.RolePolicy.list(),
    ]);

    const nextRoles = rolesResponse.data ?? [];
    setRoles(nextRoles);
    setDepartments(departmentsResponse.data ?? []);
    setPolicies(policiesResponse.data ?? []);
    setRolePolicies(rolePoliciesResponse.data ?? []);

    if (!selectedRoleId && nextRoles.length > 0) {
      setSelectedRoleId(nextRoles[0].id);
    }
  }, [selectedRoleId]);

  const seedCatalogPolicies = useCallback(async () => {
    if (!can('policies', 'create')) {
      return;
    }

    const existing = new Set(policies.map((p) => `${p.resource}:${p.action}`));
    for (const definition of POLICY_CATALOG) {
      const key = `${definition.resource}:${definition.action}`;
      if (existing.has(key)) {
        continue;
      }
      await client.models.Policy.create({
        name: definition.name,
        description: definition.description,
        resource: definition.resource,
        action: definition.action,
      });
    }
  }, [can, policies]);

  useEffect(() => {
    loadData().catch((error: unknown) => setMessage((error as Error).message));
  }, [loadData]);

  useEffect(() => {
    seedCatalogPolicies()
      .then(() => loadData())
      .catch((error: unknown) => setMessage((error as Error).message));
  }, [loadData, seedCatalogPolicies]);

  const createRole = useCallback(async () => {
    if (!can('roles', 'create')) {
      setMessage('You do not have permission to create roles.');
      return;
    }
    if (!newRoleName.trim()) {
      setMessage('Role name is required.');
      return;
    }

    if (!newRoleDepartmentId) {
      setMessage('Select a department for the role.');
      return;
    }

    await client.models.Role.create({
      name: newRoleName.trim(),
      departmentId: newRoleDepartmentId,
      isActive: true,
    });
    setNewRoleName('');
    setNewRoleDepartmentId('');
    setMessage('Role created.');
    await loadData();
  }, [can, loadData, newRoleDepartmentId, newRoleName]);

  const createPolicy = useCallback(async () => {
    if (!can('policies', 'create')) {
      setMessage('You do not have permission to create policies.');
      return;
    }
    if (!newPolicyName.trim() || !newPolicyResource.trim() || !newPolicyAction.trim()) {
      setMessage('Name, resource and action are required.');
      return;
    }

    await client.models.Policy.create({
      name: newPolicyName.trim(),
      resource: newPolicyResource.trim(),
      action: newPolicyAction.trim(),
    });

    setNewPolicyName('');
    setNewPolicyResource('');
    setNewPolicyAction('');
    setMessage('Policy created.');
    await loadData();
  }, [can, loadData, newPolicyAction, newPolicyName, newPolicyResource]);

  const setPolicyToggle = useCallback(
    async (policyId: string, enabled: boolean) => {
      if (!selectedRoleId) {
        setMessage('Select a role first.');
        return;
      }
      if (!can('rolePolicies', 'toggle')) {
        setMessage('You do not have permission to toggle role policies.');
        return;
      }

      const existing = rolePolicyByPolicyId.get(policyId);
      if (!existing) {
        await client.models.RolePolicy.create({
          roleId: selectedRoleId,
          policyId,
          effect: enabled ? 'ALLOW' : 'DENY',
        });
      } else {
        await client.models.RolePolicy.update({
          id: existing.id,
          effect: enabled ? 'ALLOW' : 'DENY',
        });
      }

      await loadData();
    },
    [can, loadData, rolePolicyByPolicyId, selectedRoleId],
  );

  return (
    <ScrollView contentContainerStyle={styles.contentWrap}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Roles & Access Control Center</Text>
        <Text style={styles.paragraph}>
          Every page and action in the app is controlled here. Toggle access per role.
        </Text>

        <Text style={styles.metaLabel}>Select Role</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {roles.map((role) => (
            <Pressable
              key={role.id}
              onPress={() => setSelectedRoleId(role.id)}
              style={[styles.chip, selectedRoleId === role.id ? styles.chipActive : undefined]}
            >
              <Text style={[styles.chipText, selectedRoleId === role.id ? styles.chipTextActive : undefined]}>
                {role.departmentId
                  ? `${role.name} - ${departmentNameById.get(role.departmentId) ?? 'Department'}`
                  : role.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Create Role</Text>
        <TextInput
          style={styles.input}
          value={newRoleName}
          placeholder="New role name"
          onChangeText={setNewRoleName}
        />
        <DropdownSelect
          label="Department"
          value={newRoleDepartmentId}
          placeholder="Select department"
          options={departmentOptions}
          onChange={setNewRoleDepartmentId}
        />
        <Pressable
          style={[styles.primaryButton, !can('roles', 'create') ? styles.buttonDisabled : undefined]}
          onPress={() => void createRole()}
          disabled={!can('roles', 'create')}
        >
          <Text style={styles.primaryButtonText}>Create Role</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Create Custom Policy</Text>
        <TextInput
          style={styles.input}
          value={newPolicyName}
          placeholder="Policy name"
          onChangeText={setNewPolicyName}
        />
        <TextInput
          style={styles.input}
          value={newPolicyResource}
          placeholder="Resource (example: users)"
          onChangeText={setNewPolicyResource}
        />
        <TextInput
          style={styles.input}
          value={newPolicyAction}
          placeholder="Action (example: edit)"
          onChangeText={setNewPolicyAction}
        />
        <Pressable
          style={[styles.primaryButton, !can('policies', 'create') ? styles.buttonDisabled : undefined]}
          onPress={() => void createPolicy()}
          disabled={!can('policies', 'create')}
        >
          <Text style={styles.primaryButtonText}>Create Policy</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Policy Toggles</Text>
        {!selectedRoleId && <Text style={styles.paragraph}>Create or select a role to manage policy toggles.</Text>}

        {groupedCatalog.map(([page, pagePolicies]) => (
          <View key={page} style={styles.pageSection}>
            <Text style={styles.pageTitle}>{page}</Text>

            {pagePolicies.map((definition) => {
              const policy = policyByResourceAction.get(`${definition.resource}:${definition.action}`);
              const rolePolicy = policy ? rolePolicyByPolicyId.get(policy.id) : undefined;
              const enabled = rolePolicy ? (rolePolicy.effect ?? 'ALLOW') === 'ALLOW' : false;

              return (
                <View key={definition.key} style={styles.toggleRow}>
                  <View style={styles.toggleTextWrap}>
                    <Text style={styles.toggleTitle}>{definition.name}</Text>
                    <Text style={styles.toggleDescription}>{definition.description}</Text>
                  </View>
                  <Switch
                    value={enabled}
                    disabled={!policy || !selectedRoleId || !can('rolePolicies', 'toggle')}
                    onValueChange={(next) => {
                      if (!policy) {
                        return;
                      }
                      void setPolicyToggle(policy.id, next);
                    }}
                    thumbColor={enabled ? '#0ea5e9' : '#cbd5e1'}
                    trackColor={{ false: '#e2e8f0', true: '#bae6fd' }}
                  />
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {!!message && <Text style={styles.message}>{message}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentWrap: {
    padding: 12,
    paddingBottom: 120,
    gap: 12,
  },
  card: {
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#12263a',
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 14,
    color: '#475569',
  },
  input: {
    borderWidth: 1,
    borderColor: '#c3d2e8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#f9fbfe',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginVertical: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e8eef7',
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: '#2563eb',
  },
  chipText: {
    color: '#12263a',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 4,
  },
  pageSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  toggleDescription: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  message: {
    color: '#9a3412',
    marginHorizontal: 4,
    marginTop: 2,
    marginBottom: 12,
  },
});
