import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SEO } from "@/components/seo";
import { 
  Users, Plus, UserPlus, Crown, Edit2, Eye, 
  Mail, Clock, CheckCircle2, XCircle, Activity
} from "lucide-react";
import type { Household, HouseholdMember, HouseholdInvite, HouseholdRole, ActivityLog } from "@shared/schema";

const roleIcons: Record<HouseholdRole, typeof Crown> = {
  owner: Crown,
  editor: Edit2,
  viewer: Eye,
};

const roleColors: Record<HouseholdRole, string> = {
  owner: "bg-yellow-500/10 text-yellow-600",
  editor: "bg-blue-500/10 text-blue-600",
  viewer: "bg-gray-500/10 text-gray-600",
};

export default function Family() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState<string | null>(null);
  
  // Form state
  const [householdName, setHouseholdName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<HouseholdRole>("viewer");
  
  // Queries
  const { data: households, isLoading } = useQuery<Household[]>({
    queryKey: ["/api/households"],
  });
  
  const activeHouseholdId = selectedHousehold || households?.[0]?.id;
  
  const { data: members } = useQuery<HouseholdMember[]>({
    queryKey: ["/api/households", activeHouseholdId, "members"],
    enabled: !!activeHouseholdId,
    queryFn: async () => {
      const res = await fetch(`/api/households/${activeHouseholdId}/members`);
      return res.json();
    },
  });
  
  const { data: invites } = useQuery<HouseholdInvite[]>({
    queryKey: ["/api/households", activeHouseholdId, "invites"],
    enabled: !!activeHouseholdId,
    queryFn: async () => {
      const res = await fetch(`/api/households/${activeHouseholdId}/invites`);
      return res.json();
    },
  });
  
  const { data: activity } = useQuery<ActivityLog[]>({
    queryKey: ["/api/households", activeHouseholdId, "activity"],
    enabled: !!activeHouseholdId,
    queryFn: async () => {
      const res = await fetch(`/api/households/${activeHouseholdId}/activity?limit=20`);
      return res.json();
    },
  });
  
  // Mutations
  const createHouseholdMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create household");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      setIsCreateOpen(false);
      setHouseholdName("");
    },
  });
  
  const inviteMutation = useMutation({
    mutationFn: async ({ householdId, email, role }: { householdId: string; email: string; role: HouseholdRole }) => {
      const res = await fetch(`/api/households/${householdId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) throw new Error("Failed to send invite");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteRole("viewer");
    },
  });
  
  const activeHousehold = households?.find(h => h.id === activeHouseholdId);
  
  return (
    <div className="p-6 space-y-6">
      <SEO
        title="Family & Sharing"
        description="Share your portfolio with family members"
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            Family & Sharing
          </h1>
          <p className="text-muted-foreground">
            Share portfolio access with family members and trusted advisors
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Household
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Household</DialogTitle>
              <DialogDescription>
                Create a household to share portfolio access with family members
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Household Name</Label>
                <Input
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="e.g., Johnson Family"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => createHouseholdMutation.mutate(householdName)}
                disabled={createHouseholdMutation.isPending || !householdName}
              >
                Create Household
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : households && households.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Household Selector */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Your Households</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {households.map((household) => (
                <Button
                  key={household.id}
                  variant={activeHouseholdId === household.id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedHousehold(household.id)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  {household.name}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Household Details */}
          <div className="lg:col-span-3 space-y-6">
            {activeHousehold && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>{activeHousehold.name}</CardTitle>
                      <CardDescription>
                        Created {new Date(activeHousehold.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Invite Member
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Invite to {activeHousehold.name}</DialogTitle>
                          <DialogDescription>
                            Send an invitation to join this household
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="family@example.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as HouseholdRole)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="viewer">
                                  <div className="flex items-center gap-2">
                                    <Eye className="h-4 w-4" />
                                    Viewer - Can view portfolio
                                  </div>
                                </SelectItem>
                                <SelectItem value="editor">
                                  <div className="flex items-center gap-2">
                                    <Edit2 className="h-4 w-4" />
                                    Editor - Can make changes
                                  </div>
                                </SelectItem>
                                <SelectItem value="owner">
                                  <div className="flex items-center gap-2">
                                    <Crown className="h-4 w-4" />
                                    Owner - Full access
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
                          <Button 
                            onClick={() => inviteMutation.mutate({ 
                              householdId: activeHouseholdId!, 
                              email: inviteEmail, 
                              role: inviteRole 
                            })}
                            disabled={inviteMutation.isPending || !inviteEmail}
                          >
                            Send Invite
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                </Card>

                <Tabs defaultValue="members">
                  <TabsList>
                    <TabsTrigger value="members">Members</TabsTrigger>
                    <TabsTrigger value="invites">Pending Invites</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                  </TabsList>

                  <TabsContent value="members">
                    <Card>
                      <CardHeader>
                        <CardTitle>Members</CardTitle>
                        <CardDescription>
                          {members?.length || 0} members in this household
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {members && members.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {members.map((member) => {
                                const RoleIcon = roleIcons[member.role];
                                return (
                                  <TableRow key={member.id}>
                                    <TableCell className="font-medium">{member.displayName}</TableCell>
                                    <TableCell>{member.email}</TableCell>
                                    <TableCell>
                                      <Badge className={roleColors[member.role]}>
                                        <RoleIcon className="h-3 w-3 mr-1" />
                                        {member.role}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(member.joinedAt).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                      <Badge variant={member.status === "active" ? "default" : "secondary"}>
                                        {member.status}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No members yet
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="invites">
                    <Card>
                      <CardHeader>
                        <CardTitle>Pending Invitations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {invites && invites.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Sent</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {invites.map((invite) => (
                                <TableRow key={invite.id}>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-4 w-4" />
                                      {invite.email}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">{invite.role}</Badge>
                                  </TableCell>
                                  <TableCell>{new Date(invite.createdAt).toLocaleDateString()}</TableCell>
                                  <TableCell>{new Date(invite.expiresAt).toLocaleDateString()}</TableCell>
                                  <TableCell>
                                    {invite.status === "pending" ? (
                                      <Badge variant="outline">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Pending
                                      </Badge>
                                    ) : invite.status === "accepted" ? (
                                      <Badge className="bg-green-500/10 text-green-600">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Accepted
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        {invite.status}
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No pending invitations</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="activity">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Recent Activity
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {activity && activity.length > 0 ? (
                          <ScrollArea className="h-96">
                            <div className="space-y-4">
                              {activity.map((log) => (
                                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-xs font-medium">
                                      {log.userName.slice(0, 2).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm">
                                      <span className="font-medium">{log.userName}</span>
                                      {" "}{log.action}{" "}
                                      <span className="text-muted-foreground">{log.resourceType}</span>
                                    </p>
                                    {log.details && (
                                      <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {new Date(log.timestamp).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No activity recorded yet</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Households Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create a household to share your portfolio with family members
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Household
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
