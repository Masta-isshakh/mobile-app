import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SuccessPopup } from '../../components/SuccessPopup';
import { client } from '../../lib/amplifyClient';
import type { Department, PermissionCheck } from '../../types';

type Props = {
  can: PermissionCheck;
};

export function DepartmentManagementScreen({ can }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [successPopup, setSuccessPopup] = useState({ visible: false, title: '', description: '' });

  const loadDepartments = useCallback(async () => {
    const response = await client.models.Department.list();
    setDepartments(response.data ?? []);
  }, []);

  useEffect(() => {
    loadDepartments().catch((error: unknown) => setMessage((error as Error).message));
  }, [loadDepartments]);

  const createDepartment = useCallback(async () => {
    if (!can('departments', 'create')) {
      setMessage('You do not have permission to create departments.');
      return;
    }
    if (!name.trim()) {
      setMessage('Department name is required.');
      return;
    }

    try {
      setIsCreating(true);
      await client.models.Department.create({
        name: name.trim(),
        description: description.trim(),
        isActive: true,
      });
      setName('');
      setDescription('');
      setMessage('Department created.');
      setSuccessPopup({ visible: true, title: 'Department Created', description: 'The department has been created successfully.' });
      await loadDepartments();
    } catch (error: unknown) {
      setMessage((error as Error).message);
    } finally {
      setIsCreating(false);
    }
  }, [can, description, loadDepartments, name]);

  const startEdit = useCallback((department: Department) => {
    setEditingId(department.id);
    setName(department.name);
    setDescription(department.description ?? '');
    setMessage('');
  }, []);

  const saveEdit = useCallback(async () => {
    if (!can('departments', 'edit')) {
      setMessage('You do not have permission to edit departments.');
      return;
    }
    if (!editingId) {
      return;
    }

    try {
      setIsSaving(true);
      await client.models.Department.update({
        id: editingId,
        name: name.trim(),
        description: description.trim(),
      });
      setEditingId('');
      setName('');
      setDescription('');
      setMessage('Department updated.');
      setSuccessPopup({ visible: true, title: 'Department Updated', description: 'Department changes were saved successfully.' });
      await loadDepartments();
    } catch (error: unknown) {
      setMessage((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }, [can, description, editingId, loadDepartments, name]);

  const deleteDepartment = useCallback(
    async (id: string) => {
      if (!can('departments', 'delete')) {
        setMessage('You do not have permission to delete departments.');
        return;
      }
      try {
        setDeletingId(id);
        await client.models.Department.delete({ id });
        setMessage('Department deleted.');
        setSuccessPopup({ visible: true, title: 'Department Deleted', description: 'The department was removed successfully.' });
        await loadDepartments();
      } catch (error: unknown) {
        setMessage((error as Error).message);
      } finally {
        setDeletingId('');
      }
    },
    [can, loadDepartments],
  );

  return (
    <ScrollView contentContainerStyle={styles.contentWrap}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{editingId ? 'Edit Department' : 'Create Department'}</Text>
        <TextInput
          style={styles.input}
          value={name}
          placeholder="Department name"
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          value={description}
          placeholder="Description"
          onChangeText={setDescription}
        />

        {editingId ? (
          <View style={styles.rowWrap}>
            <Pressable
              style={[styles.primaryButton, styles.flexButton, !can('departments', 'edit') ? styles.buttonDisabled : undefined]}
              onPress={() => void saveEdit()}
              disabled={!can('departments', 'edit') || isSaving}
            >
              <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, styles.flexButton]}
              onPress={() => {
                setEditingId('');
                setName('');
                setDescription('');
              }}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.primaryButton, !can('departments', 'create') ? styles.buttonDisabled : undefined]}
            onPress={() => void createDepartment()}
            disabled={!can('departments', 'create') || isCreating}
          >
            <Text style={styles.primaryButtonText}>{isCreating ? 'Creating...' : 'Create Department'}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Departments</Text>
        {departments.map((department) => (
          <View key={department.id} style={styles.listItem}>
            <Text style={styles.listItemTitle}>{department.name}</Text>
            <Text style={styles.listItemMeta}>{department.description || '-'}</Text>

            <View style={styles.rowWrap}>
              <Pressable
                style={[styles.secondaryButton, styles.flexButton, !can('departments', 'edit') ? styles.buttonDisabled : undefined]}
                onPress={() => startEdit(department)}
                disabled={!can('departments', 'edit')}
              >
                <Text style={styles.secondaryButtonText}>Edit</Text>
              </Pressable>
              <Pressable
                style={[styles.dangerButton, styles.flexButton, !can('departments', 'delete') ? styles.buttonDisabled : undefined]}
                onPress={() => void deleteDepartment(department.id)}
                disabled={!can('departments', 'delete') || deletingId === department.id}
              >
                <Text style={styles.dangerButtonText}>{deletingId === department.id ? 'Deleting...' : 'Delete'}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      {!!message && <Text style={styles.message}>{message}</Text>}

      <SuccessPopup
        visible={successPopup.visible}
        title={successPopup.title}
        description={successPopup.description}
        onClose={() => setSuccessPopup({ visible: false, title: '', description: '' })}
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
  rowWrap: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  flexButton: {
    flex: 1,
  },
});
