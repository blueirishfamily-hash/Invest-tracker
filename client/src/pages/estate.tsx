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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { SEO } from "@/components/seo";
import { 
  FileHeart, Users, FileText, Settings, Plus, Trash2, Edit2, 
  AlertTriangle, CheckCircle2, Clock, Shield, Target, Calculator, Receipt, Wallet
} from "lucide-react";
import type { 
  Beneficiary, InsertBeneficiary, Relationship,
  VaultDocument, InsertVaultDocument, DocumentType,
  EstateSettings,
} from "@shared/schema";
import { PlanningContent } from "./planning";

const relationships: Relationship[] = [
  "Spouse", "Child", "Parent", "Sibling", "Grandchild", "Friend", "Charity", "Trust", "Other"
];

const documentTypes: DocumentType[] = [
  "Will", "Trust", "Power of Attorney", "Healthcare Directive",
  "Insurance Policy", "Account Credentials", "Property Deed", "Tax Return", "Other"
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);

export default function Estate() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Beneficiary form
  const [isCreateBeneficiaryOpen, setIsCreateBeneficiaryOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [beneficiaryForm, setBeneficiaryForm] = useState<Partial<InsertBeneficiary>>({
    name: "",
    relationship: "Spouse",
    allocationPercentage: 0,
    isPrimary: false,
  });
  
  // Document form
  const [isCreateDocOpen, setIsCreateDocOpen] = useState(false);
  const [docForm, setDocForm] = useState<Partial<InsertVaultDocument>>({
    name: "",
    type: "Will",
  });
  
  // Queries
  const { data: summary, isLoading: summaryLoading } = useQuery<{
    beneficiaryCount: number;
    documentCount: number;
    totalAllocation: number;
    expiringDocuments: number;
    inactivityStatus: { isInactive: boolean; daysSinceActivity: number; daysRemaining: number };
    isConfigured: boolean;
  }>({
    queryKey: ["/api/estate/summary"],
  });
  
  const { data: beneficiaries } = useQuery<Beneficiary[]>({
    queryKey: ["/api/estate/beneficiaries"],
  });
  
  const { data: documents } = useQuery<VaultDocument[]>({
    queryKey: ["/api/estate/documents"],
  });
  
  const { data: settings } = useQuery<EstateSettings>({
    queryKey: ["/api/estate/settings"],
  });
  
  // Mutations
  const createBeneficiaryMutation = useMutation({
    mutationFn: async (data: InsertBeneficiary) => {
      const res = await fetch("/api/estate/beneficiaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create beneficiary");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estate"] });
      setIsCreateBeneficiaryOpen(false);
      resetBeneficiaryForm();
    },
  });
  
  const deleteBeneficiaryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/estate/beneficiaries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estate"] });
    },
  });
  
  const createDocMutation = useMutation({
    mutationFn: async (data: InsertVaultDocument) => {
      const res = await fetch("/api/estate/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estate"] });
      setIsCreateDocOpen(false);
      setDocForm({ name: "", type: "Will" });
    },
  });
  
  const deleteDocMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/estate/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estate"] });
    },
  });
  
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<EstateSettings>) => {
      const res = await fetch("/api/estate/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estate"] });
    },
  });
  
  const resetBeneficiaryForm = () => {
    setBeneficiaryForm({
      name: "",
      relationship: "Spouse",
      allocationPercentage: 0,
      isPrimary: false,
    });
  };
  
  return (
    <div className="p-6 space-y-6">
      <SEO
        title="Estate Planning"
        description="Manage beneficiaries and important documents"
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FileHeart className="h-6 w-6" />
            Estate & Planning
          </h1>
          <p className="text-muted-foreground">
            Financial planning, estate management, and beneficiary information
          </p>
        </div>
      </div>

      <Tabs defaultValue="planning" className="space-y-6">
        <TabsList>
          <TabsTrigger value="planning">
            <Calculator className="h-4 w-4 mr-2" />
            Planning
          </TabsTrigger>
          <TabsTrigger value="estate">
            <FileHeart className="h-4 w-4 mr-2" />
            Estate
          </TabsTrigger>
        </TabsList>

        {/* Planning Tab - Will import Planning component */}
        <TabsContent value="planning" className="mt-6">
          <PlanningTab />
        </TabsContent>

        {/* Estate Tab */}
        <TabsContent value="estate" className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="beneficiaries">Beneficiaries</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {summaryLoading ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Users className="h-4 w-4" />
                      Beneficiaries
                    </div>
                    <div className="text-3xl font-bold">{summary?.beneficiaryCount || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <FileText className="h-4 w-4" />
                      Documents
                    </div>
                    <div className="text-3xl font-bold">{summary?.documentCount || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      Allocation
                    </div>
                    <div className="text-3xl font-bold">{summary?.totalAllocation || 0}%</div>
                    <Progress 
                      value={summary?.totalAllocation || 0} 
                      className={`h-2 mt-2 ${(summary?.totalAllocation || 0) === 100 ? "" : "bg-yellow-100"}`}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Shield className="h-4 w-4" />
                      Status
                    </div>
                    <div className="flex items-center gap-2">
                      {summary?.isConfigured ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <span className="text-green-600 font-medium">Configured</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          <span className="text-yellow-600 font-medium">Not Configured</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Inactivity Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Inactivity Monitor
                  </CardTitle>
                  <CardDescription>
                    Dead man's switch - notify contacts after extended inactivity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">Days Since Activity</div>
                      <div className="text-2xl font-bold">
                        {summary?.inactivityStatus.daysSinceActivity || 0}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">Days Until Trigger</div>
                      <div className="text-2xl font-bold">
                        {summary?.inactivityStatus.daysRemaining || 90}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">Inactivity Period</div>
                      <div className="text-2xl font-bold">
                        {settings?.inactivityPeriodDays || 90} days
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Beneficiaries Tab */}
        <TabsContent value="beneficiaries" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isCreateBeneficiaryOpen} onOpenChange={setIsCreateBeneficiaryOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Beneficiary
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Beneficiary</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={beneficiaryForm.name || ""}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Relationship</Label>
                      <Select
                        value={beneficiaryForm.relationship}
                        onValueChange={(v) => setBeneficiaryForm({ ...beneficiaryForm, relationship: v as Relationship })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {relationships.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Allocation %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={beneficiaryForm.allocationPercentage || 0}
                        onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, allocationPercentage: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={beneficiaryForm.email || ""}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={beneficiaryForm.phone || ""}
                      onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={beneficiaryForm.isPrimary || false}
                      onCheckedChange={(c) => setBeneficiaryForm({ ...beneficiaryForm, isPrimary: c })}
                    />
                    <Label>Primary Beneficiary</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateBeneficiaryOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={() => createBeneficiaryMutation.mutate(beneficiaryForm as InsertBeneficiary)}
                    disabled={createBeneficiaryMutation.isPending}
                  >
                    Add Beneficiary
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Beneficiaries</CardTitle>
              <CardDescription>
                Total allocation: {summary?.totalAllocation || 0}%
                {(summary?.totalAllocation || 0) !== 100 && (
                  <span className="text-yellow-600 ml-2">(Should equal 100%)</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {beneficiaries && beneficiaries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Relationship</TableHead>
                      <TableHead>Allocation</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {beneficiaries.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell>{b.relationship}</TableCell>
                        <TableCell>{b.allocationPercentage}%</TableCell>
                        <TableCell>{b.email || b.phone || "-"}</TableCell>
                        <TableCell>
                          {b.isPrimary && <Badge>Primary</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteBeneficiaryMutation.mutate(b.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No beneficiaries added yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isCreateDocOpen} onOpenChange={setIsCreateDocOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Document</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Document Name</Label>
                    <Input
                      value={docForm.name || ""}
                      onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Document Type</Label>
                    <Select
                      value={docForm.type}
                      onValueChange={(v) => setDocForm({ ...docForm, type: v as DocumentType })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {documentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={docForm.description || ""}
                      onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiration Date (if applicable)</Label>
                    <Input
                      type="date"
                      value={docForm.expirationDate || ""}
                      onChange={(e) => setDocForm({ ...docForm, expirationDate: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDocOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={() => createDocMutation.mutate(docForm as InsertVaultDocument)}
                    disabled={createDocMutation.isPending}
                  >
                    Add Document
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Document Vault</CardTitle>
              <CardDescription>
                Securely store important documents and account information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documents && documents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Last Reviewed</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{doc.type}</Badge>
                        </TableCell>
                        <TableCell>{doc.lastReviewed || "-"}</TableCell>
                        <TableCell>
                          {doc.expirationDate ? (
                            new Date(doc.expirationDate) < new Date() ? (
                              <Badge variant="destructive">Expired</Badge>
                            ) : (
                              doc.expirationDate
                            )
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteDocMutation.mutate(doc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No documents added yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Dead Man's Switch Settings
              </CardTitle>
              <CardDescription>
                Configure automatic notifications after extended inactivity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable Inactivity Monitoring</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify emergency contacts after extended inactivity
                  </p>
                </div>
                <Switch
                  checked={settings?.isEnabled || false}
                  onCheckedChange={(checked) => updateSettingsMutation.mutate({ isEnabled: checked })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Inactivity Period (days)</Label>
                <Input
                  type="number"
                  min={30}
                  max={365}
                  value={settings?.inactivityPeriodDays || 90}
                  onChange={(e) => updateSettingsMutation.mutate({ inactivityPeriodDays: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Number of days of inactivity before notifications are sent (30-365)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Notification Message</Label>
                <Textarea
                  value={settings?.notificationMessage || ""}
                  onChange={(e) => updateSettingsMutation.mutate({ notificationMessage: e.target.value })}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Planning Tab Component
function PlanningTab() {
  return <PlanningContent />;
}
