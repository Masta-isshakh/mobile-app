import { StyleSheet, Text } from 'react-native';
import { authenticatorTextUtil } from '@aws-amplify/ui';
import { Authenticator, type SignInProps } from '@aws-amplify/ui-react-native';
import { DefaultContent } from '@aws-amplify/ui-react-native/lib/Authenticator/common';
import { useFieldValues } from '@aws-amplify/ui-react-native/lib/Authenticator/hooks';
import { AppShell } from './src/AppShell';
import { amplifyConfig } from './src/lib/amplifyClient';
import { MissingConfigScreen } from './src/screens/MissingConfigScreen';

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
          be created manually in Cognito and added to the ADMIN group.
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
  authHint: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4f5d75',
  },
});
