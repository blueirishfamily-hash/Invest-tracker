/**
 * Estate & Beneficiary Vault Module
 * 
 * Manages beneficiaries, important documents, and dead man's switch functionality.
 */

import type {
  Beneficiary,
  InsertBeneficiary,
  VaultDocument,
  InsertVaultDocument,
  EstateSettings,
} from "@shared/schema";
import { randomUUID } from "crypto";

// In-memory storage
const beneficiaries: Map<string, Beneficiary> = new Map();
const documents: Map<string, VaultDocument> = new Map();
let estateSettings: EstateSettings = {
  inactivityPeriodDays: 90,
  lastActivity: new Date().toISOString(),
  emergencyContacts: [],
  notificationMessage: "This is an automated message. Please contact the designated parties regarding important financial matters.",
  isEnabled: false,
};

// ============================================
// BENEFICIARY MANAGEMENT
// ============================================

/**
 * Create a new beneficiary
 */
export function createBeneficiary(data: InsertBeneficiary): Beneficiary {
  const now = new Date().toISOString();
  const beneficiary: Beneficiary = {
    id: randomUUID(),
    name: data.name,
    relationship: data.relationship,
    email: data.email,
    phone: data.phone,
    address: data.address,
    allocationPercentage: data.allocationPercentage,
    isPrimary: data.isPrimary ?? false,
    notes: data.notes,
    createdAt: now,
    updatedAt: now,
  };
  
  beneficiaries.set(beneficiary.id, beneficiary);
  updateActivity();
  
  return beneficiary;
}

/**
 * Get all beneficiaries
 */
export function getBeneficiaries(): Beneficiary[] {
  return Array.from(beneficiaries.values()).sort((a, b) => {
    // Primary beneficiaries first, then by allocation
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return b.allocationPercentage - a.allocationPercentage;
  });
}

/**
 * Get beneficiary by ID
 */
export function getBeneficiary(id: string): Beneficiary | undefined {
  return beneficiaries.get(id);
}

/**
 * Update beneficiary
 */
