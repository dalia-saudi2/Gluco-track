import { playBundledSound } from './playBundledSound';

const REMINDER_SOUND = require('../assets/sounds/reminder.mp3');

/** Medication reminder voice — plays when a dose is due or the bell is tapped. */
export async function playReminderSound(): Promise<void> {
  try {
    await playBundledSound(REMINDER_SOUND, 1);
  } catch (error) {
    console.warn('Reminder sound failed:', error);
  }
}
