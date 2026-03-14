import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DropdownSelect } from '../../components/DropdownSelect';
import { SuccessPopup } from '../../components/SuccessPopup';
import { client } from '../../lib/amplifyClient';
import type { AppUser, Department, PermissionCheck, Role, UserRole } from '../../types';

type Props = {
  can: PermissionCheck;
};

type EditForm = {
  id: string;
  username: string;
  email: string;
  status: string;
  departmentId: string;
  roleId: string;
};

export function UserManagementScreen({ can }: Props) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);

  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInviteSuccess, setShowInviteSuccess] = useState(false);
  const [inviteSuccessText, setInviteSuccessText] = useState('');

  const [editing, setEditing] = useState<EditForm | null>(null);

  const userRoleMap = useMemo(() => {
    const map = new Map<string, UserRole>();
    for (const row of userRoles) {
      if (!map.has(row.userId)) {
        map.set(row.userId, row);
      }
    }
    return map;
  }, [userRoles]);

  const roleNameById = useMemo(() => {
    return new Map(roles.map((r) => [r.id, r.name]));
  }, [roles]);

  const departmentNameById = useMemo(() => {
    return new Map(departments.map((d) => [d.id, d.name]));
  }, [departments]);

  const departmentOptions = useMemo(() => {
    return departments.map((department) => ({
      label: department.name,
      value: department.id,
    }));
  }, [departments]);

  const filteredRoleOptions = useMemo(() => {
    return roles
      .filter((role) => role.departmentId === selectedDepartmentId)
      .map((role) => ({ label: role.name, value: role.id }));
  }, [roles, selectedDepartmentId]);

  const allRoleOptions = useMemo(() => {
    return roles.map((role) => ({
      label: role.departmentId
        ? `${role.name} (${departmentNameById.get(role.departmentId) ?? 'Department'})`
        : role.name,
      value: role.id,
    }));
  }, [departmentNameById, roles]);

  const loadData = useCallback(async () => {
    const [usersResponse, rolesResponse, departmentsResponse, userRolesResponse] = await Promise.all([
      client.models.AppUser.list(),
      client.models.Role.list(),
      client.models.Department.list(),
      client.models.UserRole.list(),
    ]);

    setUsers(usersResponse.data ?? []);
    setRoles(rolesResponse.data ?? []);
    setDepartments(departmentsResponse.data ?? []);
    setUserRoles(userRolesResponse.data ?? []);
  }, []);

  useEffect(() => {
    loadData().catch((error: unknown) => setMessage((error as Error).message));
  }, [loadData]);

  const inviteUser = useCallback(async () => {
    if (!can('users', 'invite')) {
      setMessage('You do not have permission to invite users.');
      return;
    }

    if (!inviteUsername.trim() || !inviteEmail.trim()) {
      setMessage('Username and email are required.');
      return;
    }

    if (!selectedDepartmentId) {
      setMessage('Please select a department before inviting the user.');
      return;
    }

    if (!selectedRoleId) {
      setMessage('Please select a role for the selected department.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const inviteResult = await client.mutations.inviteUser({
        username: inviteUsername.trim(),
        email: inviteEmail.trim(),
        groupName: 'FREELANCER',
      });

      const normalizedEmail = inviteEmail.trim().toLowerCase();
      const cognitoUsername =
        inviteResult.data?.cognitoUsername ||
        inviteResult.data?.username ||
        normalizedEmail;

      const existing = await client.models.AppUser.list({
        filter: { email: { eq: normalizedEmail } },
      });

      const existingUser = existing.data?.[0];

      let appUserId = existingUser?.id;
      if (existingUser) {
        const updated = await client.models.AppUser.update({
          id: existingUser.id,
          username: inviteUsername.trim(),
          email: normalizedEmail,
          cognitoUsername,
          status: 'INVITED',
          departmentId: selectedDepartmentId,
        });
        appUserId = updated.data?.id ?? existingUser.id;
      } else {
        const createdUser = await client.models.AppUser.create({
          username: inviteUsername.trim(),
          email: normalizedEmail,
          cognitoUsername,
          status: 'INVITED',
          departmentId: selectedDepartmentId,
        });
        appUserId = createdUser.data?.id;
      }

      if (selectedRoleId && appUserId) {
        const relation = userRoles.find((row) => row.userId === appUserId);
        if (relation) {
          await client.models.UserRole.update({ id: relation.id, roleId: selectedRoleId });
        } else {
          await client.models.UserRole.create({ userId: appUserId, roleId: selectedRoleId });
        }
      }

      setMessage(inviteResult.data?.message ?? 'User invited successfully.');
      setInviteSuccessText(inviteResult.data?.message ?? 'The invitation email was sent successfully.');
      setShowInviteSuccess(true);
      setInviteUsername('');
      setInviteEmail('');
      setSelectedDepartmentId('');
      setSelectedRoleId('');
      await loadData();
    } catch (error: unknown) {
      setMessage(`Invite failed: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [
    can,
    inviteEmail,
    inviteUsername,
    loadData,
    selectedDepartmentId,
    selectedRoleId,
    userRoles,
  ]);

  const startEdit = useCallback(
    (user: AppUser) => {
      const relation = userRoleMap.get(user.id);
      setEditing({
        id: user.id,
        username: user.username,
        email: user.email,
        status: user.status ?? 'ACTIVE',
        departmentId: user.departmentId ?? '',
        roleId: relation?.roleId ?? '',
      });
      setMessage('');
    },
    [userRoleMap],
  );

  const saveEdit = useCallback(async () => {
    if (!editing) {
      return;
    }

    if (!can('users', 'edit')) {
      setMessage('You do not have permission to edit users.');
      return;
    }

    try {
      await client.models.AppUser.update({
        id: editing.id,
        username: editing.username.trim(),
        email: editing.email.trim(),
        status: editing.status,
        departmentId: can('users', 'assignDepartment') ? editing.departmentId || undefined : undefined,
      });

      if (can('users', 'assignRole')) {
        const relation = userRoleMap.get(editing.id);
        if (editing.roleId && relation) {
          await client.models.UserRole.update({ id: relation.id, roleId: editing.roleId });
        } else if (editing.roleId && !relation) {
          await client.models.UserRole.create({ userId: editing.id, roleId: editing.roleId });
        } else if (!editing.roleId && relation) {
          await client.models.UserRole.delete({ id: relation.id });
        }
      }

      setEditing(null);
      setMessage('User updated successfully.');
      await loadData();
    } catch (error: unknown) {
      setMessage(`Update failed: ${(error as Error).message}`);
    }
  }, [can, editing, loadData, userRoleMap]);

  const deleteUser = useCallback(
    async (user: AppUser) => {
      if (!can('users', 'delete')) {
        setMessage('You do not have permission to delete users.');
        return;
      }

      try {
        const cognitoUsername = user.cognitoUsername || user.email;
        await client.mutations.adminDeleteUser({
          cognitoUsername,
          email: user.email,
        });

        const related = userRoles.filter((row) => row.userId === user.id);
        for (const row of related) {
          await client.models.UserRole.delete({ id: row.id });
        }
        await client.models.AppUser.delete({ id: user.id });

        setMessage(`User ${user.username} deleted from Cognito and app records.`);
        await loadData();
      } catch (error: unknown) {
        setMessage(`Delete failed: ${(error as Error).message}`);
      }
    },
    [can, loadData, userRoles],
  );

  return (
    <ScrollView contentContainerStyle={styles.contentWrap}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Invite User</Text>

        <TextInput
          style={styles.input}
          value={inviteUsername}
          placeholder="Username"
          onChangeText={setInviteUsername}
        />
        <TextInput
          style={styles.input}
          value={inviteEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={setInviteEmail}
        />

        <DropdownSelect
          label="Department"
          value={selectedDepartmentId}
          placeholder="Select department"
          options={departmentOptions}
          onChange={(nextDepartmentId) => {
            setSelectedDepartmentId(nextDepartmentId);
            setSelectedRoleId('');
          }}
        />

        <DropdownSelect
          label="Role"
          value={selectedRoleId}
          placeholder={
            selectedDepartmentId
              ? 'Select role in selected department'
              : 'Select department first'
          }
          options={filteredRoleOptions}
          disabled={!selectedDepartmentId}
          onChange={setSelectedRoleId}
        />

        <Pressable
          style={[styles.primaryButton, !can('users', 'invite') ? styles.buttonDisabled : undefined]}
          onPress={inviteUser}
          disabled={loading || !can('users', 'invite')}
        >
          <Text style={styles.primaryButtonText}>{loading ? 'Inviting...' : 'Invite User'}</Text>
        </Pressable>
      </View>

      {!!editing && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Edit User</Text>
          <TextInput
            style={styles.input}
            value={editing.username}
            placeholder="Username"
            onChangeText={(value) => setEditing((prev) => (prev ? { ...prev, username: value } : prev))}
          />
          <TextInput
            style={styles.input}
            value={editing.email}
            placeholder="Email"
            onChangeText={(value) => setEditing((prev) => (prev ? { ...prev, email: value } : prev))}
          />

          <Text style={styles.metaLabel}>Status</Text>
          <View style={styles.rowWrap}>
            {['INVITED', 'ACTIVE', 'DISABLED'].map((status) => (
              <Pressable
                key={status}
                onPress={() => setEditing((prev) => (prev ? { ...prev, status } : prev))}
                style={[styles.chip, editing.status === status ? styles.chipActive : undefined]}
              >
                <Text style={styles.chipText}>{status}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.metaLabel}>Department</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {departments.map((department) => (
              <Pressable
                key={department.id}
                onPress={() =>
                  setEditing((prev) => (prev ? { ...prev, departmentId: department.id } : prev))
                }
                style={[styles.chip, editing.departmentId === department.id ? styles.chipActive : undefined]}
              >
                <Text style={styles.chipText}>{department.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.metaLabel}>Role</Text>
          <DropdownSelect
            label="Role"
            value={editing.roleId}
            placeholder="Select role"
            options={
              editing.departmentId
                ? roles
                    .filter((role) => role.departmentId === editing.departmentId)
                    .map((role) => ({ label: role.name, value: role.id }))
                : allRoleOptions
            }
            disabled={!can('users', 'assignRole')}
            onChange={(value) => setEditing((prev) => (prev ? { ...prev, roleId: value } : prev))}
          />

          <View style={styles.rowWrap}>
            <Pressable
              style={[styles.primaryButton, styles.flexButton, !can('users', 'edit') ? styles.buttonDisabled : undefined]}
              onPress={saveEdit}
              disabled={!can('users', 'edit')}
            >
              <Text style={styles.primaryButtonText}>Save</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, styles.flexButton]}
              onPress={() => setEditing(null)}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Users</Text>
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const relation = userRoleMap.get(item.id);
            return (
              <View style={styles.listItem}>
                <Text style={styles.listItemTitle}>{item.username}</Text>
                <Text style={styles.listItemMeta}>{item.email}</Text>
                <Text style={styles.listItemMeta}>Status: {item.status ?? 'N/A'}</Text>
                <Text style={styles.listItemMeta}>
                  Department: {item.departmentId ? departmentNameById.get(item.departmentId) ?? item.departmentId : '-'}
                </Text>
                <Text style={styles.listItemMeta}>
                  Role: {relation?.roleId ? roleNameById.get(relation.roleId) ?? relation.roleId : '-'}
                </Text>

                <View style={styles.rowWrap}>
                  <Pressable
                    style={[styles.secondaryButton, styles.flexButton]}
                    onPress={() => startEdit(item)}
                    disabled={!can('users', 'edit')}
                  >
                    <Text style={styles.secondaryButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.dangerButton, styles.flexButton, !can('users', 'delete') ? styles.buttonDisabled : undefined]}
                    onPress={() => void deleteUser(item)}
                    disabled={!can('users', 'delete')}
                  >
                    <Text style={styles.dangerButtonText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      </View>

      {!!message && <Text style={styles.message}>{message}</Text>}

      <SuccessPopup
        visible={showInviteSuccess}
        title="Invitation Sent"
        description={inviteSuccessText}
        onClose={() => setShowInviteSuccess(false)}
      />
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
  secondaryButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 14,
  },
  dangerButton: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  dangerButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  listItem: {
    borderWidth: 1,
    borderColor: '#dce5f2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#12263a',
  },
  listItemMeta: {
    fontSize: 13,
    color: '#4f5d75',
    marginTop: 2,
  },
  message: {
    color: '#9a3412',
    marginHorizontal: 4,
    marginTop: 2,
    marginBottom: 12,
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
  metaLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 4,
  },
  rowWrap: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  flexButton: {
    flex: 1,
  },
});
