import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Edit, Calendar, Users, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'react-qr-code';
import { logAction } from '@/lib/logger';



interface Participant {
  id: string;
  nume: string;
  facultate: string;
  numar_camera: string;
  major: boolean;
  cazat: boolean;
  numar_bauturi: number;
}

interface Party {
  id: string;
  name: string;
  date: string;
  is_active: boolean;
}

interface ParticipantDrinks {
  id: string;
  participant_id: string;
  party_id: string;
  drink_count: number;
  participant: Participant;
  party: Party;
}

export default function Admin() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [participantDrinks, setParticipantDrinks] = useState<ParticipantDrinks[]>([]);
  const [activeParty, setActiveParty] = useState<Party | null>(null);
  const [newParticipant, setNewParticipant] = useState({
    nume: '',
    facultate: '',
    numar_camera: '',
    major: false,
    cazat: false
  });
  const [newParty, setNewParty] = useState({
    name: '',
    date: ''
  });

  useEffect(() => {
    if (user && userRole === 'administrator') {
      fetchData();
    }
  }, [user, userRole]);

  // Redirect if not admin
  if (!loading && (!user || userRole !== 'administrator')) {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchData = async () => {
    await Promise.all([
      fetchParticipants(),
      fetchParties(),
      fetchParticipantDrinks()
    ]);
  };

  const fetchParticipants = async () => {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .order('nume');

    if (!error && data) {
      setParticipants(data);
    }
  };

  const fetchParties = async () => {
    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .order('date');

    if (!error && data) {
      setParties(data);
      const active = data.find(p => p.is_active);
      setActiveParty(active || null);
    }
  };

  const fetchParticipantDrinks = async () => {
    const { data, error } = await supabase
      .from('participant_drinks')
      .select(`
        *,
        participant:participants(*),
        party:parties(*)
      `);

    if (!error && data) {
      setParticipantDrinks(data);
    }
  };

  const addParticipant = async () => {
    if (!newParticipant.nume || !newParticipant.facultate || !newParticipant.numar_camera) {
      toast({
        title: "Eroare",
        description: "Completează toate câmpurile obligatorii",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('participants')
      .insert([newParticipant]);

    if (error) {
      toast({
        title: "Eroare",
        description: "Participantul nu a putut fi adăugat",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Succes",
        description: "Participant adăugat cu succes"
      });
      setNewParticipant({
        nume: '',
        facultate: '',
        numar_camera: '',
        major: false,
        cazat: false
      });
      fetchParticipants();
    }
  };

  const addParty = async () => {
  if (!newParty.name || !newParty.date) {
    toast({
      title: "Eroare",
      description: "Completează toate câmpurile",
      variant: "destructive"
    });
    return;
  }

  const { error } = await supabase
    .from('parties')
    .insert([newParty]);

  if (error) {
    toast({
      title: "Eroare",
      description: "Petrecerea nu a putut fi adăugată",
      variant: "destructive"
    });
  } else {
    toast({
      title: "Succes",
      description: "Petrecere adăugată cu succes"
    });

    if (user) {
      await logAction({
  userId: user.id,
  username: user.email,
  action: 'created_party',
  target: newParty.name,
  message: `${user.email} a creat petrecerea ${newParty.name}`,
});
console.log('Logged action successfully!');

    }

    setNewParty({ name: '', date: '' });
    fetchParties();
  }
};

  const setActivePartyById = async (partyId: string) => {
    // First, deactivate all parties
    await supabase
      .from('parties')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // Then activate the selected party
    const { error } = await supabase
      .from('parties')
      .update({ is_active: true })
      .eq('id', partyId);

    if (error) {
      toast({
        title: "Eroare",
        description: "Nu s-a putut activa petrecerea",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Succes",
        description: "Petrecerea a fost activată"
      });
      fetchParties();
    }
  };

  const getParticipantUrl = (participantId: string) => {
    return `${window.location.origin}/participant/${participantId}`;
  };

  const updateParty = async (partyId: string, updatedData: { name: string; date: string }) => {
  const { error } = await supabase
    .from('parties')
    .update(updatedData)
    .eq('id', partyId);

  if (error) {
    toast({
      title: "Eroare",
      description: "Petrecerea nu a putut fi actualizată",
      variant: "destructive"
    });
  } else {
    toast({
      title: "Succes",
      description: "Petrecere actualizată cu succes"
    });

    // ✅ Logging
    if (user) {
      await logAction({
        userId: user.id,
        username: user.email,
        action: 'updated_party',
        target: updatedData.name,
        message: `${user.email} a actualizat petrecerea ${updatedData.name}`
      });
    }

    fetchParties();
  }
};


  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Se încarcă...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
  <h1 className="text-3xl font-bold">Panou Administrator</h1>
  <div className="flex gap-2">
    <Button variant="secondary" onClick={() => navigate('/admin/logs')}>
      📝 Vizualizează Loguri
    </Button>
    <Button variant="outline" onClick={() => navigate('/dashboard')}>
      Înapoi la Dashboard
    </Button>
  </div>
</div>


        <Tabs defaultValue="participants" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="participants" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Participanți
            </TabsTrigger>
            <TabsTrigger value="parties" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Petreceri
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Setări
            </TabsTrigger>
          </TabsList>

          <TabsContent value="participants" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Participanți ({participants.length})</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Adaugă Participant
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Participant Nou</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="nume">Nume</Label>
                          <Input
                            id="nume"
                            value={newParticipant.nume}
                            onChange={(e) => setNewParticipant({...newParticipant, nume: e.target.value})}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="facultate">Facultate</Label>
                          <Input
                            id="facultate"
                            value={newParticipant.facultate}
                            onChange={(e) => setNewParticipant({...newParticipant, facultate: e.target.value})}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="numar_camera">Număr Cameră</Label>
                          <Input
                            id="numar_camera"
                            value={newParticipant.numar_camera}
                            onChange={(e) => setNewParticipant({...newParticipant, numar_camera: e.target.value})}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="major"
                            checked={newParticipant.major}
                            onCheckedChange={(checked) => setNewParticipant({...newParticipant, major: checked})}
                          />
                          <Label htmlFor="major">Major</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="cazat"
                            checked={newParticipant.cazat}
                            onCheckedChange={(checked) => setNewParticipant({...newParticipant, cazat: checked})}
                          />
                          <Label htmlFor="cazat">Cazat</Label>
                        </div>
                        <Button onClick={addParticipant}>Adaugă</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-semibold">{participant.nume}</h3>
                        <p className="text-sm text-muted-foreground">{participant.facultate}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">Cameră {participant.numar_camera}</Badge>
                          {participant.major && <Badge>Major</Badge>}
                          {participant.cazat && <Badge variant="secondary">Cazat</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              QR Code
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>QR Code - {participant.nume}</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col items-center gap-4">
                              <QRCode value={getParticipantUrl(participant.id)} size={200} />
                              <p className="text-sm text-muted-foreground text-center">
                                Scanează pentru a accesa detaliile participantului
                              </p>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`/participant/${participant.id}`, '_blank')}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parties" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Petreceri ({parties.length})</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Calendar className="w-4 h-4 mr-2" />
                        Adaugă Petrecere
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Petrecere Nouă</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="party-name">Nume Petrecere</Label>
                          <Input
                            id="party-name"
                            value={newParty.name}
                            onChange={(e) => setNewParty({...newParty, name: e.target.value})}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="party-date">Data</Label>
                          <Input
                            id="party-date"
                            type="date"
                            value={newParty.date}
                            onChange={(e) => setNewParty({...newParty, date: e.target.value})}
                          />
                        </div>
                        <Button onClick={addParty}>Adaugă</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {parties.map((party) => (
                    <div key={party.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{party.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(party.date).toLocaleDateString('ro-RO')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {party.is_active && <Badge>Activă</Badge>}
                        {!party.is_active && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setActivePartyById(party.id)}
                          >
                            Activează
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Gestiune Petreceri</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Calendar className="w-4 h-4 mr-2" />
                        Adaugă Petrecere Nouă
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adaugă Petrecere Nouă</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="party-name-settings">Nume Petrecere</Label>
                          <Input
                            id="party-name-settings"
                            value={newParty.name}
                            onChange={(e) => setNewParty({...newParty, name: e.target.value})}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="party-date-settings">Data</Label>
                          <Input
                            id="party-date-settings"
                            type="date"
                            value={newParty.date}
                            onChange={(e) => setNewParty({...newParty, date: e.target.value})}
                          />
                        </div>
                        <Button onClick={addParty}>Adaugă</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4">
                    {parties.map((party) => (
                      <EditablePartyCard 
                        key={party.id} 
                        party={party} 
                        onUpdate={fetchParties}
                        onActivate={setActivePartyById}
                        isActive={party.is_active}
                      />
                    ))}
                  </div>
                  {activeParty && (
                    <div className="p-4 bg-muted rounded-lg mt-4">
                      <h4 className="font-semibold">Petrecerea Activă Curentă:</h4>
                      <p>{activeParty.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(activeParty.date).toLocaleDateString('ro-RO')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function EditablePartyCard({ party, onUpdate, onActivate, isActive }: {
  party: Party;
  onUpdate: () => void;
  onActivate: (id: string) => void;
  isActive: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: party.name, date: party.date });
  const { toast } = useToast();

  const handleSave = async () => {
    if (!editData.name || !editData.date) {
      toast({
        title: "Eroare",
        description: "Completează toate câmpurile",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('parties')
      .update({ name: editData.name, date: editData.date })
      .eq('id', party.id);

    if (error) {
      toast({
        title: "Eroare",
        description: "Petrecerea nu a putut fi actualizată",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Succes",
        description: "Petrecere actualizată cu succes"
      });
      
      setIsEditing(false);
      onUpdate();
    }
  };

  const handleCancel = () => {
    setEditData({ name: party.name, date: party.date });
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              placeholder="Nume petrecere"
            />
            <Input
              type="date"
              value={editData.date}
              onChange={(e) => setEditData({ ...editData, date: e.target.value })}
            />
          </div>
        ) : (
          <div>
            <h3 className="font-semibold">{party.name}</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(party.date).toLocaleDateString('ro-RO')}
            </p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isActive && <Badge>Activă</Badge>}
        {isEditing ? (
          <>
            <Button size="sm" onClick={handleSave}>Salvează</Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>Anulează</Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4" />
            </Button>
            {!isActive && (
              <Button size="sm" onClick={() => onActivate(party.id)}>
                Activează
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
