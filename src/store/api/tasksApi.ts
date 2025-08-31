import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import { supabase } from '~/lib/supabase'

export type Task = {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee_email?: string
  created_by: string
  created_at?: string
  updated_at?: string
}

export const tasksApi = createApi({
  reducerPath: 'tasksApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Tasks'],
  endpoints: (b) => ({
    listTasks: b.query<Task[], void>({
      async queryFn() {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) return { error }
        return { data: (data ?? []) as Task[] }
      },
      providesTags: (res) =>
        res
          ? [
              ...res.map((t) => ({ type: 'Tasks' as const, id: t.id })),
              { type: 'Tasks' as const, id: 'LIST' },
            ]
          : [{ type: 'Tasks' as const, id: 'LIST' }],
    }),

    createTask: b.mutation<Task, Omit<Task, 'id' | 'created_at' | 'updated_at'>>({
      async queryFn(body) {
        const { data, error } = await supabase.from('tasks').insert(body).select('*').single()
        if (error) return { error }
        return { data: data as Task }
      },
      invalidatesTags: [{ type: 'Tasks', id: 'LIST' }],
    }),

    updateTask: b.mutation<Task, { id: string } & Partial<Task>>({
      async queryFn({ id, ...patch }) {
        const { data, error } = await supabase
          .from('tasks')
          .update(patch)
          .eq('id', id)
          .select('*')
          .single()
        if (error) return { error }
        return { data: data as Task }
      },
      invalidatesTags: (r) => (r ? [{ type: 'Tasks', id: r.id }] : []),
    }),

    deleteTask: b.mutation<{ id: string }, { id: string }>({
      async queryFn({ id }) {
        const { error } = await supabase.from('tasks').delete().eq('id', id)
        if (error) return { error }
        return { data: { id } }
      },
      invalidatesTags: [{ type: 'Tasks', id: 'LIST' }],
    }),
  }),
})

export const {
  useListTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} = tasksApi
