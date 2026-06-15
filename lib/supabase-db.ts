import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Database Helper Library
 * Provides a simple interface for common database operations
 */

export interface QueryOptions {
  select?: string;
  eq?: Record<string, any>;
  limit?: number;
  order?: { column: string; ascending?: boolean };
  single?: boolean;
}

export class SupabaseDB {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Find a single record by ID
   */
  async findById<T>(table: string, id: string): Promise<T | null> {
    const { data, error } = await this.client
      .from(table)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as T | null;
  }

  /**
   * Find a single record by conditions
   */
  async findOne<T>(table: string, where: Record<string, any>): Promise<T | null> {
    let query = this.client.from(table).select('*');

    for (const [key, value] of Object.entries(where)) {
      query = query.eq(key, value);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data as T | null;
  }

  /**
   * Find many records with optional filtering
   */
  async findMany<T>(
    table: string,
    where?: Record<string, any>,
    options?: { limit?: number; order?: { column: string; ascending?: boolean } }
  ): Promise<T[]> {
    let query = this.client.from(table).select('*');

    if (where) {
      for (const [key, value] of Object.entries(where)) {
        query = query.eq(key, value);
      }
    }

    if (options?.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as T[];
  }

  /**
   * Create a new record
   */
  async create<T>(table: string, data: Partial<T>): Promise<T> {
    const { data: result, error } = await this.client
      .from(table)
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return result as T;
  }

  /**
   * Update a record by ID
   */
  async update<T>(table: string, id: string, data: Partial<T>): Promise<T> {
    const { data: result, error } = await this.client
      .from(table)
      .update({ ...data, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result as T;
  }

  /**
   * Delete a record by ID
   */
  async delete(table: string, id: string): Promise<void> {
    const { error } = await this.client.from(table).delete().eq('id', id);
    if (error) throw error;
  }

  /**
   * Upsert a record (insert or update)
   */
  async upsert<T>(table: string, data: T & { id: string }): Promise<T> {
    const { data: result, error } = await this.client
      .from(table)
      .upsert([{ ...data, updatedAt: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw error;
    return result as T;
  }

  /**
   * Count records in a table
   */
  async count(table: string, where?: Record<string, any>): Promise<number> {
    let query = this.client.from(table).select('count()', { count: 'exact' });

    if (where) {
      for (const [key, value] of Object.entries(where)) {
        query = query.eq(key, value);
      }
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  /**
   * Execute a raw SQL query
   */
  async rawQuery<T>(sql: string, params?: any[]): Promise<T[]> {
    const { data, error } = await this.client.rpc('execute_query', {
      query: sql,
      params: params || [],
    });

    if (error) throw error;
    return (data || []) as T[];
  }

  /**
   * Get the underlying Supabase client for advanced queries
   */
  getClient(): SupabaseClient {
    return this.client;
  }
}

/**
 * Create a SupabaseDB instance from a Supabase client
 */
export function createDB(client: SupabaseClient): SupabaseDB {
  return new SupabaseDB(client);
}
