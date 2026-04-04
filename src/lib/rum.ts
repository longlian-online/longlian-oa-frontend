import { openobserveRum } from '@openobserve/browser-rum';
import { openobserveLogs } from '@openobserve/browser-logs';

const options = {
  clientToken: import.meta.env.VITE_RUM_TOKEN,
  applicationId: __APP_NAME__,
  site: import.meta.env.VITE_RUM_SITE,
  service: __APP_NAME__,
  env: import.meta.env.MODE,
  version: __APP_VERSION__,
  organizationIdentifier: import.meta.env.VITE_RUM_ORG,
  insecureHTTP: false,
  apiVersion: 'v1',
};

openobserveRum.init({
  applicationId: options.applicationId, // required, any string identifying your application
  clientToken: options.clientToken,
  site: options.site,
  organizationIdentifier: options.organizationIdentifier,
  service: options.service,
  env: options.env,
  version: options.version,
  trackResources: true,
  trackLongTasks: true,
  trackUserInteractions: true,
  apiVersion: options.apiVersion,
  insecureHTTP: options.insecureHTTP,
  defaultPrivacyLevel: 'allow', // 'allow' or 'mask-user-input' or 'mask'. Use one of the 3 values.
  sessionSampleRate: 100, // Track 100% of sessions
  sessionReplaySampleRate: 50, // Record 50% of sessions
});

openobserveLogs.init({
  clientToken: options.clientToken,
  site: options.site,
  organizationIdentifier: options.organizationIdentifier,
  service: options.service,
  env: options.env,
  version: options.version,
  forwardErrorsToLogs: true,
  insecureHTTP: options.insecureHTTP,
  apiVersion: options.apiVersion,
});

// test user and recording
openobserveRum.setUser({
  id: "1",
  name: "Captain Hook",
  email: "captainhook@example.com",
});

openobserveRum.startSessionReplayRecording();
