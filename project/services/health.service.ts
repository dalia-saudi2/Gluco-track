import { Platform, Linking } from 'react-native';
import {
  HealthPermissionStatus,
  HealthTodayData,
  HealthHistoryData,
  DailyMetricValue
} from '../types/health.types';

const HEALTH_CONNECT_PACKAGE = 'com.google.android.apps.healthdata';
const HEALTH_CONNECT_PLAY_STORE =
  `https://play.google.com/store/apps/details?id=${HEALTH_CONNECT_PACKAGE}`;

const ANDROID_READ_PERMISSIONS = [
  { accessType: 'read' as const, recordType: 'Steps' as const },
  { accessType: 'read' as const, recordType: 'ActiveCaloriesBurned' as const },
  { accessType: 'read' as const, recordType: 'SleepSession' as const },
];

// Safely import native health libraries dynamically to avoid bundling crashes
let AppleHealthKit: any = null;
let HealthConnect: any = null;

if (Platform.OS === 'ios') {
  try {
    AppleHealthKit = require('react-native-health').default;
  } catch {
    console.warn('Apple HealthKit library not installed or linked.');
  }
} else if (Platform.OS === 'android') {
  try {
    HealthConnect = require('react-native-health-connect');
  } catch {
    console.warn('Android Health Connect library not installed or linked.');
  }
}

class HealthService {
  private useSimulation = false;
  private permissionStatus: HealthPermissionStatus = 'idle';
  private androidInitialized = false;
  private androidSdkStatus: number | null = null;

  constructor() {
    if (Platform.OS === 'web') {
      this.useSimulation = true;
      this.permissionStatus = 'granted';
      console.log('HealthService: Web uses simulation mode.');
      return;
    }

    if (Platform.OS === 'ios' && !AppleHealthKit) {
      this.useSimulation = true;
      this.permissionStatus = 'granted';
      console.log('HealthService: iOS HealthKit unavailable, using simulation.');
    }

    if (Platform.OS === 'android' && !HealthConnect) {
      this.useSimulation = true;
      this.permissionStatus = 'granted';
      console.log('HealthService: Health Connect module missing, using simulation.');
    }
  }

  private async ensureAndroidHealthConnect(): Promise<boolean> {
    if (!HealthConnect) return false;

    try {
      const sdkStatus = await HealthConnect.getSdkStatus();
      this.androidSdkStatus = sdkStatus;

      if (sdkStatus === HealthConnect.SdkAvailabilityStatus.SDK_UNAVAILABLE) {
        return false;
      }

      if (
        sdkStatus ===
        HealthConnect.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED
      ) {
        return false;
      }

      if (!this.androidInitialized) {
        this.androidInitialized = await HealthConnect.initialize();
      }

      return this.androidInitialized;
    } catch (error) {
      console.error('Failed to initialize Health Connect:', error);
      return false;
    }
  }

  /**
   * Check if native health provider is available on this device
   */
  async isAvailable(): Promise<boolean> {
    if (this.useSimulation) return true;

    try {
      if (Platform.OS === 'ios' && AppleHealthKit) {
        return new Promise((resolve) => {
          AppleHealthKit.isAvailable((err: any, available: boolean) => {
            if (err || !available) {
              resolve(false);
              return;
            }
            resolve(true);
          });
        });
      }

      if (Platform.OS === 'android' && HealthConnect) {
        return await this.ensureAndroidHealthConnect();
      }
    } catch (e) {
      console.error('Error checking health provider availability:', e);
    }

    return false;
  }

  needsHealthConnectInstall(): boolean {
    if (Platform.OS !== 'android' || !HealthConnect || this.androidSdkStatus === null) {
      return false;
    }
    return (
      this.androidSdkStatus === HealthConnect.SdkAvailabilityStatus.SDK_UNAVAILABLE ||
      this.androidSdkStatus ===
        HealthConnect.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED
    );
  }

