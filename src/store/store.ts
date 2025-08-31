import { configureStore } from '@reduxjs/toolkit'
import themeReducer from './features/theme/theme-slice'
import tasksReducer from './features/tasks/tasks-slice'
import displayReducer from './features/display/display-slice'

import { tasksApi } from './api/tasksApi'
import { profilesApi } from './api/profilesApi'

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    tasks: tasksReducer,
    display: displayReducer,
    [tasksApi.reducerPath]: tasksApi.reducer,
    [profilesApi.reducerPath]: profilesApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      tasksApi.middleware,
      profilesApi.middleware,
    ),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
