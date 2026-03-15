import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { authenticatorTextUtil } from '@aws-amplify/ui';
import { Authenticator, type SignInProps } from '@aws-amplify/ui-react-native';
import { DefaultContent } from '@aws-amplify/ui-react-native/lib/Authenticator/common';
import { useFieldValues } from '@aws-amplify/ui-react-native/lib/Authenticator/hooks';
import 'react-native-url-polyfill/auto';
import { AppShell } from './src/AppShell';
import { amplifyConfig } from './src/lib/amplifyClient';
import { StripeProviderBridge } from './src/lib/StripeProviderBridge.native';
import { MissingConfigScreen } from './src/screens/MissingConfigScreen';
import { AppThemeProvider } from './src/theme/AppThemeContext';

const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

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
    <View style={styles.authScreen}>
      <View style={styles.authOrbPrimary} />
      <View style={styles.authOrbSecondary} />
      <View style={styles.authGridGlow} />

      <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.authHeroPanel}>
          <Text style={styles.authBrandEyebrow}>JAMA GO</Text>
          <Text style={styles.authBrandTitle}>Security commerce, delivery, and warranty operations in one refined workspace.</Text>
          <Text style={styles.authBrandText}>Sign in to manage products, monitor orders, issue documents, and keep every customer handoff professional.</Text>
        </View>

        <View style={styles.authCard}>
          <DefaultContent
            {...rest}
            body={
              <Text style={styles.authHint}>
                Account creation and password resets are managed by an administrator. The first admin user must be created manually in Cognito and added to the ADMIN group.
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
            Footer={() => (
              <View style={styles.authFooter}>
                <Text style={styles.authFooterText}>Protected access for administrators and freelancers only.</Text>
              </View>
            )}
            FormFields={Authenticator.SignIn.FormFields}
            Header={() => (
              <View style={styles.authCardHeader}>
                <Text style={styles.authCardEyebrow}>{getSignInTabText()}</Text>
                <Text style={styles.authCardTitle}>Welcome back</Text>
                <Text style={styles.authCardSubtitle}>Use your assigned credentials to enter the operations workspace.</Text>
              </View>
            )}
            headerText={getSignInTabText()}
            validationErrors={fieldValidationErrors}
          />
        </View>
      </ScrollView>
    </View>
  );
}

export default function App() {
  return (
    <StripeProviderBridge publishableKey={stripePublishableKey}>
      <SafeAreaProvider>
        <AppThemeProvider>
          {!amplifyConfig ? (
            <MissingConfigScreen />
          ) : (
            <Authenticator.Provider>
              <Authenticator components={{ SignIn: LockedDownSignIn }}>
                <AppShell />
              </Authenticator>
            </Authenticator.Provider>
          )}
        </AppThemeProvider>
      </SafeAreaProvider>
    </StripeProviderBridge>
  );
}

const styles = StyleSheet.create({
  authScreen: {
    flex: 1,
    backgroundColor: '#eef5ff',
  },
  authOrbPrimary: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(21, 101, 192, 0.18)',
    top: -120,
    right: -110,
  },
  authOrbSecondary: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(247, 148, 29, 0.15)',
    left: -70,
    bottom: 40,
  },
  authGridGlow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  authScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 36,
    gap: 18,
  },
  authHeroPanel: {
    borderRadius: 28,
    padding: 24,
    backgroundColor: '#0c356f',
    overflow: 'hidden',
  },
  authBrandEyebrow: {
    color: '#f7c37b',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  authBrandTitle: {
    marginTop: 10,
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  authBrandText: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 22,
  },
  authCard: {
    borderRadius: 26,
    backgroundColor: '#ffffff',
    padding: 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  authCardHeader: {
    marginBottom: 8,
  },
  authCardEyebrow: {
    color: '#1565C0',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  authCardTitle: {
    marginTop: 8,
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '900',
  },
  authCardSubtitle: {
    marginTop: 6,
    color: '#5b6880',
    fontSize: 14,
    lineHeight: 20,
  },
  authHint: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: '#4f5d75',
  },
  authFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e6edf7',
  },
  authFooterText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },
});
