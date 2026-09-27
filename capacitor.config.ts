import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.emd.app',
  appName: 'e-md',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
}

export default config