export function updateBeneficiary(
  id: string,
  data: Partial<InsertBeneficiary>
): Beneficiary | undefined {
  const existing = beneficiaries.get(id);
  if (!existing) return undefined;
  
  const updated: Beneficiary = {
    ...existing,
    ...data,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  
  beneficiaries.set(id, updated);
  updateActivity();
  
  return updated;
}

/**
 * Delete beneficiary
 */
export function deleteBeneficiary(id: string): boolean {
  updateActivity();
  return beneficiaries.delete(id);
}

/**
 * Get total allocation percentage
 */
export function getTotalAllocation(): number {
  let total = 0;
  for (const b of beneficiaries.values()) {
    total += b.allocationPercentage;
  }
  return total;
}

// ============================================
// DOCUMENT VAULT
// ============================================

/**
 * Create a new vault document
 */
export function createDocument(data: InsertVaultDocument): VaultDocument {
  const now = new Date().toISOString();
  const doc: VaultDocument = {
    id: randomUUID(),
    name: data.name,
    type: data.type,
    description: data.description,
    fileName: data.fileName,
    fileSize: data.fileSize,
    encryptedContent: data.encryptedContent,
    lastReviewed: data.lastReviewed,
    expirationDate: data.expirationDate,
    linkedBeneficiaries: data.linkedBeneficiaries || [],
    createdAt: now,
    updatedAt: now,
  };
  
  documents.set(doc.id, doc);
  updateActivity();
  
  return doc;
}

/**
 * Get all documents
 */
export function getDocuments(): VaultDocument[] {
  return Array.from(documents.values()).sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Get document by ID
 */
export function getDocument(id: string): VaultDocument | undefined {
  return documents.get(id);
}

/**
 * Update document
 */
export function updateDocument(
  id: string,
  data: Partial<InsertVaultDocument>
): VaultDocument | undefined {
  const existing = documents.get(id);
  if (!existing) return undefined;
  
  const updated: VaultDocument = {
    ...existing,
    ...data,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  
  documents.set(id, updated);
  updateActivity();
  
  return updated;
}

/**
 * Delete document
 */
export function deleteDocument(id: string): boolean {
  updateActivity();
  return documents.delete(id);
}

/**
 * Get documents nearing expiration
 */
export function getExpiringDocuments(daysAhead: number = 30): VaultDocument[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);
  
  return getDocuments().filter(doc => {
    if (!doc.expirationDate) return false;
    return new Date(doc.expirationDate) <= cutoff;
  });
}

// ============================================
// ESTATE SETTINGS & DEAD MAN'S SWITCH
// ============================================

/**
 * Get estate settings
 */
export function getEstateSettings(): EstateSettings {
  return { ...estateSettings };
}

/**
 * Update estate settings
 */
export function updateEstateSettings(data: Partial<EstateSettings>): EstateSettings {
  estateSettings = {
    ...estateSettings,
    ...data,
  };
  updateActivity();
  return { ...estateSettings };
}

/**
 * Update last activity timestamp
 */
export function updateActivity(): void {
  estateSettings.lastActivity = new Date().toISOString();
}

/**
 * Check if inactivity period has elapsed
 */
export function checkInactivity(): {
  isInactive: boolean;
  daysSinceActivity: number;
  daysRemaining: number;
} {
  const lastActivity = new Date(estateSettings.lastActivity);
  const now = new Date();
  const daysSinceActivity = Math.floor(
    (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const daysRemaining = estateSettings.inactivityPeriodDays - daysSinceActivity;
  
  return {
    isInactive: daysSinceActivity >= estateSettings.inactivityPeriodDays,
    daysSinceActivity,
    daysRemaining: Math.max(0, daysRemaining),
  };
}

/**
 * Get estate summary
 */
export function getEstateSummary(): {
  beneficiaryCount: number;
  documentCount: number;
  totalAllocation: number;
  expiringDocuments: number;
  inactivityStatus: ReturnType<typeof checkInactivity>;
  isConfigured: boolean;
} {
  return {
    beneficiaryCount: beneficiaries.size,
    documentCount: documents.size,
    totalAllocation: getTotalAllocation(),
    expiringDocuments: getExpiringDocuments().length,
    inactivityStatus: checkInactivity(),
    isConfigured: estateSettings.isEnabled && estateSettings.emergencyContacts.length > 0,
  };
}

// ============================================
// DEMO DATA
// ============================================

function initDemoData() {
  // Demo beneficiaries
  createBeneficiary({
    name: "Sarah Johnson",
    relationship: "Spouse",
    email: "sarah@example.com",
    phone: "+1-555-0101",
    allocationPercentage: 50,
    isPrimary: true,
    notes: "Primary beneficiary for all accounts",
  });
  
  createBeneficiary({
    name: "Michael Johnson",
    relationship: "Child",
    email: "michael@example.com",
    allocationPercentage: 25,
    isPrimary: false,
    notes: "Education trust beneficiary",
  });
  
  createBeneficiary({
    name: "Emma Johnson",
    relationship: "Child",
    email: "emma@example.com",
    allocationPercentage: 25,
    isPrimary: false,
  });
  
  // Demo documents
  createDocument({
    name: "Last Will and Testament",
    type: "Will",
    description: "Primary will document, last updated January 2024",
    lastReviewed: "2024-01-15",
    linkedBeneficiaries: [],
  });
  
  createDocument({
    name: "Life Insurance Policy",
    type: "Insurance Policy",
    description: "Term life insurance, $1M coverage",
    expirationDate: "2035-06-01",
  });
  
  createDocument({
    name: "Healthcare Directive",
    type: "Healthcare Directive",
    description: "Advanced healthcare directive and medical power of attorney",
    lastReviewed: "2023-08-20",
  });
}

initDemoData();
