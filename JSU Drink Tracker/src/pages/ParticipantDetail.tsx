import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
}

export default function ParticipantDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, userRole, loading } = useAuth();
  const { toast } = useToast();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [editedParticipant, setEditedParticipant] = useState<Participant | null>(null);
  const [activeParty, setActiveParty] = useState<Party | null>(null);
  const [participantDrinks, setParticipantDrinks] = useState<ParticipantDrinks | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchParticipant();
      fetchActiveParty();
    }
  }, [id, user]);

  // Fetch participant drinks when active party is loaded
  useEffect(() => {
    if (activeParty && participant) {
      fetchParticipantDrinks(participant.id);
    }
  }, [activeParty, participant]);

  // Redirect if not authenticated
  if (!loading && (!user || !userRole)) {
    return <Navigate to="/login" replace />;
  }

  const fetchParticipant = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching participant:', error);
      toast({
        title: "Eroare",
        description: "A apărut o eroare la încărcarea participantului",
        variant: "destructive",
      });
    } else if (!data) {
      toast({
        title: "Eroare",
        description: "Participantul nu a fost găsit",
        variant: "destructive",
      });
    } else {
      setParticipant(data);
      setEditedParticipant(data);
      fetchParticipantDrinks(data.id);
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

  const fetchParticipantDrinks = async (participantId: string) => {
    if (!activeParty) return;

    const { data, error } = await supabase
      .from('participant_drinks')
      .select('*')
      .eq('participant_id', participantId)
      .eq('party_id', activeParty.id)
      .maybeSingle();

    if (!error) {
      setParticipantDrinks(data);
    }
  };

  const handleSave = async () => {
    if (!editedParticipant || !participant || !activeParty) return;

    setSaving(true);

    try {
      // For admins, update participant details
      if (userRole === 'administrator') {
        const { error: participantError } = await supabase
          .from('participants')
          .update(editedParticipant)
          .eq('id', participant.id);

        if (participantError) throw participantError;
      }

      // Update drinks for the active party
      if (participantDrinks) {
        const { error: drinksError } = await supabase
          .from('participant_drinks')
          .update({ drink_count: participantDrinks.drink_count })
          .eq('id', participantDrinks.id);

        if (drinksError) throw drinksError;
      } else {
        // Create new drink record for this party
        const { error: insertError } = await supabase
          .from('participant_drinks')
          .insert({
            participant_id: participant.id,
            party_id: activeParty.id,
            drink_count: 0
          });

        if (insertError) throw insertError;
        await fetchParticipantDrinks(participant.id);
      }

      toast({
        title: "Succes",
        description: "Participantul a fost actualizat cu succes",
      });
      
      if (userRole === 'administrator') {
        setParticipant(editedParticipant);
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: "Eroare",
        description: "Actualizarea participantului a eșuat",
        variant: "destructive",
      });
    }

    setSaving(false);
  };

  const updateDrinks = (increment: boolean) => {
    if (!participantDrinks && !activeParty) return;
    
    const currentCount = participantDrinks?.drink_count || 0;
    const newCount = increment 
      ? currentCount + 1 
      : Math.max(0, currentCount - 1);
    
    setParticipantDrinks(prev => prev ? {
      ...prev,
      drink_count: newCount
    } : {
      id: '',
      participant_id: participant?.id || '',
      party_id: activeParty?.id || '',
      drink_count: newCount
    });
  };

  if (loading || !participant || !editedParticipant) {
    return <div className="min-h-screen flex items-center justify-center">Se încarcă...</div>;
  }

  const hasChanges = userRole === 'administrator' 
    ? JSON.stringify(participant) !== JSON.stringify(editedParticipant)
    : false;
  const hasDrinkChanges = participantDrinks?.drink_count !== undefined;
  const isAdmin = userRole === 'administrator';

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Înapoi
          </Button>
          <h1 className="text-3xl font-bold">Detalii Participant</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{participant.nume}</CardTitle>
              {activeParty && (
                <Badge variant="outline">
                  {activeParty.name}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <div>
              <Label htmlFor="nume">Nume</Label>
              <Input
                id="nume"
                value={editedParticipant.nume}
                onChange={(e) => setEditedParticipant({
                  ...editedParticipant,
                  nume: e.target.value
                })}
                disabled={!isAdmin}
              />
            </div>

            {/* Faculty */}
            <div>
              <Label htmlFor="facultate">Facultate</Label>
              <Input
                id="facultate"
                value={editedParticipant.facultate}
                onChange={(e) => setEditedParticipant({
                  ...editedParticipant,
                  facultate: e.target.value
                })}
                disabled={!isAdmin}
              />
            </div>

            {/* Room Number */}
            <div>
              <Label htmlFor="numar_camera">Număr Cameră</Label>
              <Input
                id="numar_camera"
                value={editedParticipant.numar_camera}
                onChange={(e) => setEditedParticipant({
                  ...editedParticipant,
                  numar_camera: e.target.value
                })}
                disabled={!isAdmin}
              />
            </div>

            {/* Group Leader */}
            <div className="flex items-center space-x-2">
              <Switch
                id="major"
                checked={editedParticipant.major}
                onCheckedChange={(checked) => setEditedParticipant({
                  ...editedParticipant,
                  major: checked
                })}
                disabled={!isAdmin}
              />
              <Label htmlFor="major">Major</Label>
            </div>

            {/* Accommodated */}
            <div className="flex items-center space-x-2">
              <Switch
                id="cazat"
                checked={editedParticipant.cazat}
                onCheckedChange={(checked) => setEditedParticipant({
                  ...editedParticipant,
                  cazat: checked
                })}
                disabled={!isAdmin}
              />
              <Label htmlFor="cazat">Cazat</Label>
            </div>

            {/* Drinks Counter */}
            <div>
              <Label>
                Băuturi {activeParty ? activeParty.name : 'Party Activ'}
              </Label>
              <div className="flex items-center gap-4 mt-2">
                <Button
                  variant="outline"
                  onClick={() => updateDrinks(false)}
                  disabled={(participantDrinks?.drink_count || 0) === 0}
                >
                  -
                </Button>
                <span className="text-2xl font-bold w-16 text-center">
                  {participantDrinks?.drink_count || 0}
                </span>
                <Button
                  variant="outline"
                  onClick={() => updateDrinks(true)}
                >
                  +
                </Button>
              </div>
              {!activeParty && (
                <p className="text-sm text-muted-foreground mt-2">
                  Nu există nicio petrecere activă
                </p>
              )}
            </div>

            {/* Save Button */}
            {(hasChanges || hasDrinkChanges) && (
              <div className="pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Se salvează...' : 'Salvează Modificările'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}