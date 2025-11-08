//lib/databaseSetup.ts
import { supabase } from '@/lib/supabase/client'

export const setupDatabase = async () => {
  try {
    console.log('Starting database setup...')
    
    // Create tables if they don't exist
    await createTables()
    
    // Set up Row Level Security policies
    await setupRLSPolicies()
    
    console.log('Database setup completed successfully')
  } catch (error) {
    console.error('Error setting up database:', error)
  }
}

const createTables = async () => {
  // Create user_preferences table
  const { error: preferencesError } = await supabase.rpc('create_preferences_table', {})
  if (preferencesError && !preferencesError.message.includes('already exists')) {
    console.error('Error creating preferences table:', preferencesError)
  }

  // Create focus_sessions table
  const { error: sessionsError } = await supabase.rpc('create_sessions_table', {})
  if (sessionsError && !sessionsError.message.includes('already exists')) {
    console.error('Error creating sessions table:', sessionsError)
  }

  // Create task_categories table
  const { error: categoriesError } = await supabase.rpc('create_categories_table', {})
  if (categoriesError && !categoriesError.message.includes('already exists')) {
    console.error('Error creating categories table:', categoriesError)
  }

  // Create user_conversations table
  const { error: conversationsError } = await supabase.rpc('create_conversations_table', {})
  if (conversationsError && !conversationsError.message.includes('already exists')) {
    console.error('Error creating conversations table:', conversationsError)
  }
}

const setupRLSPolicies = async () => {
  // Enable RLS on all tables
  await enableRLS('user_preferences')
  await enableRLS('focus_sessions')
  await enableRLS('task_categories')
  await enableRLS('tasks')
  await enableRLS('recurring_tasks')
  await enableRLS('user_conversations')


  // Create policies only if they don't exist
  await createPolicyIfNotExists(
    'user_preferences',
    'Users can manage own preferences',
    'FOR ALL USING (auth.uid() = user_id)'
  )

  await createPolicyIfNotExists(
    'focus_sessions',
    'Users can manage own focus sessions',
    'FOR ALL USING (auth.uid() = user_id)'
  )

  await createPolicyIfNotExists(
    'task_categories',
    'Users can manage own categories',
    'FOR ALL USING (auth.uid() = user_id)'
  )

  await createPolicyIfNotExists(
    'tasks',
    'Users can manage their own tasks',
    'FOR ALL USING (auth.uid() = user_id)'
  )

  await createPolicyIfNotExists(
    'recurring_tasks',
    'Users can manage their own recurring tasks',
    'FOR ALL USING (auth.uid() = user_id)'
  )

  await createPolicyIfNotExists(
    'user_conversations',
    'Users can manage their own conversations',
    'FOR ALL USING (auth.uid() = user_id)'
  )
}

const enableRLS = async (tableName: string) => {
  const { error } = await supabase.rpc('enable_rls', { table_name: tableName })
  if (error && !error.message.includes('already enabled')) {
    console.error(`Error enabling RLS on ${tableName}:`, error)
  }
}

const createPolicyIfNotExists = async (tableName: string, policyName: string, policyDefinition: string) => {
  // Check if policy exists
  const { data: existingPolicies, error: checkError } = await supabase
    .from('pg_policies')
    .select('polname')
    .eq('tablename', tableName)
    .eq('polname', policyName.toLowerCase().replace(/ /g, '_'))
  
  if (checkError) {
    console.error(`Error checking for policy ${policyName}:`, checkError)
    return
  }
  
  // Create policy if it doesn't exist
  if (!existingPolicies || existingPolicies.length === 0) {
    const { error } = await supabase.rpc('create_policy', {
      table_name: tableName,
      policy_name: policyName,
      policy_definition: policyDefinition
    })
    
    if (error) {
      console.error(`Error creating policy ${policyName}:`, error)
    } else {
      console.log(`Created policy ${policyName} on ${tableName}`)
    }
  } else {
    console.log(`Policy ${policyName} already exists on ${tableName}`)
  }
}