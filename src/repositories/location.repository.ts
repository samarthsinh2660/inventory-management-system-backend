import { db } from '../database/db.ts';
import { Location, LocationCreateParams, LocationUpdateParams } from '../models/locations.model.ts';
import { ResultSetHeader } from 'mysql2';
import { ERRORS } from '../utils/error.ts';
import { Pool } from 'mysql2/promise';


export class LocationRepository {
    private getPool(req?: any): Pool {
      return req?.factoryPool || db;
    }
  /**
   * Find a location by its ID
   */
  async findById(id: number, req?: any): Promise<Location | null> {
    const pool = this.getPool(req);
    const [locations] = await pool.execute(
      'SELECT * FROM Locations WHERE id = ?',
      [id]
    ) as [Location[], any];

    return locations.length ? locations[0] : null;
  }

  /**
   * Find a location by name
   */
  async findByName(name: string, req?: any): Promise<Location | null> {
    const pool = this.getPool(req);
    const [locations] = await pool.execute(
      'SELECT * FROM Locations WHERE name = ?',
      [name]
    ) as [Location[], any];

    return locations.length ? locations[0] : null;
  }

  /**
   * Get all locations
   */
  async getAllLocations(req?: any): Promise<Location[]> {
    const pool = this.getPool(req);
    const [locations] = await pool.execute(
      'SELECT * FROM Locations ORDER BY name'
    ) as [Location[], any];

    return locations;
  }

  /**
   * Create a new location
   */
  async create(location: LocationCreateParams, req?: any): Promise<Location> {
    const { name, address, factory_id } = location;

    // Check for duplicate location name
    const [existingLocations] = await this.getPool(req).execute(
      'SELECT id FROM Locations WHERE name = ?',
      [name]
    ) as [any[], any];

    if (existingLocations.length > 0) {
      throw ERRORS.DUPLICATE_RESOURCE;
    }

    const [result] = await this.getPool(req).execute(
      'INSERT INTO Locations (name, address, factory_id) VALUES (?, ?, ?)',
      [name, address || null, factory_id === undefined ? 1 : factory_id]
    ) as [ResultSetHeader, any];

    return this.findById(result.insertId, req) as Promise<Location>;
  }

  /**
   * Update location
   */
  async update(id: number, locationData: LocationUpdateParams, req?: any): Promise<Location> {
    const { name, address, factory_id } = locationData;

    // Check if the location exists
    const location = await this.findById(id, req);
    if (!location) {
      throw ERRORS.RESOURCE_NOT_FOUND;
    }

    // If name is being updated, check for duplicates
    if (name && name !== location.name) {
      const [existingLocations] = await this.getPool(req).execute(
        'SELECT id FROM Locations WHERE name = ? AND id != ?',
        [name, id]
      ) as [any[], any];

      if (existingLocations.length > 0) {
        throw ERRORS.DUPLICATE_RESOURCE;
      }
    }

    // Build dynamic update query
    let query = 'UPDATE Locations SET ';
    const params: any[] = [];

    if (name !== undefined) {
      query += 'name = ?, ';
      params.push(name);
    }

    if (address !== undefined) {
      query += 'address = ?, ';
      params.push(address);
    }

    if (factory_id !== undefined) {
      query += 'factory_id = ?, ';
      params.push(factory_id);
    }

    // Remove trailing comma and space
    query = query.slice(0, -2);
    query += ' WHERE id = ?';
    params.push(id);

    await this.getPool(req).execute(query, params);

    return this.findById(id, req) as Promise<Location>;
  }

  /**
   * Delete a location
   */
  async deleteLocation(id: number, req?: any): Promise<boolean> {
    // Check if location exists
    const location = await this.findById(id, req);
    if (!location) {
      throw ERRORS.RESOURCE_NOT_FOUND;
    }
    
    // Check if location is in use by any products
    const [productsUsingLocation] = await this.getPool(req).execute(
      'SELECT COUNT(*) as count FROM Products WHERE location_id = ?',
      [id]
    ) as [any[], any];
    
    if (productsUsingLocation[0].count > 0) {
      throw ERRORS.LOCATION_IN_USE;
    }

    const [result] = await this.getPool(req).execute(
      'DELETE FROM Locations WHERE id = ?',
      [id]
    ) as [ResultSetHeader, any];

    return result.affectedRows > 0;
  }
}

export const locationRepository = new LocationRepository();
