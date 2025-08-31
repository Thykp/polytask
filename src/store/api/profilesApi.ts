import { supabase } from '~/lib/supabase'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Profile {
  id: string
  email: string
  name?: string
  avatar_url?: string
}

export const profilesApi = createApi({
  reducerPath: 'profilesApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Profiles'],
  endpoints: (builder) => ({
    listProfiles: builder.query<Profile[], void>({
      async queryFn() {
        const { data, error } = await supabase.from('profiles').select('*')
        if (error) return { error }
        return { data: data as Profile[] }
      },
      providesTags: ['Profiles'],
    }),
  }),
})

export const { useListProfilesQuery } = profilesApi
