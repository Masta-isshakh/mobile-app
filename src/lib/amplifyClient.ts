import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

declare const require: (path: string) => unknown;

export const amplifyConfig = (() => {
  try {
    return require('../../amplify_outputs.json');
  } catch {
    return null;
  }
})();

if (amplifyConfig) {
  Amplify.configure(amplifyConfig);
}

export const client = generateClient<Schema>() as any;
