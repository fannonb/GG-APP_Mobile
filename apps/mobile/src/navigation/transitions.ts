import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'

/** Forms and payment steps rise from the bottom: "a task you'll come back from". */
export const TASK_SCREEN: NativeStackNavigationOptions = { animation: 'slide_from_bottom' }

/** Confirmation and success screens fade in place instead of sliding. */
export const RESULT_SCREEN: NativeStackNavigationOptions = { animation: 'fade' }