  /**
   * Check permissions status
   */
  async checkPermissions(): Promise<HealthPermissionStatus> {
    if (this.useSimulation) {
      return this.permissionStatus === 'idle' ? 'denied' : this.permissionStatus;
    }

    try {
      if (Platform.OS === 'ios' && AppleHealthKit) {
        const permissions = this.getAppleHealthPermissions();
        return new Promise((resolve) => {
          AppleHealthKit.getAuthStatus(permissions, (err: any, results: any) => {
            if (err) {
              resolve('denied');
              return;
            }
            const readStatus = results.permissions?.read || [];
            const allGranted = Object.values(readStatus).every((status: any) => status === 2);
            const anyDenied = Object.values(readStatus).some((status: any) => status === 1);

            if (allGranted) {
              resolve('granted');
            } else if (anyDenied) {
              resolve('permanently_denied');
            } else {
              resolve('denied');
            }
          });
        });
      }

      if (Platform.OS === 'android' && HealthConnect) {
        const ready = await this.ensureAndroidHealthConnect();
        if (!ready) {
          return this.needsHealthConnectInstall() ? 'unavailable' : 'denied';
        }

        const granted = await HealthConnect.getGrantedPermissions();
        const hasAll = ANDROID_READ_PERMISSIONS.every((perm) =>
          granted.some(
            (g: any) =>
              g.recordType === perm.recordType && g.accessType === perm.accessType
          )
        );
        return hasAll ? 'granted' : 'denied';
      }
    } catch (e) {
      console.error('Error checking permissions:', e);
    }

    return 'unavailable';
  }

  /**
   * Request permissions from native health provider
   */
  async requestPermissions(): Promise<HealthPermissionStatus> {
    if (this.useSimulation) {
      this.permissionStatus = 'granted';
      return 'granted';
    }

    try {
      const available = await this.isAvailable();
      if (!available) {
        return this.needsHealthConnectInstall() ? 'unavailable' : 'unavailable';
      }

      if (Platform.OS === 'ios' && AppleHealthKit) {
        const permissions = this.getAppleHealthPermissions();
        return new Promise((resolve) => {
          AppleHealthKit.initHealthKit(permissions, (err: any) => {
            if (err) {
              console.error('Apple HealthKit init error:', err);
              resolve('denied');
            } else {
              this.checkPermissions().then(resolve);
            }
          });
        });
      }

      if (Platform.OS === 'android' && HealthConnect) {
        await HealthConnect.requestPermission(ANDROID_READ_PERMISSIONS);
        return await this.checkPermissions();
      }
    } catch (e) {
      console.error('Error requesting permissions:', e);
      return 'denied';
    }

    return 'unavailable';
  }

  /**
   * Launch settings panel to enable permission
   */
  async openSettings(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
        return true;
      }

      if (Platform.OS === 'android') {
        if (this.useSimulation) {
          await Linking.openSettings();
          return true;
        }

        if (HealthConnect?.openHealthConnectSettings) {
          HealthConnect.openHealthConnectSettings();
          return true;
        }

        try {
          await Linking.sendIntent('androidx.health.ACTION_HEALTH_CONNECT_SETTINGS');
          return true;
        } catch {
          await Linking.openSettings();
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to open settings:', e);
    }
    return false;
  }

  async openHealthConnectInstall(): Promise<boolean> {
    try {
      const marketUrl = `market://details?id=${HEALTH_CONNECT_PACKAGE}`;
      const canOpenMarket = await Linking.canOpenURL(marketUrl);
      await Linking.openURL(canOpenMarket ? marketUrl : HEALTH_CONNECT_PLAY_STORE);
      return true;
    } catch (e) {
      console.error('Failed to open Health Connect install page:', e);
      return false;
    }
  }

