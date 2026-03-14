import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { authenticatorTextUtil } from '@aws-amplify/ui';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { Authenticator, type SignInProps } from '@aws-amplify/ui-react-native';
import { DefaultContent } from '@aws-amplify/ui-react-native/lib/Authenticator/common';
import { useFieldValues } from '@aws-amplify/ui-react-native/lib/Authenticator/hooks';
import type { Schema } from './amplify/data/resource';

declare const require: (path: string) => unknown;

const amplifyConfig = (() => {
  try {
    return require('./amplify_outputs.json');
  } catch {
    return null;
  }
})();

if (amplifyConfig) {
  Amplify.configure(amplifyConfig);
}

const client = generateClient<Schema>() as any;

type Role = { id: string; name: string; description?: string | null };
type Department = { id: string; name: string; description?: string | null };
type Policy = { id: string; name: string; resource: string; action: string };
type AppUser = {
  id: string;
  username: string;
  email: string;
  displayName?: string | null;
  status?: string | null;
  departmentId?: string | null;
};
type UserRole = { id: string; userId: string; roleId: string };
type RolePolicy = { id: string; roleId: string; policyId: string; effect?: 'ALLOW' | 'DENY' | null };

type TabKey = 'users' | 'departments' | 'roles';

function LockedDownSignIn({
  fields,
  handleBlur,
  handleChange,
  handleSubmit,
  validationErrors,
  ...rest
}: SignInProps) {
  const { getSignInTabText, getSignInText } = authenticatorTextUtil;
  const {
    disableFormSubmit: disabled,
    fields: fieldsWithHandlers,
    fieldValidationErrors,
    handleFormSubmit,
  } = useFieldValues({
    componentName: 'SignIn',
    fields,
    handleBlur,
    handleChange,
    handleSubmit,
    validationErrors,
  });

  return (
    <DefaultContent
      {...rest}
      body={
        <Text style={styles.authHint}>
          Account creation and password resets are managed by an administrator. The first admin user must
          be created manually in the Cognito console and added to the ADMIN group.
        </Text>
      }
      buttons={{
        primary: {
          children: getSignInText(),
          disabled,
          onPress: handleFormSubmit,
        },
      }}
      fields={fieldsWithHandlers}
      Footer={Authenticator.SignIn.Footer}
      FormFields={Authenticator.SignIn.FormFields}
      Header={Authenticator.SignIn.Header}
      headerText={getSignInTabText()}
      validationErrors={fieldValidationErrors}
    />
  );
}

function MissingConfigScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Amplify is not configured yet</Text>
        <Text style={styles.paragraph}>
          Deploy your backend first, then regenerate outputs in this project.
        </Text>
        <Text style={styles.codeBlock}>npx ampx sandbox</Text>
      </View>
    </SafeAreaView>
  );
}

function ScreenHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function AdminTabs({ current, onChange }: { current: TabKey; onChange: (next: TabKey) => void }) {
  const tabs: TabKey[] = ['users', 'departments', 'roles'];
  return (
    <View style={styles.tabRow}>
      {tabs.map((tab) => (
        <Pressable
          key={tab}
          onPress={() => onChange(tab)}
          style={[styles.tabButton, current === tab ? styles.tabButtonActive : undefined]}
        >
          <Text style={[styles.tabButtonText, current === tab ? styles.tabButtonTextActive : undefined]}>
            {tab.toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function AdminUserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTempPassword, setInviteTempPassword] = useState('Temp@12345');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    const [usersResponse, rolesResponse, departmentsResponse] = await Promise.all([
      client.models.AppUser.list(),
      client.models.Role.list(),
      client.models.Department.list(),
    ]);
    setUsers(usersResponse.data ?? []);
    setRoles(rolesResponse.data ?? []);
    setDepartments(departmentsResponse.data ?? []);
  }, []);

  useEffect(() => {
    loadData().catch((error: unknown) => {
      setMessage(`Failed to load users: ${(error as Error).message}`);
    });
  }, [loadData]);

  const inviteUser = useCallback(async () => {
    if (!inviteUsername.trim() || !inviteEmail.trim()) {
      setMessage('Username and email are required.');
      return;
    }

    setMessage('');
    try {
      const inviteResult = await client.mutations.inviteUser({
        username: inviteUsername.trim(),
        email: inviteEmail.trim(),
        temporaryPassword: inviteTempPassword,
        groupName: 'FREELANCER',
      });

      const createdUser = await client.models.AppUser.create({
        username: inviteUsername.trim(),
        email: inviteEmail.trim(),
        status: 'INVITED',
        departmentId: selectedDepartmentId || undefined,
      });

      if (selectedRoleId && createdUser.data?.id) {
        await client.models.UserRole.create({
          userId: createdUser.data.id,
          roleId: selectedRoleId,
        });
      }

      setMessage(inviteResult.data?.message ?? 'User invited successfully.');
      setInviteUsername('');
      setInviteEmail('');
      await loadData();
    } catch (error: unknown) {
      setMessage(`Invite failed: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [
    inviteEmail,
    inviteTempPassword,
    inviteUsername,
    loadData,
    selectedDepartmentId,
    selectedRoleId,
  ]);

  return (
    <View style={styles.section}>
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
      <TextInput
        style={styles.input}
        value={inviteTempPassword}
        placeholder="Temporary password"
        secureTextEntry
        onChangeText={setInviteTempPassword}
      />

      <Text style={styles.metaLabel}>Department</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {departments.map((department) => (
          <Pressable
            key={department.id}
            onPress={() => setSelectedDepartmentId(department.id)}
            style={[
              styles.chip,
              selectedDepartmentId === department.id ? styles.chipActive : undefined,
            ]}
          >
            <Text style={styles.chipText}>{department.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.metaLabel}>Role</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {roles.map((role) => (
          <Pressable
            key={role.id}
            onPress={() => setSelectedRoleId(role.id)}
            style={[styles.chip, selectedRoleId === role.id ? styles.chipActive : undefined]}
          >
            <Text style={styles.chipText}>{role.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable style={styles.primaryButton} onPress={inviteUser} disabled={loading}>
        <Text style={styles.primaryButtonText}>{loading ? 'Inviting...' : 'Invite User'}</Text>
      </Pressable>

      {!!message && <Text style={styles.message}>{message}</Text>}

      <Text style={styles.sectionTitle}>Users</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text style={styles.listItemTitle}>{item.username}</Text>
            <Text style={styles.listItemMeta}>{item.email}</Text>
            <Text style={styles.listItemMeta}>Status: {item.status ?? 'N/A'}</Text>
          </View>
        )}
      />
    </View>
  );
}

function AdminDepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');

  const loadDepartments = useCallback(async () => {
    const response = await client.models.Department.list();
    setDepartments(response.data ?? []);
  }, []);

  useEffect(() => {
    loadDepartments().catch((error: unknown) => {
      setMessage((error as Error).message);
    });
  }, [loadDepartments]);

  const addDepartment = useCallback(async () => {
    if (!name.trim()) {
      setMessage('Department name is required.');
      return;
    }
    try {
      await client.models.Department.create({
        name: name.trim(),
        description: description.trim(),
        isActive: true,
      });
      setName('');
      setDescription('');
      setMessage('Department created.');
      await loadDepartments();
    } catch (error: unknown) {
      setMessage((error as Error).message);
    }
  }, [description, loadDepartments, name]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Department Management</Text>
      <TextInput style={styles.input} value={name} placeholder="Department name" onChangeText={setName} />
      <TextInput
        style={styles.input}
        value={description}
        placeholder="Description"
        onChangeText={setDescription}
      />
      <Pressable style={styles.primaryButton} onPress={addDepartment}>
        <Text style={styles.primaryButtonText}>Create Department</Text>
      </Pressable>
      {!!message && <Text style={styles.message}>{message}</Text>}

      {departments.map((department) => (
        <View key={department.id} style={styles.listItem}>
          <Text style={styles.listItemTitle}>{department.name}</Text>
          <Text style={styles.listItemMeta}>{department.description || '-'}</Text>
        </View>
      ))}
    </View>
  );
}

function AdminRolePoliciesManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [rolePolicies, setRolePolicies] = useState<RolePolicy[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyResource, setNewPolicyResource] = useState('');
  const [newPolicyAction, setNewPolicyAction] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const [rolesResponse, policiesResponse, rolePoliciesResponse] = await Promise.all([
      client.models.Role.list(),
      client.models.Policy.list(),
      client.models.RolePolicy.list(),
    ]);
    setRoles(rolesResponse.data ?? []);
    setPolicies(policiesResponse.data ?? []);
    setRolePolicies(rolePoliciesResponse.data ?? []);
  }, []);

  useEffect(() => {
    load().catch((error: unknown) => {
      setMessage((error as Error).message);
    });
  }, [load]);

  const createRole = useCallback(async () => {
    if (!newRoleName.trim()) {
      setMessage('Role name is required.');
      return;
    }
    await client.models.Role.create({ name: newRoleName.trim(), isActive: true });
    setNewRoleName('');
    await load();
  }, [load, newRoleName]);

  const createPolicy = useCallback(async () => {
    if (!newPolicyName.trim() || !newPolicyResource.trim() || !newPolicyAction.trim()) {
      setMessage('Policy name, resource and action are required.');
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
    await load();
  }, [load, newPolicyAction, newPolicyName, newPolicyResource]);

  const linkPolicyToRole = useCallback(async () => {
    if (!selectedRoleId || !selectedPolicyId) {
      setMessage('Select both role and policy.');
      return;
    }
    await client.models.RolePolicy.create({
      roleId: selectedRoleId,
      policyId: selectedPolicyId,
      effect: 'ALLOW',
    });
    setSelectedRoleId('');
    setSelectedPolicyId('');
    await load();
  }, [load, selectedPolicyId, selectedRoleId]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Role & Policy Management</Text>

      <TextInput
        style={styles.input}
        value={newRoleName}
        placeholder="New role name"
        onChangeText={setNewRoleName}
      />
      <Pressable style={styles.primaryButton} onPress={createRole}>
        <Text style={styles.primaryButtonText}>Create Role</Text>
      </Pressable>

      <TextInput
        style={styles.input}
        value={newPolicyName}
        placeholder="Policy name"
        onChangeText={setNewPolicyName}
      />
      <TextInput
        style={styles.input}
        value={newPolicyResource}
        placeholder="Resource (example: projects)"
        onChangeText={setNewPolicyResource}
      />
      <TextInput
        style={styles.input}
        value={newPolicyAction}
        placeholder="Action (example: read)"
        onChangeText={setNewPolicyAction}
      />
      <Pressable style={styles.primaryButton} onPress={createPolicy}>
        <Text style={styles.primaryButtonText}>Create Policy</Text>
      </Pressable>

      <Text style={styles.metaLabel}>Select Role</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {roles.map((role) => (
          <Pressable
            key={role.id}
            onPress={() => setSelectedRoleId(role.id)}
            style={[styles.chip, selectedRoleId === role.id ? styles.chipActive : undefined]}
          >
            <Text style={styles.chipText}>{role.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.metaLabel}>Select Policy</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {policies.map((policy) => (
          <Pressable
            key={policy.id}
            onPress={() => setSelectedPolicyId(policy.id)}
            style={[styles.chip, selectedPolicyId === policy.id ? styles.chipActive : undefined]}
          >
            <Text style={styles.chipText}>{policy.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable style={styles.primaryButton} onPress={linkPolicyToRole}>
        <Text style={styles.primaryButtonText}>Attach Policy to Role</Text>
      </Pressable>

      {!!message && <Text style={styles.message}>{message}</Text>}

      <Text style={styles.sectionTitle}>Current Role Policies</Text>
      {rolePolicies.map((rolePolicy) => (
        <View key={rolePolicy.id} style={styles.listItem}>
          <Text style={styles.listItemMeta}>Role ID: {rolePolicy.roleId}</Text>
          <Text style={styles.listItemMeta}>Policy ID: {rolePolicy.policyId}</Text>
          <Text style={styles.listItemMeta}>Effect: {rolePolicy.effect ?? 'ALLOW'}</Text>
        </View>
      ))}
    </View>
  );
}

function AdminPortal() {
  const [tab, setTab] = useState<TabKey>('users');
  const content = useMemo(() => {
    if (tab === 'users') return <AdminUserManagement />;
    if (tab === 'departments') return <AdminDepartmentManagement />;
    return <AdminRolePoliciesManagement />;
  }, [tab]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Admin Control Center"
        subtitle="Manage users, departments, roles and policies from one place"
      />
      <AdminTabs current={tab} onChange={setTab} />
      <ScrollView style={styles.scrollContent}>{content}</ScrollView>
    </SafeAreaView>
  );
}

function FreelancerPortal() {
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const user = await getCurrentUser();
        const usersResponse = await client.models.AppUser.list({
          filter: { username: { eq: user.username } },
        });
        const currentProfile = usersResponse.data?.[0] ?? null;
        setProfile(currentProfile);
        if (!currentProfile?.id) {
          setPolicies([]);
          return;
        }

        const [userRolesResponse, rolePoliciesResponse, policiesResponse] = await Promise.all([
          client.models.UserRole.list({ filter: { userId: { eq: currentProfile.id } } }),
          client.models.RolePolicy.list(),
          client.models.Policy.list(),
        ]);

        const roleIds = new Set<string>((userRolesResponse.data ?? []).map((item: UserRole) => item.roleId));
        const policyIds = (rolePoliciesResponse.data ?? [])
          .filter((rp: RolePolicy) => roleIds.has(rp.roleId) && (rp.effect ?? 'ALLOW') === 'ALLOW')
          .map((rp: RolePolicy) => rp.policyId);

        setPolicies((policiesResponse.data ?? []).filter((policy: Policy) => policyIds.includes(policy.id)));
      } catch (loadError: unknown) {
        setError((loadError as Error).message);
      } finally {
        setLoading(false);
      }
    };

    load().catch((caughtError: unknown) => {
      setError((caughtError as Error).message);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Freelancer Workspace"
        subtitle="You can only see the modules and actions granted by admin"
      />
      {!!error && <Text style={styles.message}>{error}</Text>}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <Text style={styles.listItemMeta}>Username: {profile?.username ?? '-'}</Text>
        <Text style={styles.listItemMeta}>Email: {profile?.email ?? '-'}</Text>
        <Text style={styles.listItemMeta}>Status: {profile?.status ?? '-'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Allowed Actions</Text>
        {policies.length === 0 && <Text style={styles.listItemMeta}>No permissions assigned yet.</Text>}
        {policies.map((policy) => (
          <View key={policy.id} style={styles.listItem}>
            <Text style={styles.listItemTitle}>{policy.name}</Text>
            <Text style={styles.listItemMeta}>
              {policy.resource}:{policy.action}
            </Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

function AppShell() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingRole, setLoadingRole] = useState(true);
  const [roleError, setRoleError] = useState('');

  useEffect(() => {
    const loadRole = async () => {
      try {
        const session = await fetchAuthSession();
        const tokenPayload = session.tokens?.idToken?.payload as
          | { 'cognito:groups'?: string[] }
          | undefined;
        const groups = tokenPayload?.['cognito:groups'] ?? [];
        setIsAdmin(groups.includes('ADMIN'));
      } catch (error: unknown) {
        setRoleError((error as Error).message);
      } finally {
        setLoadingRole(false);
      }
    };

    loadRole().catch((caughtError: unknown) => {
      setRoleError((caughtError as Error).message);
      setLoadingRole(false);
    });
  }, []);

  if (loadingRole) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (roleError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Unable to load role</Text>
          <Text style={styles.paragraph}>{roleError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return isAdmin ? <AdminPortal /> : <FreelancerPortal />;
}

export default function App() {
  if (!amplifyConfig) {
    return <MissingConfigScreen />;
  }

  return (
    <Authenticator.Provider>
      <Authenticator components={{ SignIn: LockedDownSignIn }}>
        <AppShell />
      </Authenticator>
    </Authenticator.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f7fb',
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#12263a',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#4f5d75',
  },
  paragraph: {
    fontSize: 14,
    color: '#4f5d75',
  },
  authHint: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4f5d75',
  },
  codeBlock: {
    marginTop: 12,
    backgroundColor: '#0a1f33',
    color: '#d6e4f0',
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  tabButton: {
    marginRight: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#d9e3f0',
  },
  tabButtonActive: {
    backgroundColor: '#2563eb',
  },
  tabButtonText: {
    color: '#12263a',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#12263a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#c3d2e8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#f9fbfe',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginVertical: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  message: {
    color: '#9a3412',
    marginBottom: 10,
  },
  listItem: {
    borderWidth: 1,
    borderColor: '#dce5f2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#12263a',
  },
  listItemMeta: {
    fontSize: 13,
    color: '#4f5d75',
    marginTop: 2,
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
  card: {
    margin: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
  },
});
