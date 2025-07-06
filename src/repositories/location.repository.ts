import { db } from '../database/db.ts';
import { Location, LocationCreateParams, LocationUpdateParams } from '../models/locations.model.ts';
import { ResultSetHeader } from 'mysql2';
import { ERRORS } from '../utils/error.ts';

export class LocationRepository {
  /**
   * Find a location by its ID
   */
  async findById(id: number): Promise<Location | null> {
    const [locations] = await db.execute(
      'SELECT * FROM Locations WHERE id = ?',
      [id]
    ) as [Location[], any];

    return locations.length ? locations[0] : null;
  }

  /**
   * Find a location by name
   */
  async findByName(name: string): Promise<Location | null> {
    const [locations] = await db.execute(
      'SELECT * FROM Locations WHERE name = ?',
      [name]
    ) as [Location[], any];

    return locations.length ? locations[0] : null;
  }

  /**
   * Get all locations
   */
  async getAllLocations(): Promise<Location[]> {
    const [locations] = await db.execute(
      'SELECT * FROM Locations ORDER BY name'
    ) as [Location[], any];

    return locations;
  }

  /**
   * Create a new location
   */
  async create(location: LocationCreateParams): Promise<Location> {
    const { name, address, factory_id } = location;

    // Check for duplicate location name
    const [existingLocations] = await db.execute(
      'SELECT id FROM Locations WHERE name = ?',
      [name]
    ) as [any[], any];

    if (existingLocations.length > 0) {
      throw ERRORS.DUPLICATE_RESOURCE;
    }

    const [result] = await db.execute(
      'INSERT INTO Locations (name, address, factory_id) VALUES (?, ?, ?)',
      [name, address || null, factory_id === undefined ? 1 : factory_id]
    ) as [ResultSetHeader, any];

    return this.findById(result.insertId) as Promise<Location>;
  }

  /**
   * Update location
   */
  async update(id: number, locationData: LocationUpdateParams): Promise<Location> {
    const { name, address, factory_id } = locationData;

    // Check if the location exists
    const location = await this.findById(id);
    if (!location) {
      throw ERRORS.RESOURCE_NOT_FOUND;
    }

    // If name is being updated, check for duplicates
    if (name && name !== location.name) {
      const [existingLocations] = await db.execute(
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

    await db.execute(query, params);

    return this.findById(id) as Promise<Location>;
  }

  /**
   * Delete a location
   */
  async deleteLocation(id: number): Promise<boolean> {
    // Check if location exists
    const location = await this.findById(id);
    if (!location) {
      throw ERRORS.RESOURCE_NOT_FOUND;
    }
    
    // Check if location is in use by any products
    const [productsUsingLocation] = await db.execute(
      'SELECT COUNT(*) as count FROM Products WHERE location_id = ?',
      [id]
    ) as [any[], any];
    
    if (productsUsingLocation[0].count > 0) {
      throw ERRORS.LOCATION_IN_USE;
    }

    const [result] = await db.execute(
      'DELETE FROM Locations WHERE id = ?',
      [id]
    ) as [ResultSetHeader, any];

    return result.affectedRows > 0;
  }
}

export const locationRepository = new LocationRepository();
