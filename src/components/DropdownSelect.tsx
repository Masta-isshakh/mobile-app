import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type DropdownOption = {
  label: string;
  value: string;
};

type Props = {
  label: string;
  value: string;
  placeholder: string;
  options: DropdownOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function DropdownSelect({
  label,
  value,
  placeholder,
  options,
  disabled = false,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    return options.find((option) => option.value === value)?.label ?? '';
  }, [options, value]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => {
          if (!disabled) {
            setOpen(true);
          }
        }}
        style={[styles.trigger, disabled ? styles.triggerDisabled : undefined]}
      >
        <Text style={[styles.triggerText, !selectedLabel ? styles.placeholderText : undefined]}>
          {selectedLabel || placeholder}
        </Text>
        <Text style={styles.chevron}>v</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    style={[styles.optionRow, active ? styles.optionRowActive : undefined]}
                  >
                    <Text style={[styles.optionText, active ? styles.optionTextActive : undefined]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#243447',
    marginBottom: 6,
  },
  trigger: {
    borderWidth: 1,
    borderColor: '#d4deeb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fbff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerDisabled: {
    opacity: 0.55,
  },
  triggerText: {
    color: '#152238',
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderText: {
    color: '#7a8aa0',
    fontWeight: '500',
  },
  chevron: {
    color: '#4b5d7a',
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 15, 30, 0.46)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  sheet: {
    width: '100%',
    maxHeight: 420,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10253f',
    marginBottom: 10,
  },
  optionRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe4f2',
    paddingVertical: 11,
    paddingHorizontal: 10,
    marginBottom: 8,
    backgroundColor: '#f9fbff',
  },
  optionRowActive: {
    backgroundColor: '#e0ebff',
    borderColor: '#3972ff',
  },
  optionText: {
    color: '#1e2d47',
    fontSize: 14,
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#1537a4',
  },
});