  /**
   * Fetch today's health metrics
   */
  async getTodayData(): Promise<HealthTodayData> {
    if (this.useSimulation) {
      return this.generateSimulatedToday();
    }

    try {
      const isGranted = (await this.checkPermissions()) === 'granted';
      if (!isGranted) {
        throw new Error('Permissions not granted');
      }

      let steps = 0;
      let sleepHours = 0;
      let caloriesBurned = 0;

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      if (Platform.OS === 'ios' && AppleHealthKit) {
        steps = await new Promise<number>((resolve) => {
          AppleHealthKit.getStepCount(
            { date: startOfDay.toISOString() },
            (err: any, results: any) => {
              resolve(err || !results ? 0 : results.value);
            }
          );
        });

        caloriesBurned = await new Promise<number>((resolve) => {
          AppleHealthKit.getActiveEnergyBurned(
            {
              startDate: startOfDay.toISOString(),
              endDate: endOfDay.toISOString()
            },
            (err: any, results: any) => {
              if (err || !results || results.length === 0) {
                resolve(0);
              } else {
                const total = results.reduce((sum: number, sample: any) => sum + (sample.value || 0), 0);
                resolve(Math.round(total));
              }
            }
          );
        });

        sleepHours = await new Promise<number>((resolve) => {
          AppleHealthKit.getSleepSamples(
            {
              startDate: startOfDay.toISOString(),
              endDate: endOfDay.toISOString()
            },
            (err: any, results: any) => {
              if (err || !results || results.length === 0) {
                resolve(0);
              } else {
                let totalMin = 0;
                results.forEach((sample: any) => {
                  if (sample.value === 'ASLEEP' || sample.value === 1) {
                    const start = new Date(sample.startDate).getTime();
                    const end = new Date(sample.endDate).getTime();
                    totalMin += (end - start) / (1000 * 60);
                  }
                });
                resolve(parseFloat((totalMin / 60).toFixed(1)));
              }
            }
          );
        });
      } else if (Platform.OS === 'android' && HealthConnect) {
        await this.ensureAndroidHealthConnect();

        const stepsData = await HealthConnect.readRecords('Steps', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startOfDay.toISOString(),
            endTime: endOfDay.toISOString()
          }
        });
        steps = stepsData.records.reduce((sum: number, r: any) => sum + (r.count || 0), 0);

        const caloriesData = await HealthConnect.readRecords('ActiveCaloriesBurned', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startOfDay.toISOString(),
            endTime: endOfDay.toISOString()
          }
        });
        const totalEnergy = caloriesData.records.reduce(
          (sum: number, r: any) => sum + (r.energy?.inKilocalories || 0),
          0
        );
        caloriesBurned = Math.round(totalEnergy);

        const sleepData = await HealthConnect.readRecords('SleepSession', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startOfDay.toISOString(),
            endTime: endOfDay.toISOString()
          }
        });
        let totalSleepMin = 0;
        sleepData.records.forEach((r: any) => {
          const start = new Date(r.startTime).getTime();
          const end = new Date(r.endTime).getTime();
          totalSleepMin += (end - start) / (1000 * 60);
        });
        sleepHours = parseFloat((totalSleepMin / 60).toFixed(1));
      }

      return { steps, sleepHours, caloriesBurned };
    } catch (e) {
      console.error('Error fetching today\'s health data:', e);
      throw e;
    }
  }

  /**
   * Fetch historical health data for a specified timeframe
   */
  async getHistoryData(daysCount: 7 | 30): Promise<HealthHistoryData> {
    if (this.useSimulation) {
      return this.generateSimulatedHistory(daysCount);
    }

    try {
      const isGranted = (await this.checkPermissions()) === 'granted';
      if (!isGranted) {
        throw new Error('Permissions not granted');
      }

      const steps: DailyMetricValue[] = [];
      const sleep: DailyMetricValue[] = [];
      const calories: DailyMetricValue[] = [];

      for (let i = daysCount - 1; i >= 0; i--) {
        const start = new Date();
        start.setDate(start.getDate() - i);
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setDate(end.getDate() - i);
        end.setHours(23, 59, 59, 999);

        const dateStr = start.toISOString().split('T')[0];

        let dailySteps = 0;
        let dailyCalories = 0;
        let dailySleep = 0;

        if (Platform.OS === 'ios' && AppleHealthKit) {
          dailySteps = await new Promise<number>((resolve) => {
            AppleHealthKit.getStepCount(
              { date: start.toISOString() },
              (err: any, results: any) => {
                resolve(err || !results ? 0 : results.value);
              }
            );
          });

          dailyCalories = await new Promise<number>((resolve) => {
            AppleHealthKit.getActiveEnergyBurned(
              {
                startDate: start.toISOString(),
                endDate: end.toISOString()
              },
              (err: any, results: any) => {
                if (err || !results) resolve(0);
                else {
                  const sum = results.reduce((tot: number, s: any) => tot + (s.value || 0), 0);
                  resolve(Math.round(sum));
                }
              }
            );
          });

          dailySleep = await new Promise<number>((resolve) => {
            AppleHealthKit.getSleepSamples(
              {
                startDate: start.toISOString(),
                endDate: end.toISOString()
              },
              (err: any, results: any) => {
                if (err || !results || results.length === 0) {
                  resolve(0);
                } else {
                  let totalMin = 0;
                  results.forEach((sample: any) => {
                    if (sample.value === 'ASLEEP' || sample.value === 1) {
                      const sTime = new Date(sample.startDate).getTime();
                      const eTime = new Date(sample.endDate).getTime();
                      totalMin += (eTime - sTime) / (1000 * 60);
                    }
                  });
                  resolve(parseFloat((totalMin / 60).toFixed(1)));
                }
              }
            );
          });
        } else if (Platform.OS === 'android' && HealthConnect) {
          await this.ensureAndroidHealthConnect();

          const stepsData = await HealthConnect.readRecords('Steps', {
            timeRangeFilter: {
              operator: 'between',
              startTime: start.toISOString(),
              endTime: end.toISOString()
            }
          });
          dailySteps = stepsData.records.reduce((sum: number, r: any) => sum + (r.count || 0), 0);

          const caloriesData = await HealthConnect.readRecords('ActiveCaloriesBurned', {
            timeRangeFilter: {
              operator: 'between',
              startTime: start.toISOString(),
              endTime: end.toISOString()
            }
          });
          dailyCalories = Math.round(
            caloriesData.records.reduce(
              (sum: number, r: any) => sum + (r.energy?.inKilocalories || 0),
              0
            )
          );

          const sleepData = await HealthConnect.readRecords('SleepSession', {
            timeRangeFilter: {
              operator: 'between',
              startTime: start.toISOString(),
              endTime: end.toISOString()
            }
          });
          let totalSleepMin = 0;
          sleepData.records.forEach((r: any) => {
            const sTime = new Date(r.startTime).getTime();
            const eTime = new Date(r.endTime).getTime();
            totalSleepMin += (eTime - sTime) / (1000 * 60);
          });
          dailySleep = parseFloat((totalSleepMin / 60).toFixed(1));
        }

        steps.push({ date: dateStr, value: dailySteps });
        calories.push({ date: dateStr, value: dailyCalories });
        sleep.push({ date: dateStr, value: dailySleep });
      }

      return { steps, sleep, calories };
    } catch (e) {
      console.error(`Error fetching history health data (${daysCount}d):`, e);
      throw e;
    }
  }

  private getAppleHealthPermissions() {
    return {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.Steps,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.SleepAnalysis
        ],
        write: []
      }
    };
  }

  public isSimulated(): boolean {
    return this.useSimulation;
  }

  public isNativeAndroid(): boolean {
    return Platform.OS === 'android' && !this.useSimulation && !!HealthConnect;
  }

  public setSimulationMode(enabled: boolean) {
    this.useSimulation = enabled;
    if (enabled) {
      this.permissionStatus = 'granted';
    }
  }

  private generateSimulatedToday(): HealthTodayData {
    const hour = new Date().getHours();
    const progressFactor = Math.min(hour / 18, 1.0);
    const seed = new Date().getDate();
    const sleepSeed = (seed % 5) * 0.4 + 5.8;
    const stepsSeed = Math.round((seed % 6) * 1200 + 5200);
    const kcalSeed = Math.round(stepsSeed * 0.045);

    return {
      sleepHours: sleepSeed,
      steps: Math.round(stepsSeed * progressFactor),
      caloriesBurned: Math.round(kcalSeed * progressFactor)
    };
  }

  private generateSimulatedHistory(daysCount: number): HealthHistoryData {
    const steps: DailyMetricValue[] = [];
    const sleep: DailyMetricValue[] = [];
    const calories: DailyMetricValue[] = [];

    const now = new Date();

    for (let i = daysCount; i >= 1; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayFactor = date.getDate();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      let dailySteps = 6000 + (dayFactor % 7) * 800;
      let dailySleep = 6.2 + (dayFactor % 5) * 0.5;

      if (isWeekend) {
        dailySteps = Math.max(3000, dailySteps - 1500);
        dailySleep = Math.min(9.0, dailySleep + 1.2);
      }

      const dailyCalories = Math.round(dailySteps * 0.042 + (dayFactor % 4) * 30);

      steps.push({ date: dateStr, value: dailySteps });
      sleep.push({ date: dateStr, value: parseFloat(dailySleep.toFixed(1)) });
      calories.push({ date: dateStr, value: dailyCalories });
    }

    return { steps, sleep, calories };
  }
}

export const healthService = new HealthService();
