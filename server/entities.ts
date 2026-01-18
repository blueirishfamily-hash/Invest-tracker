/**
 * Legal Entities Module
 * 
 * Manage LLCs, Trusts, Corporations and other legal structures
 * that can hold assets.
 */

import type { LegalEntity, InsertLegalEntity, Holding } from "@shared/schema";
import { randomUUID } from "crypto";

// In-memory storage for legal entities
const entities: Map<string, LegalEntity> = new Map();

// Entity-to-holdings mapping (entityId -> holdingIds)
const entityHoldings: Map<string, Set<string>> = new Map();

/**
 * Create a new legal entity
 */
export function createEntity(data: InsertLegalEntity): LegalEntity {
  const now = new Date().toISOString();
  const entity: LegalEntity = {
    id: randomUUID(),
    name: data.name,
    type: data.type,
    ein: data.ein,
    stateOfFormation: data.stateOfFormation,
    dateFormed: data.dateFormed,
    description: data.description,
    ownershipPercentage: data.ownershipPercentage ?? 100,
    totalValue: 0,
    createdAt: now,
    updatedAt: now,
  };
  
  entities.set(entity.id, entity);
  entityHoldings.set(entity.id, new Set());
  
  return entity;
}

/**
 * Get all legal entities
 */
export function getEntities(): LegalEntity[] {
  return Array.from(entities.values());
}

/**
 * Get a single entity by ID
 */
export function getEntity(id: string): LegalEntity | undefined {
  return entities.get(id);
}

/**
 * Update an entity
 */
export function updateEntity(
  id: string,
  data: Partial<InsertLegalEntity>
): LegalEntity | undefined {
  const entity = entities.get(id);
  if (!entity) return undefined;
  
  const updated: LegalEntity = {
    ...entity,
    ...data,
    id: entity.id,
    totalValue: entity.totalValue,
    createdAt: entity.createdAt,
    updatedAt: new Date().toISOString(),
  };
  
  entities.set(id, updated);
  return updated;
}

/**
 * Delete an entity
 */
export function deleteEntity(id: string): boolean {
  entityHoldings.delete(id);
  return entities.delete(id);
}

/**
 * Assign a holding to an entity
 */
export function assignHoldingToEntity(entityId: string, holdingId: string): boolean {
  const holdings = entityHoldings.get(entityId);
  if (!holdings) return false;
  
  // Remove from any other entity first
  for (const [eId, hSet] of entityHoldings.entries()) {
    if (eId !== entityId) {
      hSet.delete(holdingId);
    }
  }
  
  holdings.add(holdingId);
  return true;
}

/**
 * Remove a holding from an entity
 */
export function removeHoldingFromEntity(entityId: string, holdingId: string): boolean {
  const holdings = entityHoldings.get(entityId);
  if (!holdings) return false;
  return holdings.delete(holdingId);
}

/**
 * Get holdings for an entity
 */
export function getEntityHoldingIds(entityId: string): string[] {
  const holdings = entityHoldings.get(entityId);
  return holdings ? Array.from(holdings) : [];
}

/**
 * Get entity that owns a holding
 */
export function getHoldingEntity(holdingId: string): LegalEntity | undefined {
  for (const [entityId, holdingIds] of entityHoldings.entries()) {
    if (holdingIds.has(holdingId)) {
      return entities.get(entityId);
    }
  }
  return undefined;
}

/**
 * Update entity total values based on holdings
 */
export function updateEntityValues(holdings: Holding[]): void {
  const holdingMap = new Map(holdings.map(h => [h.id, h]));
  
  for (const [entityId, holdingIds] of entityHoldings.entries()) {
    const entity = entities.get(entityId);
    if (!entity) continue;
    
    let totalValue = 0;
    for (const holdingId of holdingIds) {
      const holding = holdingMap.get(holdingId);
      if (holding) {
        totalValue += holding.currentValue;
      }
    }
    
    // Apply ownership percentage
    const effectiveValue = totalValue * (entity.ownershipPercentage / 100);
    
    entities.set(entityId, {
      ...entity,
      totalValue: Math.round(effectiveValue * 100) / 100,
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * Calculate total net worth including entity-owned assets
 */
export function calculateEntityAdjustedNetWorth(
  personalHoldings: Holding[],
  allHoldings: Holding[]
): {
  personalValue: number;
  entityValue: number;
  totalValue: number;
  entities: Array<{ entity: LegalEntity; holdings: Holding[] }>;
} {
  // Update entity values first
  updateEntityValues(allHoldings);
  
  // Calculate personal holdings value (not in any entity)
  const entityOwnedIds = new Set<string>();
  for (const holdingIds of entityHoldings.values()) {
    for (const id of holdingIds) {
      entityOwnedIds.add(id);
    }
  }
  
  const personalValue = personalHoldings
    .filter(h => !entityOwnedIds.has(h.id))
    .reduce((sum, h) => sum + h.currentValue, 0);
  
  // Calculate entity values (with ownership percentage)
  let entityValue = 0;
  const entityDetails: Array<{ entity: LegalEntity; holdings: Holding[] }> = [];
  
  const holdingMap = new Map(allHoldings.map(h => [h.id, h]));
  
  for (const entity of entities.values()) {
    const holdingIds = entityHoldings.get(entity.id) || new Set();
    const holdings = Array.from(holdingIds)
      .map(id => holdingMap.get(id))
      .filter((h): h is Holding => h !== undefined);
    
    entityDetails.push({ entity, holdings });
    entityValue += entity.totalValue; // Already adjusted for ownership %
  }
  
  return {
    personalValue: Math.round(personalValue * 100) / 100,
    entityValue: Math.round(entityValue * 100) / 100,
    totalValue: Math.round((personalValue + entityValue) * 100) / 100,
    entities: entityDetails,
  };
}

// Initialize with demo data
function initDemoEntities() {
  createEntity({
    name: "Family Trust",
    type: "Trust",
    description: "Revocable living trust for estate planning",
    ownershipPercentage: 100,
    dateFormed: "2020-01-15",
    stateOfFormation: "California",
  });
  
  createEntity({
    name: "Investment Holdings LLC",
    type: "LLC",
    description: "LLC for investment properties and securities",
    ownershipPercentage: 75, // 75% ownership
    ein: "XX-XXXXXXX",
    dateFormed: "2021-06-01",
    stateOfFormation: "Delaware",
  });
}

// Initialize demo data
initDemoEntities();
