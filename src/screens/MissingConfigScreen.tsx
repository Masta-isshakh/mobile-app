import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function MissingConfigScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Amplify is not configured yet</Text>
        <Text style={styles.paragraph}>Deploy your backend first, then regenerate outputs in this project.</Text>
        <Text style={styles.code}>npx ampx sandbox</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#12263a',
  },
  paragraph: {
    marginTop: 8,
    fontSize: 14,
    color: '#4f5d75',
  },
  code: {
    marginTop: 14,
    backgroundColor: '#0a1f33',
    color: '#d6e4f0',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
  },
});
