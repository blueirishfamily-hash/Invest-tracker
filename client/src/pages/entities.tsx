import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { SEO } from "@/components/seo";
import { Building2, Plus, Trash2, Edit2, Percent } from "lucide-react";
import type { LegalEntity, InsertLegalEntity, EntityType } from "@shared/schema";

const entityTypes: EntityType[] = [
  "LLC", "Trust", "Corporation", "Partnership", "Sole Proprietorship", "Other"
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export default function Entities() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<LegalEntity | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<InsertLegalEntity>>({
    name: "",
    type: "LLC",
    ownershipPercentage: 100,
  });
  
  const { data: entities, isLoading } = useQuery<LegalEntity[]>({
    queryKey: ["/api/entities"],
  });
  
  const createMutation = useMutation({
    mutationFn: async (data: InsertLegalEntity) => {
      const res = await fetch("/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create entity");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
      setIsCreateOpen(false);
      resetForm();
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertLegalEntity> }) => {
      const res = await fetch(`/api/entities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update entity");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
      setEditingEntity(null);
      resetForm();
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/entities/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete entity");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entities"] });
    },
  });
  
  const resetForm = () => {
    setFormData({
      name: "",
      type: "LLC",
      ownershipPercentage: 100,
    });
  };
  
  const handleSubmit = () => {
    if (editingEntity) {
      updateMutation.mutate({ id: editingEntity.id, data: formData });
    } else {
      createMutation.mutate(formData as InsertLegalEntity);
    }
  };
  
  const openEdit = (entity: LegalEntity) => {
    setFormData({
      name: entity.name,
      type: entity.type,
      ein: entity.ein,
      stateOfFormation: entity.stateOfFormation,
      dateFormed: entity.dateFormed,
      description: entity.description,
      ownershipPercentage: entity.ownershipPercentage,
    });
    setEditingEntity(entity);
  };
  
  const totalValue = entities?.reduce((sum, e) => sum + e.totalValue, 0) || 0;
  
  return (
    <div className="p-6 space-y-6">
      <SEO
        title="Legal Entities"
        description="Manage LLCs, Trusts, and other legal structures"
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Legal Entities</h1>
          <p className="text-muted-foreground">
            Manage LLCs, Trusts, and other structures that hold assets
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Entity
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Legal Entity</DialogTitle>
              <DialogDescription>
                Add a new LLC, Trust, or other legal structure
              </DialogDescription>
            </DialogHeader>
            <EntityForm formData={formData} setFormData={setFormData} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Entity"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Entity Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground">Total Entities</div>
              <div className="text-2xl font-bold">{entities?.length || 0}</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground">Total Entity Value</div>
              <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground">LLCs</div>
              <div className="text-2xl font-bold">
                {entities?.filter(e => e.type === "LLC").length || 0}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground">Trusts</div>
              <div className="text-2xl font-bold">
                {entities?.filter(e => e.type === "Trust").length || 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Entities</CardTitle>
          <CardDescription>
            Manage ownership structures and assign holdings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : entities && entities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Ownership</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Your Share</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entities.map((entity) => (
                  <TableRow key={entity.id}>
                    <TableCell className="font-medium">{entity.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{entity.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        {entity.ownershipPercentage}%
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(entity.totalValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(entity.totalValue * (entity.ownershipPercentage / 100))}
                    </TableCell>
                    <TableCell>{entity.stateOfFormation || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(entity)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(entity.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No entities yet. Create one to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntity} onOpenChange={(open) => !open && setEditingEntity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Entity</DialogTitle>
            <DialogDescription>
              Update entity details
            </DialogDescription>
          </DialogHeader>
          <EntityForm formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntity(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EntityForm({
  formData,
  setFormData,
}: {
  formData: Partial<InsertLegalEntity>;
  setFormData: (data: Partial<InsertLegalEntity>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Entity Name</Label>
        <Input
          value={formData.name || ""}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Family Trust"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Entity Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value as EntityType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {entityTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Your Ownership %</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={formData.ownershipPercentage || 100}
            onChange={(e) => setFormData({ ...formData, ownershipPercentage: Number(e.target.value) })}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>EIN (Optional)</Label>
          <Input
            value={formData.ein || ""}
            onChange={(e) => setFormData({ ...formData, ein: e.target.value })}
            placeholder="XX-XXXXXXX"
          />
        </div>
        
        <div className="space-y-2">
          <Label>State of Formation</Label>
          <Input
            value={formData.stateOfFormation || ""}
            onChange={(e) => setFormData({ ...formData, stateOfFormation: e.target.value })}
            placeholder="e.g., Delaware"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Date Formed (Optional)</Label>
        <Input
          type="date"
          value={formData.dateFormed || ""}
          onChange={(e) => setFormData({ ...formData, dateFormed: e.target.value })}
        />
      </div>
      
      <div className="space-y-2">
        <Label>Description (Optional)</Label>
        <Textarea
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Purpose of this entity..."
        />
      </div>
    </div>
  );
}
