import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { LogOut, Plus, Search, QrCode } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

export default function Dashboard() {
  const { user, userRole, signOut, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const participantId = searchParams.get('participantId');
  const [facultateFilter, setFacultateFilter] = useState('');
  const [majorFilter, setMajorFilter] = useState<boolean | null>(null);
  const [cazatFilter, setCazatFilter] = useState<boolean | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeParty, setActiveParty] = useState<Party | null>(null);
  const [newParticipant, setNewParticipant] = useState({
    nume: '',
    facultate: '',
    numar_camera: '',
    major: false,
    cazat: false,
  });

  
  // 🛡️ AUTH GUARD – WAIT for auth to resolve
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Se încarcă...</div>;
  }

  // 🔐 REDIRECT to login if user not authenticated
  if (!user || !userRole) {
    return <Navigate to="/login" replace />;
  }

  const fetchParticipants = async () => {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .order('nume');

    if (error) {
      toast({
        title: "Eroare",
        description: "Încărcarea participanților a eșuat",
        variant: "destructive",
      });
    } else {
      setParticipants(data || []);
    }
  };

  const fetchActiveParty = async () => {
    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (!error && data) {
      setActiveParty(data);
    }
  };

  const subscribeToParticipants = () => {
    const channel = supabase
      .channel('participants-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants'
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filterParticipants = () => {
    let filtered = participants;

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.nume.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.facultate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.numar_camera.includes(searchTerm)
      );
    }

    if (facultateFilter) {
      filtered = filtered.filter(p => p.facultate === facultateFilter);
    }

    if (majorFilter !== null) {
      filtered = filtered.filter(p => p.major === majorFilter);
    }

    if (cazatFilter !== null) {
      filtered = filtered.filter(p => p.cazat === cazatFilter);
    }

    setFilteredParticipants(filtered);
  };

  const updateDrinks = async (participantId: string, increment: boolean) => {
  const participant = participants.find(p => p.id === participantId);
  if (!participant || !activeParty) return;

  const newCount = increment 
    ? participant.numar_bauturi + 1 
    : Math.max(0, participant.numar_bauturi - 1);

  const { error } = await supabase
    .from('participants')
    .update({ numar_bauturi: newCount })
    .eq('id', participantId);

  if (error) {
    toast({
      title: "Eroare",
      description: "Actualizarea numărului de băuturi a eșuat",
      variant: "destructive",
    });
  } else {
    // ✅ Logging Logic
    if (user) {
      await logAction({
        userId: user.id,
        username: user.email,
        action: increment ? 'drink_added' : 'drink_removed',
        target: participant.nume,
        message: `${user.email} a ${increment ? 'adăugat o băutură' : 'scăzut o băutură'} pentru ${participant.nume} la petrecerea ${activeParty.name}`
      });
    }
  }
};


  const addParticipant = async () => {
    if (!newParticipant.nume || !newParticipant.facultate || !newParticipant.numar_camera) {
      toast({
        title: "Eroare",
        description: "Vă rugăm să completați toate câmpurile obligatorii",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('participants')
      .insert([newParticipant]);

    if (error) {
      toast({
        title: "Eroare",
        description: "Adăugarea participantului a eșuat",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Succes",
        description: "Participant adăugat cu succes",
      });
      setNewParticipant({
        nume: '',
        facultate: '',
        numar_camera: '',
        major: false,
        cazat: false,
      });
      setShowAddForm(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchParticipants();
      fetchActiveParty();
      subscribeToParticipants();
      
      // Subscribe to party changes
      const partyChannel = supabase
        .channel('party-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'parties'
          },
          () => {
            fetchActiveParty();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(partyChannel);
      };
    }
  }, [user]);

  // Handle participant ID from QR code redirect
  useEffect(() => {
    if (participantId && participants.length > 0) {
      const participant = participants.find(p => p.id === participantId);
      if (participant) {
        setSearchTerm(participant.nume);
        // Remove participantId from URL after setting search term
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('participantId');
        setSearchParams(newSearchParams);
      }
    }
  }, [participantId, participants]);

  useEffect(() => {
    filterParticipants();
  }, [participants, searchTerm, facultateFilter, majorFilter, cazatFilter]);

  const facultati = [...new Set(participants.map(p => p.facultate))];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Se încarcă...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">
              {userRole === 'administrator' ? 'Dashboard Administrator' : 'Dashboard Voluntar'}
            </h1>
            <p className="text-muted-foreground">
              Bun venit, {userRole === 'administrator' ? 'Administrator' : 'Voluntar'}
            </p>
          </div>
          <div className="flex gap-2">
            {userRole === 'administrator' && (
              <Button variant="outline" onClick={() => navigate('/admin')}>
                Panou Admin
              </Button>
            )}
            <Button onClick={signOut} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Deconectare
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Filtre
              {userRole === 'administrator' && (
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adaugă Participant
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Căutare</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Nume, facultate, cameră..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="facultate">Facultate</Label>
                <select
                  id="facultate"
                  value={facultateFilter}
                  onChange={(e) => setFacultateFilter(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                >
                  <option value="">Toate Facultățile</option>
                  {facultati.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Major</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant={majorFilter === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMajorFilter(null)}
                  >
                    Toți
                  </Button>
                  <Button
                    variant={majorFilter === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMajorFilter(true)}
                  >
                    Da
                  </Button>
                  <Button
                    variant={majorFilter === false ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMajorFilter(false)}
                  >
                    Nu
                  </Button>
                </div>
              </div>
              <div>
                <Label>Cazat</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant={cazatFilter === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCazatFilter(null)}
                  >
                    Toți
                  </Button>
                  <Button
                    variant={cazatFilter === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCazatFilter(true)}
                  >
                    Da
                  </Button>
                  <Button
                    variant={cazatFilter === false ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCazatFilter(false)}
                  >
                    Nu
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Participants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredParticipants.map((participant) => (
            <Card key={participant.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{participant.nume}</CardTitle>
                    <p className="text-sm text-muted-foreground">{participant.facultate}</p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <QrCode className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{participant.nume} - QR Code</DialogTitle>
                      </DialogHeader>
                       <div className="flex justify-center p-4">
                        <QRCode 
  value={`${window.location.origin}/participant/${participant.id}`}
  size={200}
/>

                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                  <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Cameră:</span>
                    <span className="font-medium">{participant.numar_camera}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Major:</span>
                    <Badge variant={participant.major ? "default" : "secondary"}>
                      {participant.major ? "Da" : "Nu"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Cazat:</span>
                    <Badge variant={participant.cazat ? "default" : "secondary"}>
                      {participant.cazat ? "Da" : "Nu"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Băuturi {activeParty ? activeParty.name : 'Party Activ'}:</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateDrinks(participant.id, false)}
                        disabled={participant.numar_bauturi === 0}
                      >
                        -
                      </Button>
                      <span className="font-medium w-8 text-center">
                        {participant.numar_bauturi}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateDrinks(participant.id, true)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Participant Dialog */}
        {showAddForm && userRole === 'administrator' && (
          <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adaugă Participant Nou</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nume">Nume *</Label>
                  <Input
                    id="nume"
                    value={newParticipant.nume}
                    onChange={(e) => setNewParticipant({...newParticipant, nume: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="facultate-new">Facultate *</Label>
                  <Input
                    id="facultate-new"
                    value={newParticipant.facultate}
                    onChange={(e) => setNewParticipant({...newParticipant, facultate: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="camera">Număr Cameră *</Label>
                  <Input
                    id="camera"
                    value={newParticipant.numar_camera}
                    onChange={(e) => setNewParticipant({...newParticipant, numar_camera: e.target.value})}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="major-new"
                    checked={newParticipant.major}
                    onCheckedChange={(checked) => setNewParticipant({...newParticipant, major: checked})}
                  />
                  <Label htmlFor="major-new">Major</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="cazat-new"
                    checked={newParticipant.cazat}
                    onCheckedChange={(checked) => setNewParticipant({...newParticipant, cazat: checked})}
                  />
                  <Label htmlFor="cazat-new">Cazat</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Anulează
                  </Button>
                  <Button onClick={addParticipant}>
                    Adaugă Participant
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}